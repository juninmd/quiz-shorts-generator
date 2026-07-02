import { describe, expect, it } from 'vitest';
import { podcastClipsWorkflow } from '../workflows/podcast-clips.workflow.js';
import { releaseRadarWorkflow } from '../workflows/release-radar.workflow.js';

describe('Workflow placeholders', () => {
  const job = {
    id: 'job-1',
    workflowId: 'podcast-clips' as const,
    outputDir: 'output',
    workspacePath: 'temp_assets/jobs/job-1',
    requestedTargets: [],
  };

  it('bloqueia podcast-clips até haver fonte autorizada', async () => {
    const result = await podcastClipsWorkflow.run(job, { jobId: 'job-1', workflowId: 'podcast-clips', runStep: async (_name, action) => action() });
    expect(result.status).toBe('blocked');
  });

  it('bloqueia release-radar até haver fonte oficial', async () => {
    const result = await releaseRadarWorkflow.run({ ...job, workflowId: 'release-radar' }, { jobId: 'job-1', workflowId: 'release-radar', runStep: async (_name, action) => action() });
    expect(result.status).toBe('blocked');
  });
});