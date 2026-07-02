<<<<<<< Updated upstream
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
=======
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../index.js';
import { runApp } from '../app/main.js';

vi.mock('../app/main.js', () => ({
  runApp: vi.fn(),
}));
>>>>>>> Stashed changes

describe('Index CLI wrapper', () => {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

<<<<<<< Updated upstream
vi.mock('../content.service.js');
vi.mock('../tts.service.js');
vi.mock('../video.service.js');
vi.mock('../telegram.service.js');
vi.mock('../youtube.service.js');
vi.mock('node:fs');
vi.mock('node:fs/promises');

// We have to mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

describe('Index (Main Execution Loop)', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
=======
  beforeEach(() => {
>>>>>>> Stashed changes
    vi.clearAllMocks();
  });

  it('encerra com sucesso quando o workflow retorna resultado gerado', async () => {
    vi.mocked(runApp).mockResolvedValue({
      jobId: 'job-1',
      workflowId: 'quiz',
      status: 'generated',
      publishTargets: [],
    });

    await runCli();

<<<<<<< Updated upstream
    vi.mocked(sendVideoToTelegram).mockResolvedValue(telegramSuccess);
    vi.mocked(sendMessageToTelegram).mockResolvedValue(true);

    vi.mocked(generateYoutubeMetadata).mockResolvedValue({ title: 'T', description: 'D' });
    vi.mocked(uploadToYouTube).mockResolvedValue(ytUploadSuccess ? 'https://youtube' : null);

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsPromises.rm).mockResolvedValue(undefined);
  };

  const executeFlux = async () => {
    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100));
  };

  it('deve executar o fluxo completo sem youtube e sucesso no telegram', async () => {
    setupMocks('false', true, false);
    vi.mocked(fs.existsSync).mockImplementation((p: any) => String(p).includes('temp_assets'));

    await executeFlux();

    expect(generateQuiz).toHaveBeenCalled();
    expect(generateNarration).toHaveBeenCalledTimes(2);
    expect(assembleVideo).toHaveBeenCalled();
    expect(sendVideoToTelegram).toHaveBeenCalled();
    expect(generateYoutubeMetadata).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(fsPromises.rm).toHaveBeenCalledWith('temp_assets', { recursive: true, force: true });
  });

  it('deve executar fluxo com youtube e sucesso na url gerada', async () => {
    setupMocks('true', true, true);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await executeFlux();

    expect(generateYoutubeMetadata).toHaveBeenCalled();
    expect(uploadToYouTube).toHaveBeenCalled();
    expect(sendMessageToTelegram).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('deve executar fluxo com youtube, porem falha no upload de video no yt (url null)', async () => {
    setupMocks('true', true, false);
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await executeFlux();

    expect(uploadToYouTube).toHaveBeenCalled();
    expect(sendMessageToTelegram).not.toHaveBeenCalled(); // Nao repassa link
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('deve executar fluxo, porem falhar no envio do telegram, setando status de exit pra 1', async () => {
    setupMocks('false', false, false);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await executeFlux();

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(fsPromises.rm).not.toHaveBeenCalled(); // Nao limpa se o telegram falhou
  });

  it('deve capturar erro fatal repassado pro catch principal e executar exit 1', async () => {
    setupMocks('false', true, false);
    vi.mocked(generateQuiz).mockRejectedValueOnce(new Error('Fatal Error'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await executeFlux();

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(errSpy).toHaveBeenCalledWith('❌ Erro no processo principal:', expect.any(Error));

    errSpy.mockRestore();
  });

  it('deve executar o catch do main().catch(...) e logar erro fatal', async () => {
    setupMocks('false', true, false);

    // Forçar que o catch interno dispare uma exceção para cair no catch externo
    mockExit.mockImplementationOnce(() => {
      throw new Error('Forced Exit Exception');
=======
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('encerra com erro quando o workflow retorna blocked', async () => {
    vi.mocked(runApp).mockResolvedValue({
      jobId: 'job-1',
      workflowId: 'quiz',
      status: 'blocked',
      publishTargets: [],
>>>>>>> Stashed changes
    });

    await runCli();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('loga erro fatal e encerra com 1 quando o runner falha', async () => {
    vi.mocked(runApp).mockRejectedValueOnce(new Error('fatal'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runCli();

    expect(errorSpy).toHaveBeenCalledWith('💥 CRASH FATAL:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
  });
});
