import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { Quiz } from './content.service';
import type { WordTimestamp } from './tts.service';

const wrapText = (text: string, maxLen: number): string => {
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

export const assembleVideo = async (
  quiz: Quiz,
  audioData: { qPath: string; aPath: string; qWords: WordTimestamp[]; aWords: WordTimestamp[] },
  outputPath: string = 'final_short.mp4'
): Promise<string> => {
  const tempDir = path.resolve('temp_assets');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  console.log(`🎬 Montando vídeo completo...`);

  try {
    const normalizePath = (p: string) => path.resolve(p).replace(/\\/g, '/');
    const rel = (p: string) => path.relative(process.cwd(), p).replace(/\\/g, '/');
    const esc = (p: string) => rel(p).replace(/([:])/g, '\\$1');

    const fontFile = 'assets/fonts/arialbd.ttf';
    if (!fs.existsSync(fontFile)) {
        fs.mkdirSync('assets/fonts', { recursive: true });
        try {
            fs.copyFileSync('C:/Windows/Fonts/arialbd.ttf', fontFile);
        } catch (e) {
            console.warn('⚠️ Não foi possível copiar a fonte automaticamente, tentando via shell...');
            execSync(`cmd /c copy C:\\Windows\\Fonts\\arialbd.ttf assets\\fonts\\arialbd.ttf`);
        }
    }

    const qPath = normalizePath(audioData.qPath);
    const aPath = normalizePath(audioData.aPath);
    const qDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${qPath}"`).toString().trim());

    const musicPath = normalizePath('assets/music/background.mp3');
    const beepPath = normalizePath('assets/music/beep.mp3');
    const hasMusic = fs.existsSync(musicPath);
    const hasBeep = fs.existsSync(beepPath);

    const bgFiles = fs.existsSync('assets/backgrounds') ? fs.readdirSync('assets/backgrounds').filter(f => f.endsWith('.png') || f.endsWith('.jpg')) : [];
    const bgSelected = bgFiles.length > 0 ? bgFiles[Math.floor(Math.random() * bgFiles.length)] : undefined;
    let bgVideo = bgSelected ? path.resolve('assets/backgrounds', bgSelected) : '';
    
    if (!bgVideo) {
      bgVideo = path.join(tempDir, 'bg_black.jpg');
      if (!fs.existsSync(bgVideo)) {
        execSync(`ffmpeg -y -f lavfi -i color=c=black:s=1080x1920:d=1 -frames:v 1 "${normalizePath(bgVideo)}"`);
      }
    }

    const qTxtPath = path.join(tempDir, 'q.txt');
    fs.writeFileSync(qTxtPath, wrapText(quiz.pergunta, 35));

    const optTxtPaths: Record<string, string> = {};
    for (const opt of ['A', 'B', 'C', 'D']) {
      const p = path.join(tempDir, `opt${opt}.txt`);
      fs.writeFileSync(p, wrapText(`${opt}) ${quiz.opcoes[opt as keyof typeof quiz.opcoes]}`, 40));
      optTxtPaths[opt] = p;
    }

    const filters: string[] = [];
    filters.push(`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]`);

    let vC = 'v0';
    let vI = 1;

    // Filters de Vídeo
    filters.push(`[${vC}]drawtext=textfile='${esc(qTxtPath)}':fontfile='${fontFile}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=300:bordercolor=black:borderw=4[v${vI}]`);
    vC = `v${vI++}`;

    const optY: Record<string, number> = { A: 700, B: 850, C: 1000, D: 1150 };
    for (const opt of ['A', 'B', 'C', 'D']) {
      if (optTxtPaths[opt]) {
        filters.push(`[${vC}]drawtext=textfile='${esc(optTxtPaths[opt])}':fontfile='${fontFile}':fontcolor=white:fontsize=50:x=100:y=${optY[opt]}:bordercolor=black:borderw=3[v${vI}]`);
        vC = `v${vI++}`;
      }
    }

    for (let i = 0; i < 5; i++) {
        filters.push(`[${vC}]drawtext=text='${5 - i}':fontfile='${fontFile}':fontcolor=yellow:fontsize=150:x=(w-text_w)/2:y=1400:bordercolor=black:borderw=5:enable='between(t,${qDur + i},${qDur + i + 1})'[v${vI}]`);
        vC = `v${vI++}`;
    }

    const correct = quiz.resposta_correta as keyof typeof optTxtPaths;
    if (optTxtPaths[correct]) {
        filters.push(`[${vC}]drawtext=textfile='${esc(optTxtPaths[correct])}':fontfile='${fontFile}':fontcolor=green:fontsize=50:x=100:y=${optY[correct]}:bordercolor=black:borderw=3:enable='gte(t,${qDur + 5})'[vout]`);
    } else {
        filters.push(`[${vC}]copy[vout]`);
    }

    // Filters de Áudio
    let curA = '[1:a]apad=pad_dur=5[qp]';
    let lastA = '[qp]';
    let inI = 3;

    if (hasBeep) {
        for (let i = 0; i < 5; i++) {
            const d = Math.round((qDur + i) * 1000);
            curA += `;[${inI}:a]adelay=${d}|${d}[b${i}];${lastA}[b${i}]amix=inputs=2:dropout_transition=0:normalize=0[m${i}]`;
            lastA = `[m${i}]`;
        }
        inI++;
    }

    curA += `;${lastA}[qr];[qr][2:a]concat=n=2:v=0:a=1[base]`;
    
    if (hasMusic) {
        curA += `;[${inI}:a]aloop=loop=-1:size=2e9,volume=0.1[bgm];[base][bgm]amix=inputs=2:duration=shortest[aout]`;
    } else {
        curA += `;[base]volume=1.0[aout]`;
    }
    filters.push(curA);

    const isImg = bgVideo.toLowerCase().match(/\.(jpg|png)$/);
    const args = [
        '-y', ...(isImg ? ['-loop', '1', '-framerate', '30'] : []),
        '-i', normalizePath(bgVideo), '-i', qPath, '-i', aPath
    ];
    if (hasBeep) args.push('-i', normalizePath(beepPath));
    if (hasMusic) args.push('-i', normalizePath(musicPath));
    args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '[aout]');
    args.push('-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p', '-shortest', normalizePath(outputPath));

    console.log(`🎥 Processando FFmpeg... (Fundo: ${bgSelected || 'Padrão'})`);
    const res = spawnSync('ffmpeg', args, { stdio: 'pipe' });

    if (res.status !== 0) {
        const errLog = res.stderr?.toString() || 'Unknown FFmpeg Error';
        console.error('❌ Erro FFmpeg Detalhado:', errLog);
        fs.writeFileSync(path.join(tempDir, 'ffmpeg_error.log'), errLog);
        throw new Error(`FFmpeg falhou com status ${res.status}`);
    }

    console.log(`✅ Vídeo gerado com sucesso: ${outputPath}`);
    return outputPath;
  } catch (err: any) {
    console.error('❌ Erro na montagem do vídeo:', err.message);
    throw err;
  }
};
