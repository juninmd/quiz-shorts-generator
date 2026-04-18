import { createOllama } from 'ollama-ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const getOllamaClient = () => {
    const host = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://ollama.ai.svc.cluster.local:11434';
    return createOllama({
        baseURL: `${host}/api`,
    });
};

const quizSchema = z.object({
  tema: z.string(),
  pergunta: z.string(),
  opcoes: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  resposta_correta: z.enum(['A', 'B', 'C', 'D']),
  fato_curioso: z.string(),
});

export type Quiz = z.infer<typeof quizSchema>;

export const generateQuiz = async (): Promise<Quiz> => {
  const modelName = process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'gemma4:e4b';
  const topics = ['jogos', 'filmes', 'séries', 'animes', 'curiosidades gerais', 'bíblia', 'história', 'ciência'];
  const topic = topics[Math.floor(Math.random() * topics.length)] || 'geral';

  console.log(`🤖 Usando AI SDK com Ollama modelo: ${modelName}`);

  const systemPrompt = `Você é um gerador de quizzes educativos extremamente rigoroso e preciso.
    O tema selecionado é: ${topic}.
    Regras Críticas:
    1. Verifique os fatos rigorosamente. Sem alucinações.
    2. Os textos DEVEM ser extremamente curtos e diretos (Shorts).
    3. Pergunta: máx 45 caracteres.
    4. Opções: máx 15 caracteres cada.
    5. Fato curioso: máx 60 caracteres (deve validar a resposta).
    6. Língua: Português do Brasil.`;

  try {
    const ollama = getOllamaClient();
    const { object } = await generateObject({
      model: ollama(modelName),
      schema: quizSchema,
      prompt: `Gere um quiz sobre ${topic}.`,
      system: systemPrompt,
    });

    const quizResult = object as Quiz;
    if (!quizResult.tema) {
      quizResult.tema = topic;
    }

    return quizResult;
  } catch (error: any) {
    console.error('❌ Erro na geração de conteúdo via AI SDK:', error.message || error);
    throw new Error(`Falha na geração de conteúdo: ${error.message}`);
  }
};
