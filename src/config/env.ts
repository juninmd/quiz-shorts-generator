import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { z } from 'zod';
import { DEFAULT_WORKFLOW_ID, isWorkflowId, type WorkflowId } from './workflows.js';

const envSchema = z.object({
  ENABLE_YOUTUBE: z.enum(['true', 'false']).optional().default('false'),
  OUTPUT_DIR: z.string().min(1).optional().default('output'),
  WORKSPACE_ROOT: z.string().min(1).optional().default('temp_assets/jobs'),
  WORKFLOW_ID: z.string().optional().default(DEFAULT_WORKFLOW_ID),
  WORKFLOW_INPUT_FILE: z.string().optional(),
  YOUTUBE_PRIVACY_STATUS: z.enum(['public', 'private', 'unlisted']).optional().default('public'),
});

export interface AppEnv {
  readonly enableYouTube: boolean;
  readonly outputDir: string;
  readonly workspaceRoot: string;
  readonly workflowId: WorkflowId;
  readonly workflowInputFile?: string;
  readonly youtubePrivacyStatus: 'public' | 'private' | 'unlisted';
}

export const loadEnv = (): AppEnv => {
  dotenvExpand.expand(dotenv.config());
  const parsed = envSchema.parse(process.env);
  const workflowId = isWorkflowId(parsed.WORKFLOW_ID)
    ? parsed.WORKFLOW_ID
    : DEFAULT_WORKFLOW_ID;
  const workflowInputFile = parsed.WORKFLOW_INPUT_FILE;

  return {
    enableYouTube: parsed.ENABLE_YOUTUBE === 'true',
    outputDir: parsed.OUTPUT_DIR,
    workspaceRoot: parsed.WORKSPACE_ROOT,
    workflowId,
    ...(workflowInputFile ? { workflowInputFile } : {}),
    youtubePrivacyStatus: parsed.YOUTUBE_PRIVACY_STATUS,
  };
};