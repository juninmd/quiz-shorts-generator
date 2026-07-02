import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import type { ClipCandidate } from './clip-analyzer.service.js';

const execFileAsync = promisify(execFile);

export interface RenderedClip {
  id: string;
  outputPath: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  channelName: string;
  originalTitle: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;

function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function buildFilter(subtitlePath: string): string {
  const assPath = escapeFilterPath(subtitlePath);
  return `[0:v]scale=w='if(gt(iw/ih,${WIDTH}/${HEIGHT}),-1,${WIDTH})':h='if(gt(iw/ih,${WIDTH}/${HEIGHT}),${HEIGHT},-1)':flags=lanczos,crop=${WIDTH}:${HEIGHT},setsar=1,ass='${assPath}'[v]`;
}

function buildAssSubtitles(title: string, channelName: string, width: number, height: number): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,40,1
Style: Channel,Arial,36,&H00AAAAAA,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,20,20,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const titleText = title.replace(/[{}\\]/g, ' ').substring(0, 60);
  const channelText = `@${channelName}`.replace(/[{}\\]/g, ' ').substring(0, 40);

  const events = [
    `Dialogue: 0,0:00:00.00,9:59:00.00,Channel,,0,0,0,,${channelText}`,
    `Dialogue: 0,0:00:00.00,0:00:03.00,Title,,0,0,0,,${titleText}`,
  ];

  return `${header}\n${events.join('\n')}\n`;
}

export async function renderClip(
  sectionPath: string,
  clip: ClipCandidate & { seekOffset: number },
  outputDir: string,
  channelName: string,
  originalTitle: string,
): Promise<RenderedClip> {
  const clipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  fs.mkdirSync(outputDir, { recursive: true });

  const subtitlePath = path.join(outputDir, `${clipId}.ass`);
  const outputPath = path.join(outputDir, `${clipId}.mp4`);

  const assContent = buildAssSubtitles(clip.title, channelName, WIDTH, HEIGHT);
  fs.writeFileSync(subtitlePath, assContent, 'utf-8');

  const filter = buildFilter(subtitlePath);
  const duration = clip.endTime - clip.startTime;

  const args = [
    '-ss', String(clip.seekOffset),
    '-i', sectionPath,
    '-y',
    '-filter_complex', filter,
    '-map', '[v]',
    '-map', '0:a?',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-profile:v', 'high',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    outputPath,
  ];

  const { stderr } = await execFileAsync('ffmpeg', args, {
    maxBuffer: 100 * 1024 * 1024,
    timeout: 300_000,
  }) as unknown as { stderr: string };

  if (!fs.existsSync(outputPath)) {
    throw new Error(`FFmpeg finished but output missing: ${outputPath}. stderr: ${stderr}`);
  }

  try {
    fs.unlinkSync(subtitlePath);
  } catch { /* ignore */ }

  return {
    id: clipId,
    outputPath,
    title: clip.title,
    startTime: clip.startTime,
    endTime: clip.endTime,
    duration,
    channelName,
    originalTitle,
  };
}
