import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { Quiz } from './content.service.js';
import type { WordTimestamp } from './tts.service.js';
import { ensureFont, prepareBackground, prepareTextFiles, normalizePath } from './video-assets.service.js';
import { generateFilters } from './video-filters.service.js';
import { runFFmpeg } from './video-ffmpeg.service.js';
import { execAsync } from './utils/exec.js';

const getDuration = async (filePath: string): Promise<number> => {
  const result = await execAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ]);
  return parseFloat(result.stdout.trim());
};

export const assembleVideo = async (
  quiz: Quiz,
  audioData: { qPath: string; aPath: string; qWords: WordTimestamp[]; aWords: WordTimestamp[] },
  outputPath: string = 'final_short.mp4'
): Promise<string> => {
  const tempDir = path.resolve('temp_assets');
  if (!fs.existsSync(tempDir)) {
    await fsPromises.mkdir(tempDir, { recursive: true });
  }

  console.log(`🎬 Montando vídeo completo...`);

  try {
    const qPath = normalizePath(audioData.qPath);
    const aPath = normalizePath(audioData.aPath);

    // Executa ffprobes e preparações de assets em paralelo
    const [qDur, aDur, fontFile, bgVideo, textFiles] = await Promise.all([
      getDuration(qPath),
      getDuration(aPath),
      ensureFont(),
      prepareBackground(tempDir),
      prepareTextFiles(quiz, tempDir)
    ]);

    const { qTxtPath, optTxtPaths } = textFiles;
    const totalSeconds = qDur + aDur + 5;

    const musicDir = path.resolve('assets/music');
    let musicPath = '';
    if (fs.existsSync(musicDir)) {
      const files = await fsPromises.readdir(musicDir);
      const musicFiles = files.filter(f => f.startsWith('background') && f.endsWith('.mp3'));
      if (musicFiles.length > 0) {
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)] as string;
        musicPath = normalizePath(path.join('assets/music', randomMusic));
        console.log(`🎵 Usando música de fundo: ${randomMusic}`);
      }
    }

    const beepPath = normalizePath('assets/music/beep.mp3');
    const logoPath = normalizePath('assets/logo/logo.png');
    const hasMusic = musicPath !== '' && fs.existsSync(musicPath);
    const hasBeep = fs.existsSync(beepPath);
    const hasLogo = fs.existsSync(logoPath);

    const { ffmpegInputs, filterComplex } = generateFilters(
      quiz, bgVideo, qPath, aPath, qDur, fontFile, qTxtPath, optTxtPaths,
      hasMusic, hasBeep, hasLogo, musicPath, beepPath, logoPath
    );

    await runFFmpeg(ffmpegInputs, filterComplex, outputPath, totalSeconds);

    return outputPath;
  } catch (err: any) {
    console.error('❌ Erro na montagem do vídeo:', err.message);
    throw err;
  }
};
