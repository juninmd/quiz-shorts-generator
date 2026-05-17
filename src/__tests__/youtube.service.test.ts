import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateYoutubeMetadata, uploadToYouTube } from '../youtube.service.js';
import * as fs from 'node:fs';
import { generateObject } from 'ai';

vi.mock('fs');
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

// We mock googleapis
const mockVideosInsert = vi.fn();
vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          setCredentials: vi.fn()
        }))
      },
      youtube: vi.fn().mockImplementation(() => ({
        videos: {
          insert: mockVideosInsert
        }
      }))
    }
  };
});

// Mock AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

// Mock Ollama provider
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn())
}));

describe('YouTubeService', () => {
  const originalEnv = process.env;

  const quizBase = {
    tema: 'teste',
    pergunta: 'P?',
    opcoes: { A: '1', B: '2', C: '3', D: '4' },
    resposta_correta: 'A' as const,
    fato_curioso: 'Fato'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateYoutubeMetadata', () => {
    it('deve retornar default se ENABLE_YOUTUBE for false', async () => {
      process.env.ENABLE_YOUTUBE = 'false';

      const res = await generateYoutubeMetadata(quizBase);

      expect(res.title).toBe('Quiz: teste!');
      expect(res.description).toBe('Teste seus conhecimentos! #quiz #shorts #curiosidades');
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('deve chamar generateObject e retornar metadata sem modelos configurados', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      delete process.env.AI_MODEL;
      delete process.env.OLLAMA_MODEL;

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'Quiz top', description: 'Desc' }
      } as any);

      const res = await generateYoutubeMetadata(quizBase);
      expect(res.title).toBe('Quiz top');
      expect(res.description).toBe('Desc');
      expect(generateObject).toHaveBeenCalled();
    });

    it('deve usar AI_MODEL se disponível e incluir channel name', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      process.env.AI_MODEL = 'custom_model';
      process.env.YOUTUBE_CHANNEL_NAME = 'MeuCanal';

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'T', description: 'D' }
      } as any);

      await generateYoutubeMetadata(quizBase);
      expect(generateObject).toHaveBeenCalled();
    });

    it('deve usar OLLAMA_MODEL se AI_MODEL estiver ausente e lidar com falta de channel name', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      delete process.env.AI_MODEL;
      delete process.env.YOUTUBE_CHANNEL_NAME;
      process.env.OLLAMA_MODEL = 'ollama_model';

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'T', description: 'D' }
      } as any);

      await generateYoutubeMetadata(quizBase);
      expect(generateObject).toHaveBeenCalled();
    });

    it('deve retornar default em caso de erro da chamada generateObject', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI Error'));

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await generateYoutubeMetadata(quizBase);

      expect(res.title).toBe('Quiz: teste!');
      expect(errSpy).toHaveBeenCalled();

      errSpy.mockRestore();
    });
  });

  describe('uploadToYouTube', () => {
    it('deve pular se ENABLE_YOUTUBE for false', async () => {
      process.env.ENABLE_YOUTUBE = 'false';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const res = await uploadToYouTube('v.mp4', 't', 'd');
      expect(res).toBeNull();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Upload para o YouTube desativado'));

      logSpy.mockRestore();
    });

    it('deve pular se faltarem credenciais', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      delete process.env.YOUTUBE_CLIENT_ID;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await uploadToYouTube('v.mp4', 't', 'd');
      expect(res).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Credenciais do YouTube ausentes'));

      warnSpy.mockRestore();
    });

    it('deve enviar e retornar a url no sucesso', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      process.env.YOUTUBE_CLIENT_ID = 'id';
      process.env.YOUTUBE_CLIENT_SECRET = 'secret';
      process.env.YOUTUBE_REFRESH_TOKEN = 'token';

      vi.mocked(fs.createReadStream).mockReturnValue('stream' as any);
      mockVideosInsert.mockResolvedValueOnce({ data: { id: 'yt123' } });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const res = await uploadToYouTube('v.mp4', 't', 'd');
      expect(res).toBe('https://youtube.com/shorts/yt123');

      logSpy.mockRestore();
    });

    it('deve retornar nulo e mascarar as credenciais em caso de erro', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      process.env.YOUTUBE_CLIENT_ID = 'meu_id';
      process.env.YOUTUBE_CLIENT_SECRET = 'meu_secret';
      process.env.YOUTUBE_REFRESH_TOKEN = 'meu_token';

      mockVideosInsert.mockRejectedValueOnce(new Error('Failed with meu_id'));

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const res = await uploadToYouTube('v.mp4', 't', 'd');

      expect(res).toBeNull();
      expect(errSpy).toHaveBeenCalledWith('❌ Erro ao enviar para o YouTube:', expect.stringContaining('***SEGREDO_OCULTO***'));

      errSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('deve lidar com erro sem mensagem no upload', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      process.env.YOUTUBE_CLIENT_ID = 'meu_id';
      process.env.YOUTUBE_CLIENT_SECRET = 'meu_secret';
      process.env.YOUTUBE_REFRESH_TOKEN = 'meu_token';

      mockVideosInsert.mockRejectedValueOnce({});

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await uploadToYouTube('v.mp4', 't', 'd');

      expect(res).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
