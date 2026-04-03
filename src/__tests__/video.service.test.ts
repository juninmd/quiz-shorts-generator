import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assembleVideo } from '../video.service.js';
import * as child_process from 'node:child_process'; // NOSONAR
import * as fs from 'node:fs';


vi.mock('child_process');
vi.mock('fs');
vi.mock('../video-assets.service.js', () => ({
  ensureFont: vi.fn(() => 'font.ttf'),
  prepareBackground: vi.fn(() => 'bg.mp4'),
  prepareTextFiles: vi.fn(() => ({ qTxtPath: 'q.txt', optTxtPaths: {} })),
  normalizePath: (p: string) => `norm_${p}`
}));
vi.mock('../video-filters.service.js', () => ({
  generateFilters: vi.fn(() => ({ ffmpegInputs: [], filterComplex: 'filter' }))
}));
vi.mock('../video-ffmpeg.service.js', () => ({
  runFFmpeg: vi.fn(() => Promise.resolve())
}));

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const quizBase = {
    tema: 'teste',
    pergunta: 'P?',
    opcoes: { A: '1', B: '2', C: '3', D: '4' },
    resposta_correta: 'A' as const,
    fato_curioso: 'Fato'
  };

  const audioData = {
    qPath: 'q.mp3',
    aPath: 'a.mp3',
    qWords: [],
    aWords: []
  };

  it('deve criar tempDir e selecionar musica de fundo se existir', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      const sp = String(p);
      if (sp.includes('temp_assets')) return false; // forces mkdir
      if (sp.includes('music')) return true;
      return true;
    });

    vi.mocked(fs.readdirSync).mockImplementation((p: any) => {
      if (String(p).includes('music')) return ['background_1.mp3'] as any;
      return [];
    });

    vi.mocked(child_process.spawnSync).mockReturnValue({
      stdout: Buffer.from('5.0\n')
    } as any);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const out = await assembleVideo(quizBase, audioData, 'out.mp4');
    expect(out).toBe('out.mp4');
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usando música de fundo: background_1.mp3'));

    logSpy.mockRestore();
  });

  it('deve montar video sem musica se pasta nao existir ou vazia', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      const sp = String(p);
      if (sp.includes('music')) return false; // pasta não existe
      return true;
    });

    vi.mocked(child_process.spawnSync).mockReturnValue({
      stdout: Buffer.from('2.0\n')
    } as any);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const out = await assembleVideo(quizBase, audioData, 'out.mp4');
    expect(out).toBe('out.mp4');

    logSpy.mockRestore();
  });

  it('deve logar e relançar erro se montagem falhar', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(child_process.spawnSync).mockImplementation(() => {
      throw new Error('ffprobe crash');
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(assembleVideo(quizBase, audioData)).rejects.toThrow('ffprobe crash');

    expect(errSpy).toHaveBeenCalledWith('❌ Erro na montagem do vídeo:', 'ffprobe crash');

    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});
