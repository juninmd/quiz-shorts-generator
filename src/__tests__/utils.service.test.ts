import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { redactSecrets } from '../utils.service.js';

describe('UtilsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve redacionar segredos conhecidos da mensagem', () => {
    process.env.TELEGRAM_TOKEN = 'meu_token_secreto';
    process.env.YOUTUBE_CLIENT_ID = 'meu_client_id';

    const message = 'Erro ao usar meu_token_secreto e meu_client_id no sistema.';
    const result = redactSecrets(message);

    expect(result).toBe('Erro ao usar ***SEGREDO_OCULTO*** e ***SEGREDO_OCULTO*** no sistema.');
  });

  it('não deve redacionar se o segredo for muito curto (evitar falsos positivos)', () => {
    process.env.TELEGRAM_TOKEN = '123';
    const message = 'O numero 123 nao deve sumir.';
    const result = redactSecrets(message);
    expect(result).toBe('O numero 123 nao deve sumir.');
  });

  it('deve lidar com segredos ausentes no env', () => {
    delete process.env.TELEGRAM_TOKEN;
    const message = 'Mensagem normal.';
    const result = redactSecrets(message);
    expect(result).toBe('Mensagem normal.');
  });

  it('deve escapar caracteres especiais no regex', () => {
    process.env.TELEGRAM_TOKEN = 'token.com*especial';
    const message = 'O token.com*especial falhou.';
    const result = redactSecrets(message);
    expect(result).toBe('O ***SEGREDO_OCULTO*** falhou.');
  });
});
