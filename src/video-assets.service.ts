import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { Quiz } from './content.service.js';
import { execAsync } from './utils/exec.js';

export const wrapText = (text: string, maxLen: number): string => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + word).length > maxLen) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  return lines.join('\n');
};

export const normalizePath = (p: string) => path.resolve(p).replace(/\\/g, '/');
export const rel = (p: string) => path.relative(process.cwd(), p).replace(/\\/g, '/');
export const esc = (p: string) => rel(p).replace(/([:])/g, '\\$1');

export const ensureFont = async (): Promise<string> => {
  const fontFile = 'assets/fonts/arialbd.ttf';
  if (!fs.existsSync(fontFile)) {
    await fsPromises.mkdir('assets/fonts', { recursive: true });
    const tryCopy = async (src: string) => {
      try {
        if (fs.existsSync(src)) {
          await fsPromises.copyFile(src, fontFile);
          return true;
        }
      } catch (e) {
        console.warn(`⚠️ Falha ao copiar a fonte de ${src}:`, e);
      }
      return false;
    };

    let copied = false;
    if (process.platform === 'win32') {
      copied = await tryCopy('C:/Windows/Fonts/arialbd.ttf');
    } else {
      copied = await tryCopy('/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf');
      if (!copied) {
        const candidates = [
          '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
          '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
        ];
        for (const c of candidates) {
          if (await tryCopy(c)) {
            copied = true;
            break;
          }
        }
      }
    }
    if (!copied) {
      console.warn('⚠️ Não foi possível copiar automaticamente a fonte Arial.');
    }
  }
  return fontFile;
};

export const prepareBackground = async (tempDir: string): Promise<string> => {
  let bgVideo = path.resolve('assets/backgrounds/neon.png');

  if (!fs.existsSync(bgVideo)) {
    bgVideo = path.join(tempDir, 'bg_default.jpg');
    if (!fs.existsSync(bgVideo)) {
      await execAsync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=darkblue:s=1080x1920:d=1', '-frames:v', '1', normalizePath(bgVideo)]);
    }
  }
  return bgVideo;
};

export const prepareTextFiles = async (quiz: Quiz, tempDir: string): Promise<{ qTxtPath: string, optTxtPaths: Record<string, string> }> => {
  const qTxtPath = path.join(tempDir, 'q.txt');
  await fsPromises.writeFile(qTxtPath, wrapText(quiz.pergunta, 30));

  const optTxtPaths: Record<string, string> = {};
  for (const opt of ['A', 'B', 'C', 'D']) {
    const p = path.join(tempDir, `opt${opt}.txt`);
    await fsPromises.writeFile(p, wrapText(`${opt}) ${quiz.opcoes[opt as keyof typeof quiz.opcoes]}`, 40));
    optTxtPaths[opt] = p;
  }
  return { qTxtPath, optTxtPaths };
};
