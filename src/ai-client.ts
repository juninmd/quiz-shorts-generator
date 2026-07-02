import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-lite-001';

export const getAIModel = (): LanguageModelV1 => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const client = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  return client(model);
};
