import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs'; // NOSONAR

describe('create-assets.ts', () => { // NOSONAR
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve criar arquivos com sucesso', async () => {
    const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    // mock console para não sujar o log
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); // NOSONAR

    await import('../create-assets.js');

    expect(mkdirSyncSpy).toHaveBeenCalledTimes(2);
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('✨ Assets de áudio criados com sucesso!');
  });

  it('deve logar erro e sair com status 1 caso ocorra falha', async () => {
    const error = new Error('Erro de disco');
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw error;
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); // NOSONAR
    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    await import('../create-assets.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro ao criar arquivos:', error);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  }); // NOSONAR
});
