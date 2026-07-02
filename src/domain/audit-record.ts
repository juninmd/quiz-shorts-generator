import type { PublishTarget } from './publish-target.js';
import type { SourceRef } from './source-ref.js';

export type AuditDecision = 'approved' | 'requires-approval' | 'blocked';

export interface AuditRecord {
  readonly jobId: string;
  readonly workflowId: string;
  readonly createdAt: string;
  readonly decision: AuditDecision;
  readonly reasons: readonly string[];
  readonly sourceRefs: readonly SourceRef[];
  readonly prompts: readonly string[];
  readonly publishTargets: readonly PublishTarget[];
  readonly outputs: readonly string[];
  readonly publishedUrls: readonly string[];
}