import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assembleVideo } from '../video.service.js';
import * as execModule from '../utils/exec.js';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

vi.mock('../utils/exec.js');
vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('../video-assets.service.js', () => ({
  ensureFont: vi.fn(() => Promise.resolve('font.ttf')),
  prepareBackground: vi.fn(() => Promise.resolve('bg.mp4')),
  prepareTextFiles: vi.fn(() => Promise.resolve({ qTxtPath: 'q.txt', optTxtPaths: {} })),
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
      if (sp.includes('temp_assets')) {
        return false;
      } // forces mkdir
      if (sp.includes('music')) {
        return true;
      }
      return true;
    });

    vi.mocked(fsPromises.readdir).mockImplementation((p: any) => {
      if (String(p).includes('music')) {
        return Promise.resolve(['background_1.mp3'] as any);
      }
      return Promise.resolve([]);
    });

    vi.mocked(execModule.execAsync).mockResolvedValue({
      stdout: '5.0\n',
      stderr: '',
      code: 0
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const out = await assembleVideo(quizBase, audioData, 'out.mp4');
    expect(out).toBe('out.mp4');
    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usando música de fundo: background_1.mp3'));

    logSpy.mockRestore();
  });

  it.each([
    {
      name: 'montar video sem musica se pasta nao existir ou vazia',
      hasMusic: false,
      throws: false,
      expectedResult: 'out.mp4'
    },
    {
      name: 'logar e relançar erro se montagem falhar',
      hasMusic: true,
      throws: true,
      expectedResult: 'ffprobe crash'
    }
  ])('deve $name', async ({ hasMusic, throws, expectedResult }) => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      const sp = String(p);
      if (sp.includes('music')) {
        return hasMusic;
      }
      return true;
    });

    vi.mocked(fsPromises.readdir).mockResolvedValue([]);

    if (throws) {
      vi.mocked(execModule.execAsync).mockRejectedValue(new Error(expectedResult));
    } else {
      vi.mocked(execModule.execAsync).mockResolvedValue({
        stdout: '2.0\n',
        stderr: '',
        code: 0
      });
    }

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    if (throws) {
      await expect(assembleVideo(quizBase, audioData)).rejects.toThrow(expectedResult);
      expect(errSpy).toHaveBeenCalledWith('❌ Erro na montagem do vídeo:', expectedResult);
    } else {
      const out = await assembleVideo(quizBase, audioData, 'out.mp4');
      expect(out).toBe(expectedResult);
    }

    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});
