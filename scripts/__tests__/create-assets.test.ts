import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';


// Mocks
vi.mock('fs', () => {
  return {
    default: {
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    }
  };
});

describe('create-assets.ts', () => {
  let processExitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.resetModules();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve criar os assets de audio com sucesso', async () => {
    await import('../create-assets.js');

    expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('📦 Criando arquivos de mídia...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ background.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ beep.mp3 criado');
    expect(consoleLogSpy).toHaveBeenCalledWith('✨ Assets de áudio criados com sucesso!');
  });

  it('deve logar erro e dar exit 1 se mkdirSync falhar', async () => {
    vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
      throw new Error('EACCES');
    });

    await import('../create-assets.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro ao criar arquivos:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
