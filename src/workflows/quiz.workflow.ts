import path from 'path';
import type { VideoWorkflow, WorkflowExecutionContext } from '../app/workflow-runner.js';
import type { AuditRecord } from '../domain/audit-record.js';
import type { GeneratedVideo } from '../domain/generated-video.js';
import type { PublishTarget } from '../domain/publish-target.js';
import type { Quiz } from '../domain/quiz.js';
import type { SourceRef } from '../domain/source-ref.js';
import type { VideoJob } from '../domain/video-job.js';
import type { WorkflowResult } from '../domain/workflow-result.js';
import type { PolicyDecision } from '../services/policy/rights-policy.service.js';
import type { WordTimestamp } from '../tts.service.js';
import {
  buildAnswerNarration,
  buildOutputFileName,
  buildQuizSourceRef,
  buildTelegramCaption,
  buildYoutubeRelayCaption,
  cleanupWorkspace,
  persistQuizAudit,
} from './quiz.workflow.support.js';

export interface NarrationResult {
  readonly audioPath: string;
  readonly wordTimestamps: readonly WordTimestamp[];
}

export interface QuizWorkflowDependencies {
  readonly enableYouTube: boolean;
  readonly youtubePrivacyStatus: 'public' | 'private' | 'unlisted';
  readonly generateQuiz: () => Promise<Quiz>;
  readonly generateNarration: (
    text: string,
    fileName: string,
    outputDir?: string,
  ) => Promise<NarrationResult>;
  readonly assembleVideo: (
    quiz: Quiz,
    audioData: { qPath: string; aPath: string; qWords: WordTimestamp[]; aWords: WordTimestamp[] },
    outputPath?: string,
    tempDir?: string,
  ) => Promise<string>;
  readonly sendVideoToTelegram: (videoPath: string, caption: string) => Promise<boolean>;
  readonly sendMessageToTelegram: (message: string) => Promise<boolean>;
  readonly generateYoutubeMetadata: (quiz: Quiz) => Promise<{ title: string; description: string }>;
  readonly uploadToYouTube: (
    videoPath: string,
    title: string,
    description: string,
    options?: { privacyStatus?: 'public' | 'private' | 'unlisted' },
  ) => Promise<string | null>;
  readonly evaluateRightsPolicy: (
    sourceRefs: readonly SourceRef[],
    publishTargets: readonly PublishTarget[],
  ) => PolicyDecision;
  readonly persistAuditRecord: (outputDir: string, auditRecord: AuditRecord) => Promise<string>;
}

export const createQuizWorkflow = (
  dependencies: QuizWorkflowDependencies,
): VideoWorkflow => ({
  id: 'quiz',
  async run(job: VideoJob, context: WorkflowExecutionContext): Promise<WorkflowResult> {
    console.log(`INFO: workflow=quiz jobId=${job.id} started`);
    const quiz = await context.runStep('generate-content', dependencies.generateQuiz);
    console.log(`INFO: workflow=quiz jobId=${job.id} quizTheme=${quiz.tema} generated`);
    const sourceRefs = [buildQuizSourceRef(job.id)];
    const decision = dependencies.evaluateRightsPolicy(sourceRefs, job.requestedTargets);
    const outputPath = path.join(job.outputDir, buildOutputFileName(quiz));

    if (decision.status === 'blocked') {
      const auditRecord = await context.runStep('audit', async () =>
        persistQuizAudit(dependencies.persistAuditRecord, job, decision, sourceRefs, outputPath, []),
      );
      return { jobId: job.id, workflowId: job.workflowId, status: 'blocked', publishTargets: decision.publishTargets, auditRecord };
    }

    const [questionNarration, answerNarration] = await context.runStep('generate-tts', async () =>
      Promise.all([
        dependencies.generateNarration(quiz.pergunta, 'question', job.workspacePath),
        dependencies.generateNarration(buildAnswerNarration(quiz), 'answer', job.workspacePath),
      ]),
    );

    await context.runStep('render', async () =>
      dependencies.assembleVideo(
        quiz,
        {
          qPath: questionNarration.audioPath,
          aPath: answerNarration.audioPath,
          qWords: Array.from(questionNarration.wordTimestamps),
          aWords: Array.from(answerNarration.wordTimestamps),
        },
        outputPath,
        job.workspacePath,
      ),
    );

    let generatedVideo: GeneratedVideo = {
      filePath: outputPath,
      title: `Quiz: ${quiz.tema}!`,
      description: 'Teste seus conhecimentos! #quiz #shorts #curiosidades',
      tags: ['quiz', 'shorts', 'curiosidades'],
      sourceRefs,
    };

    const telegramSent = await context.runStep('publish-telegram', async () =>
      dependencies.sendVideoToTelegram(outputPath, buildTelegramCaption(quiz)),
    );

    if (!telegramSent) {
      console.warn(`WARN: workflow=quiz jobId=${job.id} telegram-send-failed`);
      const auditRecord = await context.runStep('audit', async () =>
        persistQuizAudit(dependencies.persistAuditRecord, job, decision, sourceRefs, outputPath, []),
      );
      return { jobId: job.id, workflowId: job.workflowId, status: 'failed', generatedVideo, publishTargets: decision.publishTargets, auditRecord };
    }

    const publishedUrls: string[] = [];
    if (dependencies.enableYouTube) {
      const metadata = await context.runStep('generate-youtube-metadata', async () =>
        dependencies.generateYoutubeMetadata(quiz),
      );
      generatedVideo = { ...generatedVideo, title: metadata.title, description: metadata.description };

      const youtubeUrl = await context.runStep('publish-youtube', async () =>
        dependencies.uploadToYouTube(outputPath, metadata.title, metadata.description, {
          privacyStatus: dependencies.youtubePrivacyStatus,
        }),
      );

      if (youtubeUrl) {
        publishedUrls.push(youtubeUrl);
        await context.runStep('publish-youtube-relay', async () =>
          dependencies.sendMessageToTelegram(buildYoutubeRelayCaption(quiz, youtubeUrl)),
        );
      }
    } else {
      console.log(`INFO: workflow=quiz jobId=${job.id} youtube-disabled`);
    }

    cleanupWorkspace(job.workspacePath);
    const auditRecord = await context.runStep('audit', async () =>
      persistQuizAudit(dependencies.persistAuditRecord, job, decision, sourceRefs, outputPath, publishedUrls),
    );

    return {
      jobId: job.id,
      workflowId: job.workflowId,
      status: publishedUrls.length > 0 ? 'published' : 'generated',
      generatedVideo,
      publishTargets: decision.publishTargets,
      auditRecord,
    };
  },
});