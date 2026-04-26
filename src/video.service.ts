import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { Quiz } from './content.service.js';
import type { WordTimestamp } from './tts.service.js';
import { ensureFont, prepareBackground, prepareTextFiles, normalizePath } from './video-assets.service.js';
import { generateFilters } from './video-filters.service.js';
import { runFFmpeg } from './video-ffmpeg.service.js';

export const assembleVideo = async (
  quiz: Quiz,
  audioData: { qPath: string; aPath: string; qWords: WordTimestamp[]; aWords: WordTimestamp[] },
  outputPath: string = 'final_short.mp4'
): Promise<string> => {
  const tempDir = path.resolve('temp_assets');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  console.log(`🎬 Montando vídeo completo...`);

  try {
    const fontFile = ensureFont();
    const qPath = normalizePath(audioData.qPath);
    const aPath = normalizePath(audioData.aPath);
    const qDur = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', qPath]).stdout.toString().trim()); // NOSONAR
    const aDur = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', aPath]).stdout.toString().trim()); // NOSONAR

    const totalSeconds = qDur + aDur + 5;

    const musicDir = path.resolve('assets/music');
    let musicPath = '';
    if (fs.existsSync(musicDir)) {
      const musicFiles = fs.readdirSync(musicDir).filter(f => f.startsWith('background') && f.endsWith('.mp3'));
      if (musicFiles.length > 0) {
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)] as string;
        musicPath = normalizePath(path.join('assets/music', randomMusic));
        console.log(`🎵 Usando música de fundo: ${randomMusic}`);
      }
    }

    const beepPath = normalizePath('assets/music/beep.mp3');
    const logoPath = normalizePath('assets/logo/logo.png');
    const hasMusic = fs.existsSync(musicPath) && musicPath !== '';
    const hasBeep = fs.existsSync(beepPath);
    const hasLogo = fs.existsSync(logoPath);

    const bgVideo = prepareBackground(tempDir);
    const { qTxtPath, optTxtPaths } = prepareTextFiles(quiz, tempDir);

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
