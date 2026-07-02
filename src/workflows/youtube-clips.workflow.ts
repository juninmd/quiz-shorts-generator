import fs from 'node:fs';
import path from 'node:path';
import type { VideoWorkflow, WorkflowExecutionContext } from '../app/workflow-runner.js';
import type { VideoJob } from '../domain/video-job.js';
import type { WorkflowResult } from '../domain/workflow-result.js';
import {
  getChannelVideos,
  downloadAudioOnly,
  downloadVideoSection,
  cleanupVideoDir,
} from '../services/yt-downloader.service.js';
import { transcribeAudio } from '../services/whisper.service.js';
import { analyzeTranscript } from '../services/clip-analyzer.service.js';
import { renderClip } from '../services/clip-renderer.service.js';
import { sendVideoToTelegram, sendMessageToTelegram } from '../telegram.service.js';
import ffmpeg from 'fluent-ffmpeg';

function parseChannels(): string[] {
  const raw = process.env.YOUTUBE_CLIP_CHANNELS ?? '';
  return raw.split(',').map((c) => c.trim()).filter(Boolean);
}

async function getFileStartTime(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return resolve(0);
      const t = parseFloat(String(meta?.format?.start_time ?? '0'));
      resolve(isNaN(t) ? 0 : t);
    });
  });
}

