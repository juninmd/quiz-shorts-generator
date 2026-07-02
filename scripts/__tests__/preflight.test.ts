import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as childProcess from 'node:child_process';
import { runPreflight } from '../preflight.js';

vi.mock('child_process');

describe('preflight script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(childProcess.spawnSync).mockReturnValue({ status: 0 } as childProcess.SpawnSyncReturns<string>);
  });

  it('valida ffmpeg, ffprobe, python e ollama', async () => {
    const checks = await runPreflight({
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
      env: { OLLAMA_HOST: 'http://ollama.local:11434' },
    });

    expect(checks).toEqual(['ffmpeg', 'ffprobe', 'python', 'ollama']);
    expect(childProcess.spawnSync).toHaveBeenNthCalledWith(1, 'ffmpeg', ['-version'], { encoding: 'utf8' });
    expect(childProcess.spawnSync).toHaveBeenNthCalledWith(2, 'ffprobe', ['-version'], { encoding: 'utf8' });
    expect(childProcess.spawnSync).toHaveBeenNthCalledWith(3, 'python', ['--version'], { encoding: 'utf8' });
  });

  it('falha quando um binário obrigatório não responde', async () => {
    vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
      pid: 1,
      status: 1,
      output: [],
      stdout: '',
      stderr: '',
      signal: null,
      error: undefined,
    } as unknown as childProcess.SpawnSyncReturns<string>);

    await expect(runPreflight({ fetchImpl: vi.fn() as typeof fetch })).rejects.toThrow('ffmpeg exited with status 1');
  });

  it('falha quando o healthcheck do ollama retorna erro', async () => {
    await expect(runPreflight({
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    })).rejects.toThrow('ollama healthcheck failed with status 503');
  });
});