import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createWorkflowRunner, type WorkflowRunner } from './workflow-runner.js';
import { loadEnv, type AppEnv } from '../config/env.js';
import type { PublishTarget } from '../domain/publish-target.js';
import type { VideoJob } from '../domain/video-job.js';
import type { WorkflowResult } from '../domain/workflow-result.js';
import { generateQuiz } from '../content.service.js';
import { sendMessageToTelegram, sendVideoToTelegram } from '../telegram.service.js';
import { generateNarration } from '../tts.service.js';
import { assembleVideo } from '../video.service.js';
import { generateYoutubeMetadata, uploadToYouTube } from '../youtube.service.js';
import { evaluateRightsPolicy } from '../services/policy/rights-policy.service.js';
import { persistAuditRecord } from '../services/sources/source-registry.js';
import { createQuizWorkflow } from '../workflows/quiz.workflow.js';
import { youtubeClipsWorkflow } from '../workflows/youtube-clips.workflow.js';
import { podcastClipsWorkflow } from '../workflows/podcast-clips.workflow.js';
import { releaseRadarWorkflow } from '../workflows/release-radar.workflow.js';

export interface RunAppOptions {
  readonly env?: AppEnv;
  readonly jobId?: string;
  readonly runner?: WorkflowRunner;
}

const ensureDir = (dirPath: string): void => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const createPublishTargets = (env: AppEnv): readonly PublishTarget[] => [
  { platform: 'telegram', enabled: true, mode: 'auto', label: 'telegram-primary' },
  { platform: 'youtube', enabled: env.enableYouTube, mode: env.enableYouTube ? 'auto' : 'disabled', label: 'youtube-primary' },
];

const createRunner = (env: AppEnv): WorkflowRunner =>
  createWorkflowRunner([
    createQuizWorkflow({
      enableYouTube: env.enableYouTube,
      youtubePrivacyStatus: env.youtubePrivacyStatus,
      generateQuiz,
      generateNarration,
      assembleVideo,
      sendVideoToTelegram,
      sendMessageToTelegram,
      generateYoutubeMetadata,
      uploadToYouTube,
      evaluateRightsPolicy,
      persistAuditRecord,
    }),
    youtubeClipsWorkflow,
    podcastClipsWorkflow,
    releaseRadarWorkflow,
  ]);

const createVideoJob = (env: AppEnv, jobId: string): VideoJob => {
  const workspacePath = path.join(env.workspaceRoot, jobId);
  ensureDir(env.outputDir);
  ensureDir(workspacePath);

  return {
    id: jobId,
    workflowId: env.workflowId,
    outputDir: env.outputDir,
    workspacePath,
    requestedTargets: createPublishTargets(env),
    ...(env.workflowInputFile ? { inputFilePath: env.workflowInputFile } : {}),
  };
};

export const runApp = async (options: RunAppOptions = {}): Promise<WorkflowResult> => {
  const env = options.env ?? loadEnv();
  const jobId = options.jobId ?? randomUUID();
  const runner = options.runner ?? createRunner(env);
  const job = createVideoJob(env, jobId);

  console.log(`INFO: starting workflow=${env.workflowId} jobId=${jobId}`);
  return runner.run(env.workflowId, job);
};