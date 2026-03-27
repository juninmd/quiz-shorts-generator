import { Bot, InputFile } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

export const sendVideoToTelegram = async (
  videoPath: string,
  caption: string
): Promise<boolean> => {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
    return false;
  }

  const bot = new Bot(token);

  console.log(`📤 Enviando ${videoPath} para o Telegram...`);

  let success = false;
  try {
    await bot.api.sendVideo(chatId, new InputFile(videoPath), {
      caption: caption,
      supports_streaming: true,
      parse_mode: 'HTML',
    });
    console.log('✅ Vídeo enviado com sucesso!');
    success = true;
  } catch (error: any) {
    // Mascara o token em qualquer string de erro para segurança
    const errorMessage = (error.message || String(error)).replace(token, '***TOKEN_OCULTO***');
    console.error('❌ Erro ao enviar para o Telegram:', errorMessage);
  } finally {
    // clean up bot internals (HTTP agent) even though we didn't start polling
    try {
      await bot.stop();
    } catch (error) {
      if (error) console.error('Erro ao parar o bot:', error);
    }
  }

  return success;
};

export const sendMessageToTelegram = async (
  message: string
): Promise<boolean> => {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
    return false;
  }

  const bot = new Bot(token);

  console.log(`📤 Enviando mensagem de texto para o Telegram...`);

  let success = false;
  try {
    await bot.api.sendMessage(chatId, message, {
      parse_mode: 'HTML'
    });
    console.log('✅ Mensagem enviada com sucesso!');
    success = true;
  } catch (error: any) {
    const errorMessage = (error.message || String(error)).replace(token, '***TOKEN_OCULTO***');
    console.error('❌ Erro ao enviar mensagem para o Telegram:', errorMessage);
  } finally {
    try {
      await bot.stop();
    } catch (error) {
      if (error) console.error('Erro ao parar o bot:', error);
    }
  }

  return success;
};
