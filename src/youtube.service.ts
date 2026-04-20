import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
import type { Quiz } from './content.service.js';
import { Ollama } from 'ollama';

dotenv.config();

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
});

export const generateYoutubeMetadata = async (quiz: Quiz): Promise<{ title: string; description: string }> => {
  const isEnabled = process.env.ENABLE_YOUTUBE === 'true';

  if (!isEnabled) {
    return {
      title: `Quiz: ${quiz.tema}!`,
      description: `Teste seus conhecimentos! #quiz #shorts #curiosidades`
    };
  }

  const modelName = process.env.OLLAMA_MODEL || 'gemma3:1b';
  const channelInfo = process.env.YOUTUBE_CHANNEL_NAME ? ` do canal ${process.env.YOUTUBE_CHANNEL_NAME}` : '';

  const prompt = `Crie um título e uma descrição para um vídeo do YouTube Shorts${channelInfo} sobre o seguinte quiz:
Tema: ${quiz.tema}
Pergunta: ${quiz.pergunta}
Fato Curioso: ${quiz.fato_curioso}

O título deve ser chamativo, com no máximo 60 caracteres, e incluir emojis.
A descrição deve ser curta, engajadora, ter no máximo 3 frases, e incluir as hashtags #quiz #shorts #curiosidades.
Responda APENAS com um objeto JSON no formato:
{
  "title": "...",
  "description": "..."
}
O texto deve estar em Português do Brasil.`;

  try {
    const response = await ollama.chat({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
    });

    const content = response.message.content.trim();
    let cleanContent = content;
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.substring(7, cleanContent.lastIndexOf('\`\`\`')).trim();
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.substring(3, cleanContent.lastIndexOf('\`\`\`')).trim();
    }

    const metadata = JSON.parse(cleanContent);
    return {
      title: metadata.title || `Quiz: ${quiz.tema}!`,
      description: metadata.description || `#quiz #shorts #curiosidades`
    };
  } catch (error) {
    console.error('❌ Erro ao gerar metadados para o YouTube:', error);
    return {
      title: `Quiz: ${quiz.tema}!`,
      description: `Teste seus conhecimentos! #quiz #shorts #curiosidades`
    };
  }
};

export const uploadToYouTube = async (
  videoPath: string,
  title: string,
  description: string
): Promise<string | null> => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  const isEnabled = process.env.ENABLE_YOUTUBE === 'true';

  if (!isEnabled) {
    console.log('⏩ Upload para o YouTube desativado (ENABLE_YOUTUBE=false). Apenas enviando localmente/Telegram.');
    return null;
  }

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('⚠️ Credenciais do YouTube ausentes no .env. Pulando upload para o YouTube.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  console.log(`📤 Fazendo upload de ${videoPath} para o YouTube...`);

  try {
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['quiz', 'shorts', 'curiosidades'],
          categoryId: '27', // Education
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });
    const url = `https://youtube.com/shorts/${res.data?.id}`;
    console.log(`✅ Vídeo enviado para o YouTube! URL: ${url}`);
    return url;
  } catch (error: any) {
    let errorMessage = error.message || String(error);
    if (clientId) { errorMessage = errorMessage.replace(new RegExp(clientId, 'g'), '***CLIENT_ID_OCULTO***'); }
    if (clientSecret) { errorMessage = errorMessage.replace(new RegExp(clientSecret, 'g'), '***CLIENT_SECRET_OCULTO***'); }
    if (refreshToken) { errorMessage = errorMessage.replace(new RegExp(refreshToken, 'g'), '***REFRESH_TOKEN_OCULTO***'); }
    console.error('❌ Erro ao enviar para o YouTube:', errorMessage);
    return null;
  }
};