export const youtubeClipsWorkflow: VideoWorkflow = {
  id: 'youtube-clips',
  async run(job: VideoJob, context: WorkflowExecutionContext): Promise<WorkflowResult> {
    console.log(`INFO: workflow=youtube-clips jobId=${job.id} started`);

    const channels = parseChannels();
    if (channels.length === 0) {
      console.warn('WARN: workflow=youtube-clips YOUTUBE_CLIP_CHANNELS not set');
      return {
        jobId: job.id,
        workflowId: job.workflowId,
        status: 'blocked',
        publishTargets: job.requestedTargets,
        auditRecord: {
          jobId: job.id,
          workflowId: 'youtube-clips',
          createdAt: new Date().toISOString(),
          decision: 'blocked',
          reasons: ['YOUTUBE_CLIP_CHANNELS not configured'],
          sourceRefs: [],
          prompts: [],
          publishTargets: [],
          outputs: [],
          publishedUrls: [],
        },
      };
    }

    if (!process.env.WHISPER_BASE_URL) {
      console.warn('WARN: workflow=youtube-clips WHISPER_BASE_URL not set');
      return {
        jobId: job.id,
        workflowId: job.workflowId,
        status: 'blocked',
        publishTargets: job.requestedTargets,
        auditRecord: {
          jobId: job.id,
          workflowId: 'youtube-clips',
          createdAt: new Date().toISOString(),
          decision: 'blocked',
          reasons: ['WHISPER_BASE_URL not configured'],
          sourceRefs: [],
          prompts: [],
          publishTargets: [],
          outputs: [],
          publishedUrls: [],
        },
      };
    }

    const channel = channels[Math.floor(Math.random() * channels.length)]!;
    console.log(`INFO: workflow=youtube-clips channel=${channel}`);

    const videos = await context.runStep('fetch-channel', () => getChannelVideos(channel, 5));
    if (videos.length === 0) {
      console.warn(`WARN: workflow=youtube-clips no videos found for channel=${channel}`);
      return {
        jobId: job.id,
        workflowId: job.workflowId,
        status: 'failed',
        publishTargets: job.requestedTargets,
        auditRecord: {
          jobId: job.id,
          workflowId: 'youtube-clips',
          createdAt: new Date().toISOString(),
          decision: 'blocked',
          reasons: [`No videos found for channel: ${channel}`],
          sourceRefs: [],
          prompts: [],
          publishTargets: [],
          outputs: [],
          publishedUrls: [],
        },
      };
    }

    const video = videos[0]!;
    console.log(`INFO: workflow=youtube-clips selected videoId=${video.id} title="${video.title}"`);

    const downloaded = await context.runStep('download-audio', () =>
      downloadAudioOnly(video, job.workspacePath),
    );

    const transcript = await context.runStep('transcribe', () =>
      transcribeAudio(downloaded.audioPath, video.id, video.duration),
    );

    const maxClips = parseInt(process.env.YOUTUBE_CLIPS_MAX ?? '2', 10);
    const clips = await context.runStep('analyze-clips', () =>
      analyzeTranscript(transcript, video.title, video.channelName, maxClips),
    );

    if (clips.length === 0) {
      console.warn(`WARN: workflow=youtube-clips no clips found for videoId=${video.id}`);
      cleanupVideoDir(video.id, job.workspacePath);
      return {
        jobId: job.id,
        workflowId: job.workflowId,
        status: 'failed',
        publishTargets: job.requestedTargets,
        auditRecord: {
          jobId: job.id,
          workflowId: 'youtube-clips',
          createdAt: new Date().toISOString(),
          decision: 'blocked',
          reasons: ['No suitable clips found'],
          sourceRefs: [],
          prompts: [],
          publishTargets: [],
          outputs: [],
          publishedUrls: [],
        },
      };
    }

    const publishedUrls: string[] = [];
    const outputs: string[] = [];

    for (const clip of clips) {
      try {
        const sectionPath = await context.runStep(`download-section-${clip.title.slice(0, 20)}`, () =>
          downloadVideoSection(video, clip.startTime, clip.endTime, job.workspacePath),
        );

        const sectionStartTime = await getFileStartTime(sectionPath);
        const expectedStart = Math.max(0, clip.startTime - 2);
        const preserved = Math.abs(sectionStartTime - expectedStart) <= 10;
        const seekOffset = preserved ? clip.startTime : Math.max(0, clip.startTime - expectedStart);

        const rendered = await context.runStep(`render-${clip.title.slice(0, 20)}`, () =>
          renderClip(
            sectionPath,
            { ...clip, seekOffset },
            path.join(job.outputDir, 'clips'),
            video.channelName,
            video.title,
          ),
        );

        outputs.push(rendered.outputPath);

        const caption = `🎬 *${rendered.title}*\n📺 ${video.channelName}\n\n🔗 ${video.url}`;
        const sent = await context.runStep(`publish-telegram-${clip.title.slice(0, 20)}`, () =>
          sendVideoToTelegram(rendered.outputPath, caption),
        );

        if (sent) {
          publishedUrls.push(video.url);
        }
      } catch (err: any) {
        console.error(`ERROR: workflow=youtube-clips clip="${clip.title}" error=${err.message}`);
      }
    }

    if (publishedUrls.length > 0) {
      await sendMessageToTelegram(
        `✅ *${publishedUrls.length} corte(s)* gerados de:\n📺 ${video.channelName}\n🎬 ${video.title}\n🔗 ${video.url}`,
      );
    }

    cleanupVideoDir(video.id, job.workspacePath);

    return {
      jobId: job.id,
      workflowId: job.workflowId,
      status: publishedUrls.length > 0 ? 'published' : 'failed',
      publishTargets: job.requestedTargets,
      auditRecord: {
        jobId: job.id,
        workflowId: 'youtube-clips',
        createdAt: new Date().toISOString(),
        decision: publishedUrls.length > 0 ? 'approved' : 'failed',
        reasons: [`Processed ${outputs.length} clips from ${video.channelName}`],
        sourceRefs: [{
          id: video.id,
          provider: 'youtube',
          sourceUrl: video.url,
          owner: video.channelName,
          licenseType: 'third-party' as const,
          contentType: 'video-clip' as const,
          permissionEvidence: `Commentary/clip from ${video.channelName}: ${video.url}`,
          attributionRequired: true,
        }],
        prompts: [],
        publishTargets: Array.from(job.requestedTargets),
        outputs,
        publishedUrls,
      },
    };
  },
};
