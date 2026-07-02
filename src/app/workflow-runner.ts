import type { WorkflowId } from '../config/workflows.js';
import type { VideoJob } from '../domain/video-job.js';
import type { WorkflowResult } from '../domain/workflow-result.js';

export interface WorkflowExecutionContext {
  readonly jobId: string;
  readonly workflowId: WorkflowId;
  runStep<T>(stepName: string, action: () => Promise<T>): Promise<T>;
}

export interface VideoWorkflow {
  readonly id: WorkflowId;
  run(job: VideoJob, context: WorkflowExecutionContext): Promise<WorkflowResult>;
}

export interface WorkflowRunner {
  run(workflowId: WorkflowId, job: VideoJob): Promise<WorkflowResult>;
}

const createExecutionContext = (job: VideoJob): WorkflowExecutionContext => ({
  jobId: job.id,
  workflowId: job.workflowId,
  async runStep<T>(stepName: string, action: () => Promise<T>): Promise<T> {
    console.log(`INFO: step=${stepName} workflow=${job.workflowId} jobId=${job.id} started`);
    const startedAt = Date.now();

    try {
      const result = await action();
      const durationMs = Date.now() - startedAt;
      console.log(`INFO: step=${stepName} workflow=${job.workflowId} jobId=${job.id} durationMs=${durationMs}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      console.error(`ERROR: step=${stepName} workflow=${job.workflowId} jobId=${job.id} durationMs=${durationMs}`, error);
      throw error;
    }
  },
});

export const createWorkflowRunner = (
  workflows: readonly VideoWorkflow[],
): WorkflowRunner => {
  const workflowRegistry = new Map(workflows.map((workflow) => [workflow.id, workflow]));

  return {
    async run(workflowId: WorkflowId, job: VideoJob): Promise<WorkflowResult> {
      const workflow = workflowRegistry.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow não registrado: ${workflowId}`);
      }

      console.log(`INFO: starting workflow=${workflowId} jobId=${job.id}`);
      return workflow.run(job, createExecutionContext(job));
    },
  };
};