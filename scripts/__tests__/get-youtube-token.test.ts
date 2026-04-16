import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { google } from 'googleapis';

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: class {
          generateAuthUrl() { return 'http://mock-auth-url'; }
          getToken() { return Promise.resolve({ tokens: { refresh_token: 'mock-refresh-token' } }); }
        },
      },
    },
  };
});

describe('get-youtube-token.ts', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('deve sair com erro se as variaveis de ambiente estiverem faltando', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    await import('../get-youtube-token.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ ERRO: Por favor, adicione YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no seu arquivo .env antes de executar este script.');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('deve criar servidor e logar informacoes iniciais se variaveis existirem', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'mock_client_id';
    process.env.YOUTUBE_CLIENT_SECRET = 'mock_client_secret';

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockListen = vi.fn((port, cb) => {
      if (cb) cb();
    });

    const mockServer = {
      listen: mockListen,
      close: vi.fn(),
    };

    vi.spyOn(http, 'createServer').mockImplementation(((handler: any) => {
      return mockServer;
    }) as any);

    await import('../get-youtube-token.js');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('http://mock-auth-url'));
    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it('deve processar o codigo corretamente na rota callback', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'mock_client_id';
    process.env.YOUTUBE_CLIENT_SECRET = 'mock_client_secret';

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    let serverHandler: any;

    const mockServer = {
      listen: vi.fn(),
      close: vi.fn((cb) => {
          if (cb) cb();
      }),
    };

    vi.spyOn(http, 'createServer').mockImplementation(((handler: any) => {
      serverHandler = handler;
      return mockServer;
    }) as any);

    await import('../get-youtube-token.js');

    const req = { url: '/callback?code=mock_code' };
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    await serverHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('YOUTUBE_REFRESH_TOKEN="mock-refresh-token"'));
    expect(mockServer.close).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  describe('http.createServer routes', () => {
    let serverHandler: any;
    let req: any;
    let res: any;

    beforeEach(async () => {
      process.env.YOUTUBE_CLIENT_ID = 'mock_client_id';
      process.env.YOUTUBE_CLIENT_SECRET = 'mock_client_secret';

      const mockServer = {
        listen: vi.fn(),
        close: vi.fn(),
      };

      vi.spyOn(http, 'createServer').mockImplementation(((handler: any) => {
        serverHandler = handler;
        return mockServer;
      }) as any);

      vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../get-youtube-token.js');

      res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };
    });

    it('deve retornar 400 se o codigo nao for fornecido', async () => {
      req = { url: '/callback' }; // no code

      await serverHandler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Código não encontrado na URL.');
    });

    it('deve retornar 500 se ocorrer um erro inesperado', async () => {
      req = { url: '/callback?code=mock_code' };
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // modify url.parse to throw an error to simulate unexpected failure
      const url = require('url');
      vi.spyOn(url, 'parse').mockImplementation(() => {
          throw new Error('Unexpected error');
      });

      await serverHandler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro inesperado:', expect.any(Error));
      expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Ocorreu um erro.');
    });
  });
});
