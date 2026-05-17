import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
}));

describe('create-assets script', () => {
  let processExitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.resetModules();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create minimal MP3 files successfully', async () => {
    await import('../create-assets.js');

    expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('📦 Criando arquivos de mídia...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ background.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ beep.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✨ Assets de áudio criados com sucesso!');
  });

  it('should handle errors and exit with 1', async () => {
    vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    await import('../create-assets.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro ao criar arquivos:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
