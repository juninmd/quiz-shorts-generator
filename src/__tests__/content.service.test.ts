import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuiz } from '../content.service.js';
import { Ollama } from 'ollama';

// We mock the ollama module so we can control what the chat method returns
vi.mock('ollama', () => {
  const chatMock = vi.fn();
  return {
    Ollama: vi.fn().mockImplementation(() => ({ chat: chatMock }))
  };
});

describe('ContentService', () => {
  let chatMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-get the mocked instance's chat method so we can adjust its resolved value per test
    const ollamaInstance = new Ollama({ host: 'dummy' });
    chatMock = ollamaInstance.chat;

    // Default valid response
    chatMock.mockResolvedValue({
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
  });

  it('deve gerar um quiz com a estrutura correta (JSON limpo)', async () => {
    const quiz = await generateQuiz();
    expect(quiz).toHaveProperty('tema');
    expect(quiz).toHaveProperty('pergunta');
    expect(quiz.opcoes).toHaveProperty('A');
    expect(quiz.resposta_correta).toBe('B');
  });

  it('deve limpar tags ```json e retornar quiz', async () => {
    chatMock.mockResolvedValueOnce({
      message: {
        content: `\`\`\`json
{
  "tema": "filmes",
  "pergunta": "Qual filme ganhou o Oscar?",
  "opcoes": { "A": "Titanic", "B": "Avatar", "C": "Matrix", "D": "Shrek" },
  "resposta_correta": "A",
  "fato_curioso": "Fato."
}
\`\`\``
      }
    });

    const quiz = await generateQuiz();
    expect(quiz.tema).toBe('filmes');
    expect(quiz.resposta_correta).toBe('A');
  });

  it('deve limpar tags ``` (sem json) e retornar quiz', async () => {
    chatMock.mockResolvedValueOnce({
      message: {
        content: `\`\`\`
{
  "tema": "séries",
  "pergunta": "Série famosa?",
  "opcoes": { "A": "Lost", "B": "Dark", "C": "Friends", "D": "Fringe" },
  "resposta_correta": "C",
  "fato_curioso": "Fato."
}
\`\`\``
      }
    });

    const quiz = await generateQuiz();
    expect(quiz.tema).toBe('séries');
  });

  it('deve extrair json se houver lixo ao redor', async () => {
    chatMock.mockResolvedValueOnce({
      message: {
        content: `Aqui está o quiz solicitado:
{
  "tema": "animes",
  "pergunta": "Qual o melhor?",
  "opcoes": { "A": "Naruto", "B": "DBZ", "C": "One Piece", "D": "Bleach" },
  "resposta_correta": "C",
  "fato_curioso": "Muito longo."
}
Espero que goste!`
      }
    });

    const quiz = await generateQuiz();
    expect(quiz.tema).toBe('animes');
  });

  it('deve preencher o tema se vier faltando', async () => {
    chatMock.mockResolvedValueOnce({
      message: {
        content: JSON.stringify({
          // Sem tema
          pergunta: "Pergunta sem tema?",
          opcoes: { "A": "1", "B": "2", "C": "3", "D": "4" },
          resposta_correta: "A",
          fato_curioso: "Curioso."
        })
      }
    });

    const quiz = await generateQuiz();
    expect(quiz.tema).toBeDefined(); // Deve pegar o tópico default gerado no service
  });

  it('deve lançar erro se a chamada do Ollama falhar', async () => {
    chatMock.mockRejectedValueOnce(new Error('Network Error'));

    // Silencia console.error para este teste
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateQuiz()).rejects.toThrow('Falha na geração de conteúdo via Ollama.');
    expect(consoleSpy).toHaveBeenCalledWith('❌ Erro no processamento do conteúdo Ollama:', 'Network Error');

    consoleSpy.mockRestore();
  });

  it('deve logar erros detalhados do Zod e lançar erro de falha geral', async () => {
    // Retorna JSON que não respeita o schema do zod (faltando fato_curioso)
    chatMock.mockResolvedValueOnce({
      message: {
        content: JSON.stringify({
          tema: "teste",
          pergunta: "teste?",
          opcoes: { "A": "1", "B": "2", "C": "3", "D": "4" },
          resposta_correta: "A"
          // falta fato_curioso
        })
      }
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateQuiz()).rejects.toThrow('Falha na geração de conteúdo via Ollama.');

    // Zod Error logged
    expect(consoleSpy).toHaveBeenCalledWith('Detalhamento da validação:', expect.any(String));

    consoleSpy.mockRestore();
  });

  it('deve lançar erro e logar o fallback do erro (quando error.message for nulo)', async () => {
    chatMock.mockRejectedValueOnce('Apenas uma string');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateQuiz()).rejects.toThrow('Falha na geração de conteúdo via Ollama.');
    expect(consoleSpy).toHaveBeenCalledWith('❌ Erro no processamento do conteúdo Ollama:', 'Apenas uma string');

    consoleSpy.mockRestore();
  });
});
