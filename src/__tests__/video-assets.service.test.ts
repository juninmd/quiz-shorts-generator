import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapText, normalizePath, rel, esc, ensureFont, prepareBackground, prepareTextFiles } from '../video-assets.service.js';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as execModule from '../utils/exec.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('../utils/exec.js');

describe('VideoAssetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('wrapText', () => {
    it('deve quebrar linhas conforme o tamanho máximo', () => {
      const text = 'Esta é uma frase muito longa para testar a quebra';
      const max = 15;
      const result = wrapText(text, max);
      expect(result).toBe('Esta é uma\nfrase muito\nlonga para\ntestar a quebra');
    });

    it('não deve quebrar linhas se for menor que max', () => {
      const text = 'Curto';
      expect(wrapText(text, 10)).toBe('Curto');
    });
  });

  describe('normalizePath', () => {
    it('deve resolver e substituir contra-barras', () => {
      const result = normalizePath(String.raw`foo\bar`);
      expect(result).not.toContain('\\');
    });
  });

  describe('rel', () => {
    it('deve retornar caminho relativo sem contra-barras', () => {
      const result = rel(String.raw`foo\bar`);
      expect(result).not.toContain('\\');
    });
  });

  describe('esc', () => {
    it('deve escapar dois pontos', () => {
      const result = esc('C:/foo:bar');
      expect(result).toContain(String.raw`\:`);
    });
  });

  describe('ensureFont', () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = process.platform;
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('deve retornar logo se arquivo já existe', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = await ensureFont();
      expect(result).toBe('assets/fonts/arialbd.ttf');
      expect(fsPromises.mkdir).not.toHaveBeenCalled();
    });

    it('deve copiar fonte no windows (win32)', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        if (p === 'assets/fonts/arialbd.ttf') return false;
        if (p === 'C:/Windows/Fonts/arialbd.ttf') return true;
        return false;
      });
      vi.mocked(fsPromises.copyFile).mockResolvedValue(undefined);
      Object.defineProperty(process, 'platform', { value: 'win32' });

      await ensureFont();

      expect(fsPromises.mkdir).toHaveBeenCalledWith('assets/fonts', { recursive: true });
      expect(fsPromises.copyFile).toHaveBeenCalledWith('C:/Windows/Fonts/arialbd.ttf', 'assets/fonts/arialbd.ttf');
    });

    it('deve logar erro e continuar se a copia falhar (try catch no windows)', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        if (p === 'assets/fonts/arialbd.ttf') return false;
        if (p === 'C:/Windows/Fonts/arialbd.ttf') return true;
        return false;
      });
      vi.mocked(fsPromises.copyFile).mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await ensureFont();

      expect(consoleWarn).toHaveBeenCalledWith(
        '⚠️ Falha ao copiar a fonte de C:/Windows/Fonts/arialbd.ttf:',
        expect.any(Error)
      );
      expect(consoleWarn).toHaveBeenCalledWith('⚠️ Não foi possível copiar automaticamente a fonte Arial.');
      consoleWarn.mockRestore();
    });

    it('deve copiar fonte no linux se msttcorefonts existir', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        if (p === 'assets/fonts/arialbd.ttf') return false;
        if (p === '/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf') return true;
        return false;
      });
      vi.mocked(fsPromises.copyFile).mockResolvedValue(undefined);
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await ensureFont();

      expect(fsPromises.copyFile).toHaveBeenCalledWith('/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf', 'assets/fonts/arialbd.ttf');
    });

    it('deve copiar fonte do candidate dejavu no linux', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        if (p === 'assets/fonts/arialbd.ttf') return false;
        if (p === '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf') return true;
        return false;
      });
      vi.mocked(fsPromises.copyFile).mockResolvedValue(undefined);
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await ensureFont();

      expect(fsPromises.copyFile).toHaveBeenCalledWith('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'assets/fonts/arialbd.ttf');
    });

    it('deve alertar se nao achar nenhuma fonte no linux', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false); // nada existe
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await ensureFont();

      expect(consoleWarn).toHaveBeenCalledWith('⚠️ Não foi possível copiar automaticamente a fonte Arial.');
      consoleWarn.mockRestore();
    });
  });

  describe('prepareBackground', () => {
    it('deve retornar neon se existir', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const bg = await prepareBackground('temp');
      expect(bg).toContain('neon.png');
    });

    it('deve retornar bg_default jpg gerado se neon nao existir', async () => {
      // false para neon.png, false para bg_default.jpg
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });

      const bg = await prepareBackground('temp');

      expect(bg).toContain('bg_default.jpg');
      expect(execModule.execAsync).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-f', 'lavfi', '-i', 'color=c=darkblue:s=1080x1920:d=1'])
      );
    });

    it('deve retornar bg_default jpg sem regerar se ja existir', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => String(p).includes('bg_default.jpg'));
      const bg = await prepareBackground('temp');

      expect(bg).toContain('bg_default.jpg');
      expect(execModule.execAsync).not.toHaveBeenCalled();
    });
  });

  describe('prepareTextFiles', () => {
    it('deve criar q.txt e optA/B/C/D.txt e retornar caminhos', async () => {
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      const quiz = {
        tema: 'tema',
        pergunta: 'Pergunta do quiz?',
        opcoes: { A: 'A1', B: 'B1', C: 'C1', D: 'D1' },
        resposta_correta: 'A' as const,
        fato_curioso: 'Fato'
      };

      const result = await prepareTextFiles(quiz, 'temp');

      expect(result.qTxtPath).toContain('q.txt');
      expect(result.optTxtPaths.A).toContain('optA.txt');
      expect(result.optTxtPaths.D).toContain('optD.txt');

      expect(fsPromises.writeFile).toHaveBeenCalledTimes(5);
    });
  });
});
