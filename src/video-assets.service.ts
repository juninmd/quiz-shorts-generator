import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { Quiz } from './content.service';

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
  if (currentLine) lines.push(currentLine.trim());
  return lines.join('\n');
};

export const normalizePath = (p: string) => path.resolve(p).replace(/\\/g, '/');
export const rel = (p: string) => path.relative(process.cwd(), p).replace(/\\/g, '/');
export const esc = (p: string) => rel(p).replace(/([:])/g, '\\$1');

export const ensureFont = (): string => {
  const fontFile = 'assets/fonts/arialbd.ttf';
  if (!fs.existsSync(fontFile)) {
    fs.mkdirSync('assets/fonts', { recursive: true });
    const tryCopy = (src: string) => {
      try {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, fontFile);
          return true;
        }
      } catch (e) { console.warn(`⚠️ Falha ao copiar a fonte de ${src}:`, e); }
      return false;
    };

    let copied = false;
    if (process.platform === 'win32') {
      copied = tryCopy('C:/Windows/Fonts/arialbd.ttf');
      if (!copied) {
        try {
          execSync(`cmd /c copy C:\\Windows\\Fonts\\arialbd.ttf assets\\fonts\\arialbd.ttf`);
          copied = true;
        } catch (e) { console.warn('⚠️ O comando de cópia via shell falhou:', e); }
      }
    } else {
      copied = tryCopy('/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf');
      if (!copied) {
        const candidates = [
          '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
          '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
        ];
        for (const c of candidates) {
          if (tryCopy(c)) {
            copied = true;
            break;
          }
        }
      }
    }
    if (!copied) console.warn('⚠️ Não foi possível copiar automaticamente a fonte Arial.');
  }
  return fontFile;
};

export const prepareBackground = (tempDir: string): string => {
  const bgFiles = fs.existsSync('assets/backgrounds') ? fs.readdirSync('assets/backgrounds').filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.mp4')) : [];
  const bgSelected = bgFiles.length > 0 ? bgFiles[Math.floor(Math.random() * bgFiles.length)] : undefined;
  let bgVideo = bgSelected ? path.resolve('assets/backgrounds', bgSelected) : '';

  if (!bgVideo) {
    bgVideo = path.join(tempDir, 'bg_default.jpg');
    if (!fs.existsSync(bgVideo)) {
      spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=darkblue:s=1080x1920:d=1', '-frames:v', '1', normalizePath(bgVideo)]);
    }
  }
  return bgVideo;
};

export const prepareTextFiles = (quiz: Quiz, tempDir: string): { qTxtPath: string, optTxtPaths: Record<string, string> } => {
  const qTxtPath = path.join(tempDir, 'q.txt');
  fs.writeFileSync(qTxtPath, wrapText(quiz.pergunta, 30));

  const optTxtPaths: Record<string, string> = {};
  for (const opt of ['A', 'B', 'C', 'D']) {
    const p = path.join(tempDir, `opt${opt}.txt`);
    fs.writeFileSync(p, wrapText(`${opt}) ${quiz.opcoes[opt as keyof typeof quiz.opcoes]}`, 40));
    optTxtPaths[opt] = p;
  }
  return { qTxtPath, optTxtPaths };
};
