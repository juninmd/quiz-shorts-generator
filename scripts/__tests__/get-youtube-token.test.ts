import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('get-youtube-token test', () => {
  let exitMock: vi.SpyInstance;
  let consoleErrorMock: vi.SpyInstance;
  let consoleLogMock: vi.SpyInstance;
  let processEnvBackup: NodeJS.ProcessEnv;
  let mockServer: any;
  let oauth2ClientMock: any;

  beforeEach(() => {
    vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
    vi.resetModules();
    vi.clearAllMocks();
    processEnvBackup = { ...process.env };

    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any); // NOSONAR
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {}); // NOSONAR
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {}); // NOSONAR
  });

  afterEach(() => {
    process.env = processEnvBackup;
    vi.restoreAllMocks();
  });

  it('should exit if client id or secret are missing', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;

    await import('../get-youtube-token.js'); // NOSONAR
    expect(consoleErrorMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  describe('server scenarios', () => {
    const setupServerScenario = async (getTokenMockValue?: any, isReject = false) => {
      process.env.YOUTUBE_CLIENT_ID = 'test-id';
      process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';

      const writeHeadMock = vi.fn();
      const endMock = vi.fn();
      const closeMock = vi.fn((cb) => cb && cb()); // NOSONAR

      mockServer = {
        listen: vi.fn(),
        close: closeMock
      };

      oauth2ClientMock = {
        generateAuthUrl: vi.fn().mockReturnValue('http://auth-url'),
      };

      if (getTokenMockValue !== undefined) {
          if (isReject) {
            oauth2ClientMock.getToken = vi.fn().mockRejectedValue(getTokenMockValue);
          } else {
            oauth2ClientMock.getToken = vi.fn().mockResolvedValue(getTokenMockValue);
          }
      }

      let serverHandler: any;

      vi.doMock('googleapis', () => ({
        google: {
          auth: {
            OAuth2: vi.fn().mockImplementation(() => oauth2ClientMock)
          }
        }
      }));

      vi.doMock('http', () => ({
        default: {
          createServer: vi.fn().mockImplementation((handler) => {
            serverHandler = handler;
            return mockServer;
          })
        }
      }));

      await import('../get-youtube-token.js'); // NOSONAR

      return { serverHandler, writeHeadMock, endMock, closeMock };
    };

    it('should start server and handle callback successfully', async () => {
      const { serverHandler, writeHeadMock, endMock, closeMock } = await setupServerScenario({ tokens: { refresh_token: 'test-token' } });

      expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('http://auth-url'));

      const req = { url: '/callback?code=auth-code' };
      const res = { writeHead: writeHeadMock, end: endMock };
      await serverHandler(req, res);

      expect(oauth2ClientMock.getToken).toHaveBeenCalledWith('auth-code');
      expect(writeHeadMock).toHaveBeenCalledWith(200, expect.any(Object));
      expect(endMock).toHaveBeenCalledWith(expect.stringContaining('Sucesso'));
      expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('test-token'));
      expect(closeMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it.each([
      ['/callback', 400, 'Código não encontrado', null, false],
      ['/callback?code=auth-code', 500, 'Ocorreu um erro.', new Error('test error'), true],
    ])('should handle callback %s', async (urlStr, expectedStatus, expectedEndStr, getTokenMock, isReject) => {
      const { serverHandler, writeHeadMock, endMock } = await setupServerScenario(getTokenMock, isReject);

      const req = { url: urlStr };
      const res = { writeHead: writeHeadMock, end: endMock };
      await serverHandler(req, res);

      expect(writeHeadMock).toHaveBeenCalledWith(expectedStatus, expect.any(Object));
      expect(endMock).toHaveBeenCalledWith(expect.stringContaining(expectedEndStr));
      if (isReject) {
        expect(consoleErrorMock).toHaveBeenCalledWith('❌ Erro inesperado:', expect.any(Error));
      }
    });
  });
});
