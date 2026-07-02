import type { VideoWorkflow } from '../app/workflow-runner.js';
import type { AuditRecord } from '../domain/audit-record.js';
import type { WorkflowResult } from '../domain/workflow-result.js';

const buildAuditRecord = (jobId: string): AuditRecord => ({
  jobId,
  workflowId: 'release-radar',
  createdAt: new Date().toISOString(),
  decision: 'blocked',
  reasons: ['workflow-scaffold-awaiting-official-release-source-input'],
  sourceRefs: [],
  prompts: [],
  publishTargets: [],
  outputs: [],
  publishedUrls: [],
});

export const releaseRadarWorkflow: VideoWorkflow = {
  id: 'release-radar',
  async run(job): Promise<WorkflowResult> {
    console.warn(`WARN: workflow=release-radar jobId=${job.id} blocked awaiting official release source`);
    return {
      jobId: job.id,
      workflowId: job.workflowId,
      status: 'blocked',
      publishTargets: job.requestedTargets,
      auditRecord: buildAuditRecord(job.id),
    };
  },
};