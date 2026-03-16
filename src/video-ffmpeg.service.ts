import { spawn } from 'child_process';
import { normalizePath } from './video-assets.service.js';

const hmsToSeconds = (hms: string): number => {
  const parts = hms.split(':').map(parseFloat);
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }
  return 0;
};

export const runFFmpeg = async (
  ffmpegInputs: string[],
  filterComplex: string,
  outputPath: string,
  totalSeconds: number
): Promise<void> => {
  const args = ['-y', '-hide_banner', ...ffmpegInputs];
  args.push('-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]');
  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'fastdecode,zerolatency',
    '-filter_threads', '2',
    '-r', '30',
    '-crf', '28',
    '-threads', '0',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-t', totalSeconds.toString(),
    normalizePath(outputPath)
  );

  console.log(`🎥 Processando FFmpeg...`);

  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', args); // NOSONAR
    let lastPct = -1;

    const keepAlive = setInterval(() => {
      console.log('⏳ ffmpeg still running...');
    }, 5 * 60 * 1000);

    ff.stderr.on('data', (chunk: Buffer | string) => {
      const str = chunk.toString();
      process.stdout.write(str);

      for (const rawLine of str.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        if (/^(Input #|Duration:|Stream #|Metadata:)/.test(line)) {
          console.log(line);
        }

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
      process.stdout.write(`\r⏳ 100%\n`);
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with ${code}`));
    });
  });

  console.log(`✅ Vídeo gerado com sucesso: ${outputPath}`);
};
