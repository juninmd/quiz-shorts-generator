import type { PublishTarget } from './publish-target.js';
import type { WorkflowId } from '../config/workflows.js';

export interface VideoJob {
  readonly id: string;
  readonly workflowId: WorkflowId;
  readonly outputDir: string;
  readonly workspacePath: string;
  readonly requestedTargets: readonly PublishTarget[];
  readonly inputFilePath?: string;
}