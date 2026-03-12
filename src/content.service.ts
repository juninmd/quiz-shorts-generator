import ollama from 'ollama';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
  const modelName = process.env.OLLAMA_MODEL || 'qwen3:8b';
  const topics = ['jogos', 'filmes', 'séries', 'animes', 'curiosidades gerais', 'bíblia'];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  console.log(`🤖 Usando biblioteca oficial Ollama com modelo: ${modelName}`);

  const prompt = `Gere um quiz educativo sobre o tema: ${topic}. 
    Seja um verificador de fatos rigoroso. 
    Garanta precisão histórica/técnica e um fato curioso que valide a resposta. 
    As frases devem ser muito curtas e diretas, pois o vídeo terá no máximo 1 minuto.
    A pergunta deve ser bem curta e as opções devem ter poucas palavras.
    O fato curioso também deve ser breve.
    Responda APENAS com um objeto JSON no formato:
    {
        "tema": "${topic}",
        "pergunta": "...",
        "opcoes": {"A": "...", "B": "...", "C": "...", "D": "..."},
        "resposta_correta": "A",
        "fato_curioso": "..."
    }
    O texto deve estar em Português do Brasil.`;

  try {
    const response = await ollama.chat({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      format: 'json', // Força o Ollama a responder em JSON
    });

    const content = response.message.content;
    
    // Limpa possíveis blocos de código markdown do JSON
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.substring(7, cleanContent.lastIndexOf('```')).trim();
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.substring(3, cleanContent.lastIndexOf('```')).trim();
    }

    const quizData = JSON.parse(cleanContent);
    
    // Valida com Zod
    return quizSchema.parse(quizData);
  } catch (error: any) {
    console.error('❌ Erro na biblioteca Ollama:', error.message || error);
    throw new Error('Falha na geração de conteúdo via Ollama.');
  }
};
