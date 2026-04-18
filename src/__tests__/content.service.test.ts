import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuiz } from '../content.service.js';
import { generateObject } from 'ai';

// Mock AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

// Mock Ollama provider
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn())
}));

describe('ContentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockQuiz = (tema: string) => ({
    tema,
    pergunta: 'P',
    opcoes: { A: '1', B: '2', C: '3', D: '4' },
    resposta_correta: 'A',
    fato_curioso: 'Fato.'
  });

  const mockGenerateObjectResponse = (mockQuiz: any) => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockQuiz,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      warnings: []
    } as any);
  };

  it('deve usar o tópico default "geral" se a lista de tópicos falhar', async () => {
    // Math.random sempre retornará 1 para este teste, assim testando o "|| 'geral'" se o array out-of-bounds mockado
    vi.spyOn(Math, 'random').mockReturnValueOnce(1); // 1 * length = length (out of bounds for array indexing)

    mockGenerateObjectResponse(createMockQuiz('geral'));

    const quiz = await generateQuiz();
    expect(quiz.tema).toBe('geral');
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Gere um quiz sobre geral.'
      })
    );

    vi.restoreAllMocks();
  });

  it('deve gerar um quiz com a estrutura correta usando AI SDK', async () => {
    const mockQuiz = {
      ...createMockQuiz('jogos'),
      pergunta: 'Quem é o protagonista de Zelda?',
      opcoes: { A: 'Zelda', B: 'Link', C: 'Ganon', D: 'Epona' },
      resposta_correta: 'B'
    };

    mockGenerateObjectResponse(mockQuiz);

    const quiz = await generateQuiz();
    
    expect(quiz.tema).toBe('jogos');
    expect(quiz.resposta_correta).toBe('B');
    expect(generateObject).toHaveBeenCalled();
  });

  it('deve preencher o tema se o modelo retornar vazio', async () => {
    mockGenerateObjectResponse(createMockQuiz(''));

    const quiz = await generateQuiz();
    expect(quiz.tema).toBeDefined();
    expect(quiz.tema.length).toBeGreaterThan(0);
  });

  it('deve manter o tema se o modelo retornar preenchido', async () => {
    mockGenerateObjectResponse(createMockQuiz('TEMA_PREENCHIDO'));

    const quiz = await generateQuiz();
    expect(quiz.tema).toBe('TEMA_PREENCHIDO');
  });

  it('deve lançar erro se o AI SDK falhar', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateQuiz()).rejects.toThrow('Falha na geração de conteúdo: AI Error');
    expect(consoleSpy).toHaveBeenCalledWith('❌ Erro na geração de conteúdo via AI SDK:', 'AI Error');

    consoleSpy.mockRestore();
  });

  it('deve usar o error original se não houver error.message', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce('String Error');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(generateQuiz()).rejects.toThrow('Falha na geração de conteúdo: undefined');
    expect(consoleSpy).toHaveBeenCalledWith('❌ Erro na geração de conteúdo via AI SDK:', 'String Error');

    consoleSpy.mockRestore();
  });
});
