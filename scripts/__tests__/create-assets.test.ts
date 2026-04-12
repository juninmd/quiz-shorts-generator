import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('create-assets test', () => {
  let exitMock: vi.SpyInstance;
  let consoleLogMock: vi.SpyInstance;
  let consoleErrorMock: vi.SpyInstance;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any); // NOSONAR
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {}); // NOSONAR
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {}); // NOSONAR
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create minimal MP3s', async () => {
    vi.doMock('fs', () => ({
      default: {
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      }
    }));

    await import('../create-assets.js'); // NOSONAR

    const fs = await import('fs'); // NOSONAR
    expect(fs.default.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('should handle errors', async () => {
    vi.doMock('fs', () => ({
      default: {
        mkdirSync: vi.fn().mockImplementation(() => { throw new Error('mock error'); }),
        writeFileSync: vi.fn(),
      }
    }));

    await import('../create-assets.js'); // NOSONAR

    expect(consoleErrorMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
