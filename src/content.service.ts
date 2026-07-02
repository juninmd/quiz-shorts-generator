import { generateObject } from 'ai';
<<<<<<< Updated upstream
import { z } from 'zod';
import dotenv from 'dotenv';
import { randomInt } from 'node:crypto';
=======
import { quizSchema, type Quiz } from './domain/quiz.js';
import { getAIModel } from './ai-client.js';
>>>>>>> Stashed changes

export type { Quiz } from './domain/quiz.js';

export const generateQuiz = async (): Promise<Quiz> => {
  const topics = ['jogos', 'filmes', 'séries', 'animes', 'curiosidades gerais', 'bíblia', 'história', 'ciência'];
  // We use type assertion since randomInt is guaranteed to return a valid index, preventing the need for an uncovered fallback branch
  const topic = topics[randomInt(0, topics.length)] as string;

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
    const { object } = await generateObject({
      model: getAIModel(),
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
    console.error('❌ Erro na geração de conteúdo:', error.message || error);
    throw new Error(`Falha na geração de conteúdo: ${error.message}`);
  }
};
