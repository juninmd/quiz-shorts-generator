import { describe, expect, it, vi } from 'vitest';
import { createWorkflowRunner } from '../app/workflow-runner.js';

describe('WorkflowRunner', () => {
  const job = {
    id: 'job-1',
    workflowId: 'quiz' as const,
    outputDir: 'output',
    workspacePath: 'temp_assets/jobs/job-1',
    requestedTargets: [],
  };

  it('executa um workflow registrado com contexto de step', async () => {
    const workflow = {
      id: 'quiz' as const,
      run: vi.fn(async (_job, context) => {
        await context.runStep('alpha', async () => 'ok');
        return { jobId: job.id, workflowId: job.workflowId, status: 'generated' as const, publishTargets: [] };
      }),
    };

    const result = await createWorkflowRunner([workflow]).run('quiz', job);

    expect(workflow.run).toHaveBeenCalled();
    expect(result.status).toBe('generated');
  });

  it('falha quando o workflow não está registrado', async () => {
    await expect(createWorkflowRunner([]).run('quiz', job)).rejects.toThrow('Workflow não registrado: quiz');
  });
});