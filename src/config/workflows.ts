export const workflowIds = ['quiz', 'youtube-clips', 'podcast-clips', 'release-radar'] as const;

export type WorkflowId = (typeof workflowIds)[number];

export const DEFAULT_WORKFLOW_ID: WorkflowId = 'quiz';

export const isWorkflowId = (value: string): value is WorkflowId =>
  workflowIds.includes(value as WorkflowId);