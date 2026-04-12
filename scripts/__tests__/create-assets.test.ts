import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('create-assets test', () => {
  let exitMock: any;
  let consoleLogMock: any;
  let consoleErrorMock: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    await import('../create-assets.js');

    const fs = await import('fs');
    expect(fs.default.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('should handle errors', async () => {
    vi.doMock('fs', () => ({
      default: {
        mkdirSync: vi.fn().mockImplementation(() => { throw new Error('mock error'); }),
        writeFileSync: vi.fn(),
      }
    }));

    await import('../create-assets.js');

    expect(consoleErrorMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
