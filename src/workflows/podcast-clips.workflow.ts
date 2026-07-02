import type { VideoWorkflow } from '../app/workflow-runner.js';
import type { AuditRecord } from '../domain/audit-record.js';
import type { WorkflowResult } from '../domain/workflow-result.js';

const buildAuditRecord = (jobId: string): AuditRecord => ({
  jobId,
  workflowId: 'podcast-clips',
  createdAt: new Date().toISOString(),
  decision: 'blocked',
  reasons: ['workflow-scaffold-awaiting-authorized-source-input'],
  sourceRefs: [],
  prompts: [],
  publishTargets: [],
  outputs: [],
  publishedUrls: [],
});

export const podcastClipsWorkflow: VideoWorkflow = {
  id: 'podcast-clips',
  async run(job): Promise<WorkflowResult> {
    console.warn(`WARN: workflow=podcast-clips jobId=${job.id} blocked awaiting authorized input source`);
    return {
      jobId: job.id,
      workflowId: job.workflowId,
      status: 'blocked',
      publishTargets: job.requestedTargets,
      auditRecord: buildAuditRecord(job.id),
    };
  },
};