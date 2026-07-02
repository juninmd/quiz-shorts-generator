import { google } from 'googleapis';
import fs from 'fs';
<<<<<<< Updated upstream
import dotenv from 'dotenv';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { Quiz } from './content.service.js';
import { redactSecrets } from './utils.service.js';

dotenv.config();

const getOllamaClient = () => {
  const host = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  return createOllama({
    baseURL: `${host}/api`,
  });
};

const youtubeMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
});
=======
import { generateText } from 'ai';
import type { Quiz } from './domain/quiz.js';
import { getAIModel } from './ai-client.js';
>>>>>>> Stashed changes

export type YoutubeMetadata = z.infer<typeof youtubeMetadataSchema>;

export const generateYoutubeMetadata = async (quiz: Quiz): Promise<YoutubeMetadata> => {
  const isEnabled = process.env.ENABLE_YOUTUBE === 'true';

  if (!isEnabled) {
    return {
      title: `Quiz: ${quiz.tema}!`,
      description: `Teste seus conhecimentos! #quiz #shorts #curiosidades`
    };
  }

<<<<<<< Updated upstream
  let modelName = 'gemma4:e4b';
  if (process.env.AI_MODEL) {
    modelName = process.env.AI_MODEL;
  } else if (process.env.OLLAMA_MODEL) {
    modelName = process.env.OLLAMA_MODEL;
  }
  const channelInfo = process.env.YOUTUBE_CHANNEL_NAME ? ` do canal ${process.env.YOUTUBE_CHANNEL_NAME}` : '';

  const systemPrompt = `Você é um especialista em SEO para YouTube Shorts.
    Crie títulos chamativos (máx 60 caracteres) e descrições curtas e engajadoras (máx 3 frases).
    Sempre inclua as hashtags #quiz #shorts #curiosidades.
    Língua: Português do Brasil.`;

  try {
    const ollama = getOllamaClient();
    const { object } = await generateObject({
      model: ollama(modelName),
      schema: youtubeMetadataSchema,
      system: systemPrompt,
      prompt: `Crie metadados para um vídeo do YouTube Shorts${channelInfo} sobre:
        Tema: ${quiz.tema}
        Pergunta: ${quiz.pergunta}
        Fato Curioso: ${quiz.fato_curioso}`,
    });

    return object;
=======
  const channelInfo = process.env.YOUTUBE_CHANNEL_NAME ? ` do canal ${process.env.YOUTUBE_CHANNEL_NAME}` : '';

  const prompt = `Crie um título e uma descrição para um vídeo do YouTube Shorts${channelInfo} sobre o seguinte quiz:
Tema: ${quiz.tema}
Pergunta: ${quiz.pergunta}
Fato Curioso: ${quiz.fato_curioso}

O título deve ser chamativo, com no máximo 60 caracteres, e incluir emojis.
A descrição deve ser curta, engajadora, ter no máximo 3 frases, e incluir as hashtags #quiz #shorts #curiosidades.
Responda APENAS com um objeto JSON no formato:
{"title":"...","description":"..."}
O texto deve estar em Português do Brasil.`;

  try {
    const { text } = await generateText({ model: getAIModel(), prompt });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const metadata = JSON.parse(jsonMatch[0]);
      return {
        title: metadata.title || `Quiz: ${quiz.tema}!`,
        description: metadata.description || `#quiz #shorts #curiosidades`
      };
    }
    return { title: `Quiz: ${quiz.tema}!`, description: `#quiz #shorts #curiosidades` };
>>>>>>> Stashed changes
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
  description: string,
  options?: { privacyStatus?: 'public' | 'private' | 'unlisted' }
): Promise<string | null> => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (process.env.ENABLE_YOUTUBE !== 'true') {
    console.log('⏩ Upload para o YouTube desativado (ENABLE_YOUTUBE=false).');
    return null;
  }

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('⚠️ Credenciais do YouTube ausentes no .env. Pulando upload.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  console.log(`📤 Fazendo upload de ${videoPath} para o YouTube...`);

  try {
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['quiz', 'shorts', 'curiosidades'],
          categoryId: '27',
        },
        status: {
          privacyStatus: options?.privacyStatus ?? 'public',
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
    console.error('❌ Erro ao enviar para o YouTube:', redactSecrets(error.message || String(error)));
    return null;
  }
};
