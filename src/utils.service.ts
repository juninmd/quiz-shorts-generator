import dotenv from 'dotenv';

dotenv.config();

/**
 * Redaciona segredos conhecidos (tokens, IDs) de uma string para evitar vazamento em logs.
 */
export const redactSecrets = (message: string): string => {
  let redacted = message;
  const secrets = [
    process.env.TELEGRAM_TOKEN,
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REFRESH_TOKEN,
  ];

  for (const secret of secrets) {
    if (secret && secret.length > 5) {
      const regex = new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      redacted = redacted.replace(regex, '***SEGREDO_OCULTO***');
    }
  }

  return redacted;
};
