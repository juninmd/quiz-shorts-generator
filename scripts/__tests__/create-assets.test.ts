import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

vi.mock('fs', () => {
  return {
    default: {
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    }
  };
});

describe('create-assets.ts', () => {
  let exitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve criar os arquivos de audio corretamente no caminho de sucesso', async () => {
    await import('../create-assets.js');

    expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

    expect(consoleLogSpy).toHaveBeenCalledWith('📦 Criando arquivos de mídia...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ background.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ beep.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✨ Assets de áudio criados com sucesso!');

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('deve logar erro e sair com process.exit(1) em caso de falha', async () => {
    const errorMsg = new Error('Erro simulado');
    (fs.writeFileSync as any).mockImplementationOnce(() => {
      throw errorMsg;
    });

    await import('../create-assets.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro ao criar arquivos:', errorMsg);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
