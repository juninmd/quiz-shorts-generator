import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { google } from 'googleapis';


vi.mock('googleapis', () => {
  const oauth2Client = {
    generateAuthUrl: vi.fn().mockReturnValue('http://auth-url'),
    getToken: vi.fn(),
  };
  return {
    google: {
      auth: {
        OAuth2: vi.fn(() => oauth2Client)
      }
    }
  };
});

vi.mock('http', () => {
  const server = {
    listen: vi.fn(),
    close: vi.fn((cb) => { if(cb) cb() }),
  };
  return {
    default: {
      createServer: vi.fn(() => server)
    }
  };
});

describe('get-youtube-token.ts', () => {
  let processExitSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('deve logar erro e dar exit 1 se faltarem as variaveis de ambiente do YT', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;

    await import('../get-youtube-token.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ ERRO: Por favor, adicione YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no seu arquivo .env antes de executar este script.');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('deve criar o server e printar URL de auth se as vars existirem', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test_id';
    process.env.YOUTUBE_CLIENT_SECRET = 'test_secret';

    await import('../get-youtube-token.js');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String));
    expect(http.createServer).toHaveBeenCalled();
  });

  describe('Server HTTP Callback', () => {
    let mockReq: any;
    let mockRes: any;
    let requestHandler: any;

    beforeEach(async () => {
      process.env.YOUTUBE_CLIENT_ID = 'test_id';
      process.env.YOUTUBE_CLIENT_SECRET = 'test_secret';

      await import('../get-youtube-token.js');
      requestHandler = vi.mocked(http.createServer).mock.calls[0]![0];

      mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };
    });

    it('deve processar com sucesso o request com code e gerar o token', async () => {
      mockReq = { url: '/callback?code=auth_code' };
      const oauth2ClientInstance = new google.auth.OAuth2();
      vi.mocked(oauth2ClientInstance.getToken).mockResolvedValueOnce({
        tokens: { refresh_token: 'new_refresh_token' }
      } as any);

      await requestHandler(mockReq, mockRes);

      expect(oauth2ClientInstance.getToken).toHaveBeenCalledWith('auth_code');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
      expect(consoleLogSpy).toHaveBeenCalledWith('YOUTUBE_REFRESH_TOKEN="new_refresh_token"');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve retornar erro 400 se code nao for fornecido', async () => {
      mockReq = { url: '/callback' };

      await requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/plain' });
      expect(mockRes.end).toHaveBeenCalledWith('Código não encontrado na URL.');
    });

    it('deve retornar erro 500 se getToken falhar', async () => {
      mockReq = { url: '/callback?code=auth_code' };
      const oauth2ClientInstance = new google.auth.OAuth2();
      vi.mocked(oauth2ClientInstance.getToken).mockRejectedValueOnce(new Error('getToken failed'));

      await requestHandler(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Erro inesperado:', expect.any(Error));
      expect(mockRes.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'text/plain' });
      expect(mockRes.end).toHaveBeenCalledWith('Ocorreu um erro.');
    });
  });
});
