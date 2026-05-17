import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';

const mockGenerateAuthUrl = vi.fn().mockReturnValue('mock-auth-url');
const mockGetToken = vi.fn().mockResolvedValue({ tokens: { refresh_token: 'mock-refresh-token' } });

class MockOAuth2 {
  generateAuthUrl = mockGenerateAuthUrl;
  getToken = mockGetToken;
}

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: MockOAuth2
    }
  }
}));

const mockServerClose = vi.fn((cb) => cb && cb());
const mockServerListen = vi.fn();

let storedHandler: any = null;

vi.mock('http', () => {
  return {
    default: {
      createServer: vi.fn((handler) => {
        storedHandler = handler;
        return {
          listen: mockServerListen,
          close: mockServerClose
        };
      })
    }
  };
});

describe('get-youtube-token script', () => {
  let processExitSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let envBefore: any;

  beforeEach(() => {
    vi.resetModules();
    envBefore = process.env;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockGenerateAuthUrl.mockClear();
    mockGetToken.mockClear();
    mockGenerateAuthUrl.mockReturnValue('mock-auth-url');
    mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'mock-refresh-token' } });

    storedHandler = null;
    vi.mocked(http.createServer).mockClear();
    mockServerListen.mockClear();
    mockServerClose.mockClear();
  });

  afterEach(() => {
    process.env = envBefore;
    vi.restoreAllMocks();
  });

  async function setupAndImport() {
    process.env.YOUTUBE_CLIENT_ID = 'test-id';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    await import('../get-youtube-token.js');
  }

  function createMockRes() {
    return {
      writeHead: vi.fn(),
      end: vi.fn()
    };
  }

  it('should exit with error if YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET is missing', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;

    await import('../get-youtube-token.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ ERRO: Por favor, adicione YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET'));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should setup oauth client and start server when env vars are present', async () => {
    await setupAndImport();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('mock-auth-url'));
    expect(mockServerListen).toHaveBeenCalledWith(3000, expect.any(Function));

    const listenCall = mockServerListen.mock.calls[0];
    if (listenCall && listenCall[1]) {
      listenCall[1]();
    }
  });

  describe('HTTP Callback Handler', () => {
    it.each([
      ['success with code', '/callback?code=mock-code', false, 200, 'mock-refresh-token', true],
      ['missing code', '/callback', false, 400, 'Código não encontrado na URL.', false],
      ['error during token fetch', '/callback?code=mock-code', true, 500, 'Ocorreu um erro.', false],
    ])('handles %s', async (name, url, shouldThrow, expectedStatus, expectedContent, success) => {
      await setupAndImport();

      if (shouldThrow) {
        mockGetToken.mockRejectedValueOnce(new Error('test error'));
      }

      const req = { url };
      const res = createMockRes();

      await storedHandler(req as any, res as any);

      if (success) {
        expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(expectedContent as string));
        expect(mockServerClose).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(0);
      } else {
        expect(res.writeHead).toHaveBeenCalledWith(expectedStatus, expect.any(Object));
        expect(res.end).toHaveBeenCalledWith(expectedContent);
        if (shouldThrow) {
          expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro inesperado:', expect.any(Error));
        }
      }
    });
  });
});
