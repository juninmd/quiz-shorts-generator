import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuizWorkflow } from '../workflows/quiz.workflow.js';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    rmSync: vi.fn(),
  },
}));

describe('QuizWorkflow', () => {
  const job = {
    id: 'job-123',
    workflowId: 'quiz' as const,
    outputDir: 'output',
    workspacePath: 'temp_assets/jobs/job-123',
    requestedTargets: [
      { platform: 'telegram' as const, enabled: true, mode: 'auto' as const, label: 'telegram-primary' },
      { platform: 'youtube' as const, enabled: true, mode: 'auto' as const, label: 'youtube-primary' },
    ],
  };

  const quiz = {
    tema: 'teste espaço',
    pergunta: 'Pergunta?',
    opcoes: { A: '1', B: '2', C: '3', D: '4' },
    resposta_correta: 'A' as const,
    fato_curioso: 'Fato',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  const createContext = (steps: string[]) => ({
    jobId: job.id,
    workflowId: job.workflowId,
    runStep: async <T>(stepName: string, action: () => Promise<T>): Promise<T> => {
      steps.push(stepName);
      return action();
    },
  });

  const createDependencies = (options?: { enableYouTube?: boolean; youtubeUrl?: string | null; telegramOk?: boolean }) => {
    const enableYouTube = options?.enableYouTube ?? false;
    const telegramOk = options?.telegramOk ?? true;

    return {
      enableYouTube,
      youtubePrivacyStatus: 'public' as const,
      generateQuiz: vi.fn().mockResolvedValue(quiz),
      generateNarration: vi.fn()
        .mockResolvedValueOnce({ audioPath: 'question.mp3', wordTimestamps: [] })
        .mockResolvedValueOnce({ audioPath: 'answer.mp3', wordTimestamps: [] }),
      assembleVideo: vi.fn().mockResolvedValue('video.mp4'),
      sendVideoToTelegram: vi.fn().mockResolvedValue(telegramOk),
      sendMessageToTelegram: vi.fn().mockResolvedValue(true),
      generateYoutubeMetadata: vi.fn().mockResolvedValue({ title: 'YT Title', description: 'YT Desc' }),
      uploadToYouTube: vi.fn().mockResolvedValue(options?.youtubeUrl ?? null),
      evaluateRightsPolicy: vi.fn().mockReturnValue({ status: 'approved', reasons: ['ok'], publishTargets: job.requestedTargets }),
      persistAuditRecord: vi.fn().mockResolvedValue(path.join(job.outputDir, 'audit-ledger.jsonl')),
    };
  };

  it('preserva o fluxo do quiz sem youtube e usa workspace por job', async () => {
    const steps: string[] = [];
    const deps = createDependencies();
    const workflow = createQuizWorkflow(deps);

    const result = await workflow.run(job, createContext(steps));

    expect(steps).toEqual(['generate-content', 'generate-tts', 'render', 'publish-telegram', 'audit']);
    expect(deps.generateNarration).toHaveBeenNthCalledWith(1, 'Pergunta?', 'question', job.workspacePath);
    expect(deps.generateNarration).toHaveBeenNthCalledWith(
      2,
      'A resposta correta é a letra A: 1. Fato. E aí, você sabia? Se gostou da curiosidade, curta o vídeo e se inscreva no canal para mais vídeos como este!',
      'answer',
      job.workspacePath,
    );
    expect(deps.assembleVideo).toHaveBeenCalledWith(
      quiz,
      expect.objectContaining({ qPath: 'question.mp3', aPath: 'answer.mp3' }),
      path.join(job.outputDir, 'quiz_teste_espaço.mp4'),
      job.workspacePath,
    );
    expect(deps.generateYoutubeMetadata).not.toHaveBeenCalled();
    expect(result.status).toBe('generated');
    expect(vi.mocked(fs.rmSync)).toHaveBeenCalledWith(job.workspacePath, { recursive: true, force: true });
  });

  it('publica no youtube e repassa a url para o telegram quando houver upload', async () => {
    const deps = createDependencies({ enableYouTube: true, youtubeUrl: 'https://youtube.com/shorts/123' });
    const workflow = createQuizWorkflow(deps);

    const result = await workflow.run(job, createContext([]));

    expect(deps.generateYoutubeMetadata).toHaveBeenCalledWith(quiz);
    expect(deps.uploadToYouTube).toHaveBeenCalledWith(
      path.join(job.outputDir, 'quiz_teste_espaço.mp4'),
      'YT Title',
      'YT Desc',
      { privacyStatus: 'public' },
    );
    expect(deps.sendMessageToTelegram).toHaveBeenCalledWith(
      '📺 <b>O vídeo do quiz "TESTE ESPAÇO" também já está no YouTube!</b>\n\nAssista e deixe aquele like: https://youtube.com/shorts/123',
    );
    expect(result.status).toBe('published');
    expect(result.generatedVideo?.title).toBe('YT Title');
  });

  it('não limpa workspace nem segue para youtube quando o telegram falha', async () => {
    const deps = createDependencies({ enableYouTube: true, telegramOk: false });
    const workflow = createQuizWorkflow(deps);

    const result = await workflow.run(job, createContext([]));

    expect(result.status).toBe('failed');
    expect(deps.generateYoutubeMetadata).not.toHaveBeenCalled();
    expect(vi.mocked(fs.rmSync)).not.toHaveBeenCalled();
  });
});