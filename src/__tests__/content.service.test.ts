import { describe, it, expect, vi } from 'vitest';
import { generateQuiz } from '../content.service.js';

// Mock do Ollama chat
vi.mock('ollama', () => {
  // simulate a class with a chat method
  const chatMock = vi.fn().mockResolvedValue({
    message: {
      content: JSON.stringify({
        tema: 'jogos',
        pergunta: 'Quem é o protagonista de The Legend of Zelda?',
        opcoes: {
          A: 'Zelda',
          B: 'Link',
          C: 'Ganon',
          D: 'Epona'
        },
        resposta_correta: 'B',
        fato_curioso: 'Embora o jogo se chame Zelda, o protagonista é o Link.'
      })
    }
  });

  return {
    Ollama: vi.fn().mockImplementation(() => ({ chat: chatMock }))
  };
});

describe('ContentService', () => {
  it('deve gerar um quiz com a estrutura correta', async () => {
    const quiz = await generateQuiz();

    expect(quiz).toHaveProperty('tema');
    expect(quiz).toHaveProperty('pergunta');
    expect(quiz.opcoes).toHaveProperty('A');
    expect(quiz.opcoes).toHaveProperty('B');
    expect(quiz.opcoes).toHaveProperty('C');
    expect(quiz.opcoes).toHaveProperty('D');
    expect(['A', 'B', 'C', 'D']).toContain(quiz.resposta_correta);
    expect(quiz).toHaveProperty('fato_curioso');
  });
});
