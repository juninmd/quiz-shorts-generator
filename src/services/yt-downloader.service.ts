import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface VideoInfo {
  id: string;
  title: string;
  url: string;
  channelName: string;
  duration: number;
  publishedAt: string;
  liveStatus?: string;
}

export interface DownloadedAudio {
  videoInfo: VideoInfo;
  audioPath: string;
}

function getBaseArgs(): string[] {
  const args: string[] = [
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=tv,android,web',
  ];
  const cookiesBase64 = process.env.YOUTUBE_COOKIES_BASE64;
  if (cookiesBase64) {
    // Caller must handle temp cookie file via withCookies
    const file = process.env.YOUTUBE_COOKIES_FILE;
    if (file) args.push('--cookies', file);
  } else {
    const file = process.env.YOUTUBE_COOKIES_FILE;
    if (file) args.push('--cookies', file);
  }
  return args;
}

async function execYtDlp(args: string[], opts: { timeout?: number; maxBuffer?: number } = {}): Promise<string> {
  const { stdout } = await execFileAsync('yt-dlp', args, {
    timeout: opts.timeout ?? 120_000,
    maxBuffer: opts.maxBuffer ?? 10 * 1024 * 1024,
    encoding: 'utf8',
  }) as unknown as { stdout: string; stderr: string };
  return stdout;
}

export async function getChannelVideos(channel: string, limit = 5): Promise<VideoInfo[]> {
  const url = channel.startsWith('http') ? channel : `https://www.youtube.com/${channel}/videos`;
  const stdout = await execYtDlp([
    ...getBaseArgs(),
    '--flat-playlist',
    '--print', '{"id":%(id)j,"title":%(title)j,"url":%(webpage_url)j,"channel":%(channel)j,"duration":%(duration)s,"upload_date":%(upload_date)j,"live_status":%(live_status)j}',
    '--no-warnings', '--ignore-errors',
    '--playlist-end', String(limit * 5),
    url,
  ], { timeout: 120_000 });

  const videos: VideoInfo[] = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line.trim()) continue;
    try {
      const sanitized = line.replace(/:NA([,}])/g, ':null$1');
      const raw = JSON.parse(sanitized);
      if (!raw.id || raw.live_status === 'is_upcoming') continue;
      const duration = typeof raw.duration === 'number' ? raw.duration : 0;
      if (duration <= 60 || duration > 10800) continue; // skip shorts and 3h+
      videos.push({
        id: raw.id,
        title: raw.title ?? 'Untitled',
        url: raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`,
        channelName: raw.channel ?? channel,
        duration,
        publishedAt: raw.upload_date ?? '',
        liveStatus: raw.live_status,
      });
    } catch { /* skip malformed */ }
    if (videos.length >= limit) break;
  }
  return videos;
}

export async function downloadAudioOnly(video: VideoInfo, tempDir: string): Promise<DownloadedAudio> {
  const videoDir = path.join(tempDir, video.id);
  fs.mkdirSync(videoDir, { recursive: true });
  const audioPath = path.join(videoDir, `${video.id}.wav`);

  await execYtDlp([
    ...getBaseArgs(),
    '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
    '--extract-audio', '--audio-format', 'wav',
    '--postprocessor-args', 'ffmpeg:-ar 16000 -ac 1',
    '--no-playlist', '--no-warnings',
    '-o', audioPath,
    '--', video.url,
  ], { timeout: 300_000 });

  return { videoInfo: video, audioPath };
}

export async function downloadVideoSection(
  video: VideoInfo,
  startTime: number,
  endTime: number,
  tempDir: string,
): Promise<string> {
  const videoDir = path.join(tempDir, video.id);
  fs.mkdirSync(videoDir, { recursive: true });

  const start = Math.max(0, startTime - 2);
  const end = Math.min(video.duration, endTime + 2);
  const sectionId = crypto.createHash('md5').update(`${start}-${end}`).digest('hex').slice(0, 6);
  const outputPath = path.join(videoDir, `${video.id}_${sectionId}.mp4`);

  await execYtDlp([
    ...getBaseArgs(),
    '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
    '--no-playlist', '--no-warnings',
    '--download-sections', `*${start}-${end}`,
    '--merge-output-format', 'mp4',
    '-o', outputPath,
    '--', video.url,
  ], { timeout: 300_000 });

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Section download succeeded but file not found: ${outputPath}`);
  }
  return outputPath;
}

export function cleanupVideoDir(videoId: string, tempDir: string): void {
  try {
    fs.rmSync(path.join(tempDir, videoId), { recursive: true, force: true });
  } catch { /* ignore */ }
}
