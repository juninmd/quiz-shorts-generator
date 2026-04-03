import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFFmpeg } from '../video-ffmpeg.service.js';
import * as child_process from 'node:child_process';
import { EventEmitter } from 'node:events';

vi.mock('child_process');
vi.mock('../video-assets.service.js', () => ({
  normalizePath: (p: string) => p
}));

describe('VideoFFmpegService', () => {
  let mockEmitter: any;
  let consoleLog: any;
  let stdoutWrite: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitter = new EventEmitter();
    mockEmitter.stderr = new EventEmitter();
    vi.mocked(child_process.spawn).mockReturnValue(mockEmitter);

    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  const runPromise = () => runFFmpeg(['-i', 'a.mp4'], 'filter', 'out.mp4', 10);

  it('deve logar progresso e resolver no sucesso', async () => {
    const promise = runPromise();

    // Simulate progress updates
    mockEmitter.stderr.emit('data', 'Input #0\n');
    mockEmitter.stderr.emit('data', Buffer.from('time=00:00:05.000\n'));
    mockEmitter.stderr.emit('data', 'time=00:00:10.000\n');

    // Simulate invalid hms string (empty matching)
    mockEmitter.stderr.emit('data', 'time=invalid\n');

    // Test hmsToSeconds where split doesn't return 3 parts
    mockEmitter.stderr.emit('data', 'time=00:05.000\n');
    mockEmitter.stderr.emit('data', 'time=00:00:10.000\n');

    // Missing block of hms coverage
    mockEmitter.stderr.emit('data', 'time=00:00:15.000\n'); // branch default missing
    mockEmitter.stderr.emit('data', 'time=::\n'); // coverage for NaN/undefined handling
    mockEmitter.stderr.emit('data', 'time=NaN:NaN:NaN\n');
    mockEmitter.stderr.emit('data', 'time=0\n');
    mockEmitter.stderr.emit('data', 'time=abc:def:ghi\n');
    mockEmitter.stderr.emit('data', 'time=00:00:00.000\n');

    // Simulate exit
    mockEmitter.emit('close', 0);

    await promise;

    expect(child_process.spawn).toHaveBeenCalledWith('ffmpeg', expect.any(Array));
    expect(consoleLog).toHaveBeenCalledWith('🎥 Processando FFmpeg...');
    expect(consoleLog).toHaveBeenCalledWith('Input #0');
    expect(consoleLog).toHaveBeenCalledWith('✅ Vídeo gerado com sucesso: out.mp4');

    consoleLog.mockRestore();
    stdoutWrite.mockRestore();
  });

  it('deve rejeitar se o processo do ffmpeg fechar com código de erro', async () => {
    const promise = runPromise();

    // Simulate exit with error code
    mockEmitter.emit('close', 1);

    await expect(promise).rejects.toThrow('FFmpeg exited with 1');

    consoleLog.mockRestore();
    stdoutWrite.mockRestore();
  });

  it('deve logar progressão do keepAlive setInterval se for acionado', async () => {
    vi.useFakeTimers();

    const promise = runPromise();

    // Advance timers to trigger keepAlive
    vi.advanceTimersByTime(5 * 60 * 1000 + 100);

    mockEmitter.emit('close', 0);
    await promise;

    expect(consoleLog).toHaveBeenCalledWith('⏳ ffmpeg still running...');

    consoleLog.mockRestore();
    stdoutWrite.mockRestore();
    vi.useRealTimers();
  });
});
