import fs from 'fs';
import path from 'path';
import type { AuditRecord } from '../domain/audit-record.js';
import type { PublishTarget } from '../domain/publish-target.js';
import type { Quiz } from '../domain/quiz.js';
import type { SourceRef } from '../domain/source-ref.js';
import type { VideoJob } from '../domain/video-job.js';
import type { PolicyDecision } from '../services/policy/rights-policy.service.js';

export const buildAnswerNarration = (quiz: Quiz): string =>
  `A resposta correta é a letra ${quiz.resposta_correta}: ${quiz.opcoes[quiz.resposta_correta]}. ${quiz.fato_curioso}. E aí, você sabia? Se gostou da curiosidade, curta o vídeo e se inscreva no canal para mais vídeos como este!`;

export const buildTelegramCaption = (quiz: Quiz): string =>
  `🏆 <b>NOVO QUIZ: ${quiz.tema.toUpperCase()}!</b>\n\nPerguntamos: ${quiz.pergunta}\n\n#quiz #shorts #gerado_ia`;

export const buildYoutubeRelayCaption = (quiz: Quiz, url: string): string =>
  `📺 <b>O vídeo do quiz "${quiz.tema.toUpperCase()}" também já está no YouTube!</b>\n\nAssista e deixe aquele like: ${url}`;

export const buildOutputFileName = (quiz: Quiz): string => `quiz_${quiz.tema.replace(/\s+/g, '_')}.mp4`;

export const buildQuizSourceRef = (jobId: string): SourceRef => ({
  id: `quiz-${jobId}`,
  provider: 'internal-ai',
  sourceUrl: `internal://quiz/${jobId}`,
  owner: 'quiz-shorts-generator',
  licenseType: 'owned',
  permissionEvidence: 'self-generated',
  contentType: 'quiz',
  attributionRequired: false,
  editorialNotes: 'Quiz gerado internamente pelo workflow quiz.',
});

export const persistQuizAudit = async (
  persistAuditRecord: (outputDir: string, auditRecord: AuditRecord) => Promise<string>,
  job: VideoJob,
  decision: PolicyDecision,
  sourceRefs: readonly SourceRef[],
  outputPath: string,
  publishedUrls: readonly string[],
): Promise<AuditRecord> => {
  const auditRecord: AuditRecord = {
    jobId: job.id,
    workflowId: job.workflowId,
    createdAt: new Date().toISOString(),
    decision: decision.status,
    reasons: decision.reasons,
    sourceRefs,
    prompts: ['quiz-automation'],
    publishTargets: decision.publishTargets,
    outputs: [outputPath],
    publishedUrls,
  };

  await persistAuditRecord(job.outputDir, auditRecord);
  return auditRecord;
};

export const cleanupWorkspace = (workspacePath: string): void => {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
};

export const createBlockedPublishTargets = (publishTargets: readonly PublishTarget[]): readonly PublishTarget[] =>
  publishTargets;