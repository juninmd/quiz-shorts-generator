import { describe, it, expect, vi } from 'vitest';
import { generateQuiz } from '../content.service';

// Mock do generateObject do Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
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
    }
  })
}));

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
