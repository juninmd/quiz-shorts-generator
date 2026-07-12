import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppRunner } from '../app.js';

vi.mock('../app.js');

describe('Index Entrypoint', () => {
  const originalEnv = process.env;
  let mockExit: any;
  let errSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
    errSpy.mockRestore();
  });

  const executeIndex = async () => {
    vi.resetModules();
    await import('../index.js');
    await new Promise(r => setTimeout(r, 100)); // allow microtasks
  };

  it('should call process.exit with status returned by AppRunner', async () => {
    vi.mocked(AppRunner.prototype.run).mockResolvedValue(0);

    await executeIndex();

    expect(AppRunner).toHaveBeenCalled();
    expect(AppRunner.prototype.run).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should call process.exit with 1 and log error if AppRunner.run throws', async () => {
    const error = new Error('Fatal AppRunner Error');
    vi.mocked(AppRunner.prototype.run).mockRejectedValue(error);

    await executeIndex();

    expect(errSpy).toHaveBeenCalledWith('💥 CRASH FATAL:', error);
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
