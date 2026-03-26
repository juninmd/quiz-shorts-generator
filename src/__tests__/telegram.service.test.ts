import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendVideoToTelegram, sendMessageToTelegram } from '../telegram.service.js';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() }
}));

const mockSendVideo = vi.fn();
const mockSendMessage = vi.fn();
const mockStop = vi.fn();

const mockInputFile = { fakeInputFile: true };

vi.mock('grammy', () => {
  return {
    Bot: vi.fn().mockImplementation(() => ({
      api: {
        sendVideo: mockSendVideo,
        sendMessage: mockSendMessage
      },
      stop: mockStop
    })),
    InputFile: vi.fn().mockImplementation(() => mockInputFile)
  };
});

describe('TelegramService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendVideoToTelegram', () => {
    it('deve retornar false se TELEGRAM_TOKEN não estiver configurado', async () => {
      delete process.env.TELEGRAM_TOKEN;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
      consoleSpy.mockRestore();
    });

    it('deve retornar false se TELEGRAM_CHAT_ID não estiver configurado', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      delete process.env.TELEGRAM_CHAT_ID;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
      consoleSpy.mockRestore();
    });

    it('deve enviar o vídeo com sucesso e retornar true', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockResolvedValueOnce(true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockSendVideo).toHaveBeenCalledWith('chat123', mockInputFile, {
        caption: 'caption',
        supports_streaming: true,
        parse_mode: 'HTML'
      });
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve retornar false se a chamada da API falhar e mascarar o token no erro', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockRejectedValueOnce(new Error('API error with token123 here'));
      mockStop.mockResolvedValueOnce(true);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Erro ao enviar para o Telegram:',
        'API error with ***TOKEN_OCULTO*** here'
      );
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve engolir try/catch empty no finally se bot.stop throws string', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => { throw 'String error stop' });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve tratar exceções no bot.stop na falha sem quebrar', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockRejectedValueOnce(new Error('Stop error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('deve ignorar throw vazio do try catch no finally do sendMessageToTelegram', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => {
        throw 'String err 2';
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('msg');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', 'String err 2');
      consoleSpy.mockRestore();
    });

    it('deve logar falsey error throw in bot.stop of sendVideoToTelegram', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => { throw null; });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve ignorar throw vazio do try catch no finally the sendVideoToTelegram se não for error do tipo Error', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => {
        throw 'String err';
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', 'String err');
      consoleSpy.mockRestore();
    });

    it('deve logar fallback quando erro não tiver error.message na falha do video', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockRejectedValueOnce('Some string error token123');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Erro ao enviar para o Telegram:',
        'Some string error ***TOKEN_OCULTO***'
      );
      consoleSpy.mockRestore();
    });

    it('deve logar finally vazio se bot.stop() mock não for error instance em sendVideoToTelegram', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => { throw undefined; });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve logar falsey error throw in bot.stop of sendMessage', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => { throw false; });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('minha msg');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve ignorar throw vazio do try catch no finally the sendMessageToTelegram se não for error do tipo Error', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => {
        throw 'String err';
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('msg');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', 'String err');
      consoleSpy.mockRestore();
    });

    it('deve cobrir a exception do finally se bot.stop falhar em sendMessageToTelegram', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => {
        throw new Error('Fake stop fail msg');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('minha msg');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('deve cobrir a exception do finally se bot.stop falhar em sendVideoToTelegram', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendVideo.mockResolvedValueOnce(true);
      mockStop.mockImplementationOnce(() => {
        throw new Error('Fake stop fail video');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendVideoToTelegram('video.mp4', 'caption');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('sendMessageToTelegram', () => {
    it('deve retornar false se variáveis de ambiente faltarem', async () => {
      delete process.env.TELEGRAM_TOKEN;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('message');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('deve enviar a mensagem com sucesso e retornar true', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendMessageToTelegram('minha msg');

      expect(result).toBe(true);
      expect(mockSendMessage).toHaveBeenCalledWith('chat123', 'minha msg', {
        parse_mode: 'HTML'
      });
      expect(mockStop).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('deve retornar false se a chamada da API falhar e mascarar o token', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockRejectedValueOnce(new Error('Failed token123'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('minha msg');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Erro ao enviar mensagem para o Telegram:',
        'Failed ***TOKEN_OCULTO***'
      );
      consoleSpy.mockRestore();
    });

    it('deve logar fallback quando erro não tiver error.message na falha de msg', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockRejectedValueOnce('Some string error token123');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('minha msg');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Erro ao enviar mensagem para o Telegram:',
        'Some string error ***TOKEN_OCULTO***'
      );
      consoleSpy.mockRestore();
    });

    it('deve tratar exceções no bot.stop do sendMessage', async () => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
      mockSendMessage.mockResolvedValueOnce(true);
      mockStop.mockRejectedValueOnce(new Error('Stop error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await sendMessageToTelegram('msg');

      expect(result).toBe(true);
      expect(mockStop).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao parar o bot:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
