import type { WorkflowId } from '../config/workflows.js';
import type { AuditRecord } from './audit-record.js';
import type { GeneratedVideo } from './generated-video.js';
import type { PublishTarget } from './publish-target.js';

export type WorkflowStatus = 'generated' | 'draft' | 'approved' | 'blocked' | 'published' | 'failed';

export interface WorkflowResult {
  readonly jobId: string;
  readonly workflowId: WorkflowId;
  readonly status: WorkflowStatus;
  readonly generatedVideo?: GeneratedVideo;
  readonly publishTargets: readonly PublishTarget[];
  readonly auditRecord?: AuditRecord;
}