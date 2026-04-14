import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';

let mockGetTokenReject: Error | null = null;

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: class {
          generateAuthUrl() {
            return 'http://mock-auth-url';
          }
          async getToken() {
            if (mockGetTokenReject) {
              throw mockGetTokenReject;
            }
            return {
              tokens: {
                refresh_token: 'mock-refresh-token'
              }
            };
          }
        }
      }
    }
  };
});

vi.mock('http', () => {
  return {
    default: {
      createServer: vi.fn().mockReturnValue({
        listen: vi.fn(),
        close: vi.fn((cb) => cb())
      })
    }
  };
});

describe('get-youtube-token.ts', () => {
  let exitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockGetTokenReject = null;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('deve falhar e sair se YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET nao existirem', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;

    await import('../get-youtube-token.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ ERRO: Por favor, adicione YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no seu arquivo .env antes de executar este script.'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('deve gerar url e rodar server se credenciais existirem, simulando um request sem "code"', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'id';
    process.env.YOUTUBE_CLIENT_SECRET = 'secret';

    let serverHandler: any;
    (http.createServer as any).mockImplementation((handler: any) => {
      serverHandler = handler;
      return {
        listen: vi.fn(),
        close: vi.fn()
      };
    });

    await import('../get-youtube-token.js');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('http://mock-auth-url'));

    const req = { url: '/callback?nocode=123' };
    const res = {
      writeHead: vi.fn(),
      end: vi.fn()
    };

    await serverHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Código não encontrado na URL.');
  });

  it('deve processar o request com "code" e retornar com sucesso', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'id';
    process.env.YOUTUBE_CLIENT_SECRET = 'secret';

    let serverHandler: any;
    (http.createServer as any).mockImplementation((handler: any) => {
      serverHandler = handler;
      return {
        listen: vi.fn(),
        close: vi.fn((cb: any) => cb())
      };
    });

    await import('../get-youtube-token.js');

    const req = { url: '/callback?code=mock-code' };
    const res = {
      writeHead: vi.fn(),
      end: vi.fn()
    };

    await serverHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
    expect(res.end).toHaveBeenCalledWith('<h1>✅ Sucesso!</h1><p>Você pode fechar esta aba e voltar para o terminal.</p>');
    expect(consoleLogSpy).toHaveBeenCalledWith('YOUTUBE_REFRESH_TOKEN="mock-refresh-token"');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('deve lidar com throw do getToken ou qualquer erro no server', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'id';
    process.env.YOUTUBE_CLIENT_SECRET = 'secret';

    const errorMock = new Error('Erro getToken');
    mockGetTokenReject = errorMock;

    let serverHandler: any;
    (http.createServer as any).mockImplementation((handler: any) => {
      serverHandler = handler;
      return {
        listen: vi.fn(),
        close: vi.fn()
      };
    });

    await import('../get-youtube-token.js');

    const req = { url: '/callback?code=mock-code' };
    const res = {
      writeHead: vi.fn(),
      end: vi.fn()
    };

    await serverHandler(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro inesperado:', errorMock);
    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Ocorreu um erro.');
  });
});
