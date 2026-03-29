import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';


// Import services and mock them
import { generateQuiz } from '../content.service.js';
import { generateNarration } from '../tts.service.js';
import { assembleVideo } from '../video.service.js';
import { sendVideoToTelegram, sendMessageToTelegram } from '../telegram.service.js';
import { generateYoutubeMetadata, uploadToYouTube } from '../youtube.service.js';

vi.mock('../content.service.js');
vi.mock('../tts.service.js');
vi.mock('../video.service.js');
vi.mock('../telegram.service.js');
vi.mock('../youtube.service.js');
vi.mock('fs');

// We have to mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

describe('Index (Main Execution Loop)', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const setupMocks = (youtubeEnabled: string, telegramSuccess: boolean, ytUploadSuccess: boolean) => {
    process.env.ENABLE_YOUTUBE = youtubeEnabled;

    vi.mocked(generateQuiz).mockResolvedValue({
      tema: 'teste espaço',
      pergunta: 'P',
      opcoes: { A: '1', B: '2', C: '3', D: '4' },
      resposta_correta: 'A',
      fato_curioso: 'Fato'
    });

    vi.mocked(generateNarration).mockResolvedValue({ audioPath: 'path.mp3', wordTimestamps: [] });
    vi.mocked(assembleVideo).mockResolvedValue('out.mp4');

    vi.mocked(sendVideoToTelegram).mockResolvedValue(telegramSuccess);
    vi.mocked(sendMessageToTelegram).mockResolvedValue(true);

    vi.mocked(generateYoutubeMetadata).mockResolvedValue({ title: 'T', description: 'D' });
    vi.mocked(uploadToYouTube).mockResolvedValue(ytUploadSuccess ? 'https://youtube' : null);

    vi.mocked(fs.existsSync).mockReturnValue(false);
  };

  it('deve executar o fluxo completo sem youtube e sucesso no telegram', async () => {
    setupMocks('false', true, false);
    vi.mocked(fs.existsSync).mockImplementation((p) => String(p) === 'temp_assets');

    vi.resetModules(); // we reset inside the test right before importing
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));

    expect(generateQuiz).toHaveBeenCalled();
    expect(generateNarration).toHaveBeenCalledTimes(2);
    expect(assembleVideo).toHaveBeenCalled();
    expect(sendVideoToTelegram).toHaveBeenCalled();
    expect(generateYoutubeMetadata).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(fs.rmSync).toHaveBeenCalledWith('temp_assets', { recursive: true, force: true });
  });

  it('deve executar fluxo com youtube e sucesso na url gerada', async () => {
    setupMocks('true', true, true);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));

    expect(generateYoutubeMetadata).toHaveBeenCalled();
    expect(uploadToYouTube).toHaveBeenCalled();
    expect(sendMessageToTelegram).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('deve executar fluxo com youtube, porem falha no upload de video no yt (url null)', async () => {
    setupMocks('true', true, false);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));

    expect(uploadToYouTube).toHaveBeenCalled();
    expect(sendMessageToTelegram).not.toHaveBeenCalled(); // Nao repassa link
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('deve executar fluxo, porem falhar no envio do telegram, setando status de exit pra 1', async () => {
    setupMocks('false', false, false);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(fs.rmSync).not.toHaveBeenCalled(); // Nao limpa se o telegram falhou
  });

  it('deve capturar erro fatal repassado pro catch principal e executar exit 1', async () => {
    setupMocks('false', true, false);
    vi.mocked(generateQuiz).mockRejectedValueOnce(new Error('Fatal Error'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(errSpy).toHaveBeenCalledWith('❌ Erro no processo principal:', expect.any(Error));

    errSpy.mockRestore();
  });
});
