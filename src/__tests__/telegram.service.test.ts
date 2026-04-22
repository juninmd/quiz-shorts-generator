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

  describe('env variables missing', () => {
    it.each([
      { deleteToken: true, method: () => sendVideoToTelegram('video.mp4', 'caption') },
      { deleteToken: false, method: () => sendVideoToTelegram('video.mp4', 'caption') },
      { deleteToken: true, method: () => sendMessageToTelegram('msg') }
    ])('deve retornar false se token ou chatId faltarem (deleteToken: $deleteToken)', async ({ deleteToken, method }) => {
      if (deleteToken) { delete process.env.TELEGRAM_TOKEN; }
      else {
        process.env.TELEGRAM_TOKEN = 'token';
        delete process.env.TELEGRAM_CHAT_ID;
      }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await method();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
      consoleSpy.mockRestore();
    });
  });

  describe('sucesso', () => {
    beforeEach(() => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
    });

    it('deve enviar o vídeo com sucesso e retornar true', async () => {
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

    it('deve enviar a mensagem com sucesso e retornar true', async () => {
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
  });

  describe('error handling e masking', () => {
    beforeEach(() => {
      process.env.TELEGRAM_TOKEN = 'token123';
      process.env.TELEGRAM_CHAT_ID = 'chat123';
    });

    it.each([
      {
        name: 'video (Error instance)',
        err: new Error('API error with token123 here'),
        method: () => sendVideoToTelegram('video.mp4', 'caption'),
        mockFn: mockSendVideo,
        prefix: '❌ Erro ao enviar para o Telegram:',
        expectedMsg: 'API error with ***TOKEN_OCULTO*** here'
      },
      {
        name: 'video (string)',
        err: 'Some string error token123',
        method: () => sendVideoToTelegram('video.mp4', 'caption'),
        mockFn: mockSendVideo,
        prefix: '❌ Erro ao enviar para o Telegram:',
        expectedMsg: 'Some string error ***TOKEN_OCULTO***'
      },
      {
        name: 'msg (Error instance)',
        err: new Error('Failed token123'),
        method: () => sendMessageToTelegram('minha msg'),
        mockFn: mockSendMessage,
        prefix: '❌ Erro ao enviar mensagem para o Telegram:',
        expectedMsg: 'Failed ***TOKEN_OCULTO***'
      },
      {
        name: 'msg (string)',
        err: 'Some string error token123',
        method: () => sendMessageToTelegram('minha msg'),
        mockFn: mockSendMessage,
        prefix: '❌ Erro ao enviar mensagem para o Telegram:',
        expectedMsg: 'Some string error ***TOKEN_OCULTO***'
      }
    ])('deve retornar false e mascarar erro em $name', async ({ err, method, mockFn, prefix, expectedMsg }) => {
      mockFn.mockRejectedValueOnce(err);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await method();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(prefix, expectedMsg);
      consoleSpy.mockRestore();
    });
  });

  describe('bot.stop() error handling', () => {
    const edgeCases = [
      { type: 'string', err: 'String error stop' },
      { type: 'null', err: null },
      { type: 'undefined', err: undefined },
      { type: 'false', err: false },
      { type: 'Error instance', err: new Error('Stop error') }
    ];

    edgeCases.forEach(({ type, err }) => {
      it(`deve tratar exceção no bot.stop (${type})`, async () => {
        process.env.TELEGRAM_TOKEN = 'token123';
        process.env.TELEGRAM_CHAT_ID = 'chat123';

        // Testa as duas funções seguidas
        mockSendVideo.mockResolvedValueOnce(true);
        mockStop.mockImplementationOnce(() => { throw err; });

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const resVideo = await sendVideoToTelegram('video.mp4', 'caption');
        expect(resVideo).toBe(true);

        mockSendMessage.mockResolvedValueOnce(true);
        mockStop.mockImplementationOnce(() => { throw err; });
        const resMsg = await sendMessageToTelegram('msg');
        expect(resMsg).toBe(true);

        expect(mockStop).toHaveBeenCalledTimes(2);
        if (err) {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao parar o bot:', err);
        }

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });
  });
});
