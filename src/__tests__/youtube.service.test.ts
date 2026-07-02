import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateYoutubeMetadata, uploadToYouTube } from '../youtube.service.js';
import * as fs from 'node:fs';
<<<<<<< Updated upstream
import { generateObject } from 'ai';
=======
import { generateText } from 'ai';
>>>>>>> Stashed changes

vi.mock('fs');

const mockVideosInsert = vi.fn();
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() }))
    },
    youtube: vi.fn().mockImplementation(() => ({
      videos: { insert: mockVideosInsert }
    }))
  }
}));

<<<<<<< Updated upstream
// Mock AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

// Mock Ollama provider
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn())
=======
vi.mock('ai', () => ({
  generateText: vi.fn()
}));

vi.mock('../ai-client.js', () => ({
  getAIModel: vi.fn(() => 'mock-model')
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('deve chamar generateObject e retornar metadata sem modelos configurados', async () => {
=======
      expect(generateText).not.toHaveBeenCalled();
    });

    it('deve chamar AI e retornar metadata processada', async () => {
>>>>>>> Stashed changes
      process.env.ENABLE_YOUTUBE = 'true';
      delete process.env.AI_MODEL;
      delete process.env.OLLAMA_MODEL;

<<<<<<< Updated upstream
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'Quiz top', description: 'Desc' }
=======
      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({ title: 'Quiz top', description: 'Desc' })
>>>>>>> Stashed changes
      } as any);

      const res = await generateYoutubeMetadata(quizBase);
      expect(res.title).toBe('Quiz top');
      expect(res.description).toBe('Desc');
      expect(generateObject).toHaveBeenCalled();
    });

<<<<<<< Updated upstream
    it('deve usar AI_MODEL se disponível e incluir channel name', async () => {
=======
    it('deve aplicar fallbacks caso o JSON não venha com as propriedades', async () => {
>>>>>>> Stashed changes
      process.env.ENABLE_YOUTUBE = 'true';
      process.env.AI_MODEL = 'custom_model';
      process.env.YOUTUBE_CHANNEL_NAME = 'MeuCanal';

<<<<<<< Updated upstream
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'T', description: 'D' }
      } as any);
=======
      vi.mocked(generateText).mockResolvedValueOnce({ text: '{}' } as any);
>>>>>>> Stashed changes

      await generateYoutubeMetadata(quizBase);
      expect(generateObject).toHaveBeenCalled();
    });

<<<<<<< Updated upstream
    it('deve usar OLLAMA_MODEL se AI_MODEL estiver ausente e lidar com falta de channel name', async () => {
=======
    it('deve extrair JSON de texto com conteúdo extra', async () => {
>>>>>>> Stashed changes
      process.env.ENABLE_YOUTUBE = 'true';
      delete process.env.AI_MODEL;
      delete process.env.YOUTUBE_CHANNEL_NAME;
      process.env.OLLAMA_MODEL = 'ollama_model';

<<<<<<< Updated upstream
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { title: 'T', description: 'D' }
      } as any);

      await generateYoutubeMetadata(quizBase);
      expect(generateObject).toHaveBeenCalled();
    });

    it('deve retornar default em caso de erro da chamada generateObject', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI Error'));
=======
      vi.mocked(generateText).mockResolvedValueOnce({
        text: 'Aqui está o resultado:\n{"title": "Title Extra"}\nFim.'
      } as any);

      const res = await generateYoutubeMetadata(quizBase);
      expect(res.title).toBe('Title Extra');
    });

    it('deve retornar default em caso de erro na chamada AI', async () => {
      process.env.ENABLE_YOUTUBE = 'true';
      vi.mocked(generateText).mockRejectedValueOnce(new Error('Network Err'));
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
  });
});
