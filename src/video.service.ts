import { execSync, spawnSync, spawn } from 'child_process';
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

      // on Linux the mscorefonts package installs fonts under /usr/share/fonts
      const tryCopy = (src: string) => {
        try {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, fontFile);
            return true;
          }
        } catch {}
        return false;
      };

      let copied = false;
      if (process.platform === 'win32') {
        copied = tryCopy('C:/Windows/Fonts/arialbd.ttf');
        if (!copied) {
          console.warn('⚠️ Falha ao copiar fonte via API, tentando shell...');
          try {
            execSync(`cmd /c copy C:\\Windows\\Fonts\\arialbd.ttf assets\\fonts\\arialbd.ttf`);
            copied = true;
          } catch {}
        }
      } else {
        // common path for msttcorefonts on Debian/Ubuntu
        copied = tryCopy('/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf');
        if (!copied) {
          // fallback to any Arial variant already installed
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

      if (!copied) {
        console.warn('⚠️ Não foi possível copiar automaticamente a fonte Arial; você pode precisar colocá-la em assets/fonts.');
      }
    }

    const qPath = normalizePath(audioData.qPath);
    const aPath = normalizePath(audioData.aPath);
    const qDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${qPath}"`).toString().trim());
    const aDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${aPath}"`).toString().trim());

    // later we use totalSeconds to estimate %; compute from actual audio lengths + 5 reveal + 5 countdown
    const totalSeconds = aDur + 5; // answer audio determines length (question padded inside filters)

    const musicPath = normalizePath('assets/music/background.mp3');
    const beepPath = normalizePath('assets/music/beep.mp3');
    const logoPath = normalizePath('assets/logo/logo.png');
    const hasMusic = fs.existsSync(musicPath);
    const hasBeep = fs.existsSync(beepPath);
    const hasLogo = fs.existsSync(logoPath);

    const bgFiles = fs.existsSync('assets/backgrounds') ? fs.readdirSync('assets/backgrounds').filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.mp4')) : [];
    const bgSelected = bgFiles.length > 0 ? bgFiles[Math.floor(Math.random() * bgFiles.length)] : undefined;
    let bgVideo = bgSelected ? path.resolve('assets/backgrounds', bgSelected) : '';

    if (!bgVideo) {
      bgVideo = path.join(tempDir, 'bg_default.jpg');
      if (!fs.existsSync(bgVideo)) {
        // Generate a nice dark blue background instead of just black
        execSync(`ffmpeg -y -f lavfi -i color=c=darkblue:s=1080x1920:d=1 -frames:v 1 "${normalizePath(bgVideo)}"`);
      }
    }

    const qTxtPath = path.join(tempDir, 'q.txt');
    fs.writeFileSync(qTxtPath, wrapText(quiz.pergunta, 30));

    const optTxtPaths: Record<string, string> = {};
    for (const opt of ['A', 'B', 'C', 'D']) {
      const p = path.join(tempDir, `opt${opt}.txt`);
      fs.writeFileSync(p, wrapText(`${opt}) ${quiz.opcoes[opt as keyof typeof quiz.opcoes]}`, 40));
      optTxtPaths[opt] = p;
    }

    const isImg = bgVideo.toLowerCase().match(/\.(jpg|png)$/);
    const ffmpegInputs: string[] = [];

    // 0: Background
    if (isImg) {
      ffmpegInputs.push('-loop', '1', '-framerate', '30', '-i', normalizePath(bgVideo));
    } else {
      ffmpegInputs.push('-stream_loop', '-1', '-i', normalizePath(bgVideo));
    }

    // 1: Question Audio, 2: Answer Audio
    ffmpegInputs.push('-i', qPath, '-i', aPath);

    let nextInputIdx = 3;
    let beepIdx = -1;
    let musicIdx = -1;
    let logoIdx = -1;

    if (hasBeep) {
      ffmpegInputs.push('-i', normalizePath(beepPath));
      beepIdx = nextInputIdx++;
    }
    if (hasMusic) {
      ffmpegInputs.push('-i', normalizePath(musicPath));
      musicIdx = nextInputIdx++;
    }
    if (hasLogo) {
      ffmpegInputs.push('-i', normalizePath(logoPath));
      logoIdx = nextInputIdx++;
    }

    const filters: string[] = [];
    filters.push(`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[vbg]`);

    let vC = 'vbg';
    let vI = 1;

    // Overlay Logo
    if (hasLogo && logoIdx !== -1) {
      filters.push(`[${logoIdx}:v]scale=150:-1[logo_scaled]`);
      filters.push(`[${vC}][logo_scaled]overlay=40:40[vlogo]`);
      vC = 'vlogo';
      // Canal Text
      filters.push(`[${vC}]drawtext=text='@akitemquiz':fontfile='${fontFile}':fontcolor=white:fontsize=35:x=200:y=100:bordercolor=black:borderw=2[vcanal]`);
      vC = 'vcanal';
    }

    // Filters de Vídeo
    // Question: Higher (y=380) and narrower (maxLen=30)
    filters.push(`[${vC}]drawtext=textfile='${esc(qTxtPath)}':fontfile='${fontFile}':fontcolor=white:fontsize=55:x=(w-text_w)/2:y=380:bordercolor=black:borderw=4:line_spacing=10[v${vI}]`);
    vC = `v${vI++}`;

    const optY: Record<string, number> = { A: 870, B: 1120, C: 1370, D: 1620 };
    const correct = quiz.resposta_correta as 'A' | 'B' | 'C' | 'D';
    const revealTime = qDur + 5;

    for (const opt of ['A', 'B', 'C', 'D'] as const) {
      if (optTxtPaths[opt]) {
        if (opt === correct) {
          // Render white until reveal
          filters.push(`[${vC}]drawtext=textfile='${esc(optTxtPaths[opt])}':fontfile='${fontFile}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=${optY[opt]}:bordercolor=black:borderw=3:enable='lt(t,${revealTime})'[v${vI}]`);
          vC = `v${vI++}`;
          // Render green after reveal - MARCA A RESPOSTA CORRETA VISUALMENTE com texto verde e fundo amarelo (box)
          filters.push(`[${vC}]drawtext=textfile='${esc(optTxtPaths[opt])}':fontfile='${fontFile}':fontcolor=green:fontsize=48:x=(w-text_w)/2:y=${optY[opt]}:bordercolor=black:borderw=3:box=1:boxcolor=yellow@0.8:boxborderw=10:enable='gte(t,${revealTime})'[v${vI}]`);
          vC = `v${vI++}`;
        } else {
          // Normal white option
          filters.push(`[${vC}]drawtext=textfile='${esc(optTxtPaths[opt])}':fontfile='${fontFile}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=${optY[opt]}:bordercolor=black:borderw=3[v${vI}]`);
          vC = `v${vI++}`;
        }
      }
    }

    // TIMER DE ALGUNS SEGUNDOS (5 segundos)
    for (let i = 0; i < 5; i++) {
      filters.push(`[${vC}]drawtext=text='${5 - i}':fontfile='${fontFile}':fontcolor=yellow:fontsize=150:x=(w-text_w)/2:y=1800:bordercolor=black:borderw=5:enable='between(t,${qDur + i},${qDur + i + 1})'[v${vI}]`);
      vC = `v${vI++}`;
    }

    filters.push(`[${vC}]copy[vout]`);

    // Filters de Áudio
    let audioFilters: string[] = [];
    audioFilters.push(`[1:a]apad=pad_dur=5[qp]`);
    let lastAudioLabel = '[qp]';

    if (hasBeep && beepIdx !== -1) {
      for (let i = 0; i < 5; i++) {
        const d = Math.round((qDur + i) * 1000);
        const beepLabel = `b${i}`;
        const mixedLabel = `m${i}`;
        audioFilters.push(`[${beepIdx}:a]adelay=${d}|${d}[${beepLabel}]`);
        audioFilters.push(`${lastAudioLabel}[${beepLabel}]amix=inputs=2:dropout_transition=0:normalize=0[${mixedLabel}]`);
        lastAudioLabel = `[${mixedLabel}]`;
      }
    }

    audioFilters.push(`${lastAudioLabel}[2:a]concat=n=2:v=0:a=1[base]`);

    if (hasMusic && musicIdx !== -1) {
      audioFilters.push(`[${musicIdx}:a]aloop=loop=-1:size=2e9,volume=0.1[bgm]`);
      audioFilters.push(`[base][bgm]amix=inputs=2:duration=shortest[aout]`);
    } else {
      audioFilters.push(`[base]volume=1.0[aout]`);
    }
    filters.push(audioFilters.join(';'));


    // hide the huge ffmpeg banner to reduce noise
    const args = ['-y', '-hide_banner', ...ffmpegInputs];
    args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '[aout]');
    // speed up encoding by using a faster preset and auto threads; quality should still be fine for short-form content
    args.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-threads', '0',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      normalizePath(outputPath)
    );

    // totalSeconds already computed from actual audio durations earlier
    // (answer audio + reveal).

    console.log(`🎥 Processando FFmpeg... (Fundo: ${bgSelected || 'Padrão'})`);

    // helper to convert hh:mm:ss.ms -> seconds
    const hmsToSeconds = (hms: string): number => {
      const parts = hms.split(':').map(parseFloat);
      if (parts.length === 3) {
        return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
      }
      return 0;
    };

    await new Promise<void>((resolve, reject) => {
      const ff = spawn('ffmpeg', args);
      let lastPct = -1;

      // keep-alive log so CI doesn't kill job after minutes of silence
      const keepAlive = setInterval(() => {
        console.log('⏳ ffmpeg still running...');
      }, 5 * 60 * 1000);

      ff.stderr.on('data', (chunk: Buffer | string) => {
        const str = chunk.toString();
        // always print raw ffmpeg output so CI sees activity
        process.stdout.write(str);

        // split into lines to filter for progress computation
        for (const rawLine of str.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line) continue;

          // log important metadata/info lines as before
          if (/^(Input #|Duration:|Stream #|Metadata:)/.test(line)) {
            console.log(line);
          }

          // progress tracking
          const m = line.match(/time=(\d+:\d+:\d+\.\d+)/);
          if (m && m[1]) {
            const secs = hmsToSeconds(m[1]);
            const pct = Math.min(100, Math.round((secs / totalSeconds) * 100));
            if (pct !== lastPct) {
              process.stdout.write(`\r⏳ ${pct}%`);
              lastPct = pct;
            }
          }
        }
      });

      ff.on('close', (code: number | null) => {
        clearInterval(keepAlive);
        process.stdout.write('\n');
        // ensure we show completion percentage
        process.stdout.write(`\r⏳ 100%\n`);
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with ${code}`));
      });
    });

    console.log(`✅ Vídeo gerado com sucesso: ${outputPath}`);
    return outputPath;
  } catch (err: any) {
    console.error('❌ Erro na montagem do vídeo:', err.message);
    throw err;
  }
};
