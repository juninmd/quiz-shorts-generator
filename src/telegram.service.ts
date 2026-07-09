import { Bot, InputFile } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

const executeTelegramAction = async (
  action: (bot: Bot, chatId: string) => Promise<void>,
  startLog: string,
  successLog: string,
  errorLogPrefix: string
): Promise<boolean> => {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
    return false;
  }

  const bot = new Bot(token);
  console.log(startLog);

  let success = false;
  try {
    await action(bot, chatId);
    console.log(successLog);
    success = true;
  } catch (error: any) {
    const errorMessage = (error.message || String(error)).replace(token, '***TOKEN_OCULTO***');
    console.error(errorLogPrefix, errorMessage);
  } finally {
    try {
      await bot.stop();
    } catch (error) {
      if (error) {
        console.error('Erro ao parar o bot:', error);
      }
    }
  }

  return success;
};

export const sendVideoToTelegram = async (
  videoPath: string,
  caption: string
): Promise<boolean> => {
  return executeTelegramAction(
    async (bot, chatId) => {
      await bot.api.sendVideo(chatId, new InputFile(videoPath), {
        caption: `🎬 <b>NOVO QUIZ GERADO</b>\n` +
                 `──────────────────────\n` +
                 `${caption}\n\n` +
                 `──────────────────────\n` +
                 `<i>Quiz Shorts Generator AI</i>`,
        supports_streaming: true,
        parse_mode: 'HTML',
      });
    },
    `📤 Enviando ${videoPath} para o Telegram...`,
    '✅ Vídeo enviado com sucesso!',
    '❌ Erro ao enviar para o Telegram:'
  );
};

export const sendMessageToTelegram = async (
  message: string
): Promise<boolean> => {
  return executeTelegramAction(
    async (bot, chatId) => {
      await bot.api.sendMessage(chatId, 
        `📊 <b>STATUS DO QUIZ</b>\n` +
        `──────────────────────\n` +
        `${message}\n` +
        `──────────────────────`, 
        {
          parse_mode: 'HTML'
        }
      );
    },
    `📤 Enviando mensagem de texto para o Telegram...`,
    '✅ Mensagem enviada com sucesso!',
    '❌ Erro ao enviar mensagem para o Telegram:'
  );
};
