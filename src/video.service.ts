import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Quiz } from './content.service';
import { WordTimestamp } from './tts.service';

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
  const tempDir = 'temp_assets';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  console.log(`🎬 Processando vídeo...`);

  try {
    // Determine a duração do áudio da pergunta
    const qDurStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioData.qPath}"`).toString().trim();
    const qDur = parseFloat(qDurStr);

    const bgFiles = fs.existsSync('assets/backgrounds') ? fs.readdirSync('assets/backgrounds').filter(file => file !== 'default.jpg') : [];
    let bgVideo = bgFiles.length > 0 ? path.join('assets/backgrounds', bgFiles[0]) : '';

    if (!bgVideo) {
      console.log('⚠️ Nenhum fundo customizado encontrado. Usando fundo padrão...');
      bgVideo = 'assets/backgrounds/default.jpg';
      if (!fs.existsSync(bgVideo)) {
        console.log('⚠️ Fundo padrão não encontrado. Gerando fundo azul padrão em imagem temporária...');
        bgVideo = path.join(tempDir, 'default_bg.jpg');
        execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=1080x1920:d=1 -frames:v 1 ${bgVideo}`);
      }
    }

    // Preparar arquivos de texto para o ffmpeg drawtext não sofrer com escape
    const qTxtPath = path.join(tempDir, 'q.txt');
    fs.writeFileSync(qTxtPath, wrapText(quiz.pergunta, 35));

    const optTxtPaths: Record<string, string> = {};
    for (const opt of ['A', 'B', 'C', 'D']) {
      const p = path.join(tempDir, `opt${opt}.txt`);
      // @ts-ignore - indexing is safe here
      fs.writeFileSync(p, wrapText(`${opt}) ${quiz.opcoes[opt]}`, 40));
      optTxtPaths[opt] = p;
    }

    const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

    const filters: string[] = [];

    // 1. Áudio: padding de 5 segs na pergunta, depois concatena com a resposta
    filters.push(`[1:a]apad=pad_dur=5[q_padded]; [q_padded][2:a]concat=n=2:v=0:a=1[aout]`);

    // 2. Vídeo: scale, crop
    filters.push(`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]`);

    let vCurrent = 'v0';
    let vIdx = 1;

    // Pergunta
    filters.push(`[${vCurrent}]drawtext=textfile='${qTxtPath}':fontfile=${fontFile}:fontcolor=white:fontsize=60:x=(w-text_w)/2:y=300:bordercolor=black:borderw=4[v${vIdx}]`);
    vCurrent = `v${vIdx++}`;

    // Opções
    const optY: Record<string, number> = { A: 700, B: 850, C: 1000, D: 1150 };
    for (const opt of ['A', 'B', 'C', 'D']) {
      filters.push(`[${vCurrent}]drawtext=textfile='${optTxtPaths[opt]}':fontfile=${fontFile}:fontcolor=white:fontsize=50:x=100:y=${optY[opt]}:bordercolor=black:borderw=3[v${vIdx}]`);
      vCurrent = `v${vIdx++}`;
    }

    // Timer (5 a 1)
    for (let i = 0; i < 5; i++) {
      filters.push(`[${vCurrent}]drawtext=text='${5 - i}':fontfile=${fontFile}:fontcolor=yellow:fontsize=150:x=(w-text_w)/2:y=1400:bordercolor=black:borderw=5:enable='between(t,${qDur + i},${qDur + i + 1})'[v${vIdx}]`);
      vCurrent = `v${vIdx++}`;
    }

    // Highlight resposta correta (muda cor para verde no momento que a resposta é falada)
    const correctOpt = quiz.resposta_correta as string;
    filters.push(`[${vCurrent}]drawtext=textfile='${optTxtPaths[correctOpt]}':fontfile=${fontFile}:fontcolor=green:fontsize=50:x=100:y=${optY[correctOpt]}:bordercolor=black:borderw=3:enable='gte(t,${qDur + 5})'[vout]`);

    const filterGraph = filters.join('; ');
    const filterScriptPath = path.join(tempDir, 'filter.txt');
    fs.writeFileSync(filterScriptPath, filterGraph);

    // O fundo pode ser imagem ou vídeo. Se for imagem, precisa do -loop 1
    const isImage = bgVideo.endsWith('.jpg') || bgVideo.endsWith('.png');
    const bgInputArgs = isImage ? `-loop 1 -framerate 30 -i "${bgVideo}"` : `-i "${bgVideo}"`;

    const mixCmd = `ffmpeg -y ${bgInputArgs} -i "${audioData.qPath}" -i "${audioData.aPath}" -filter_complex_script "${filterScriptPath}" -map "[vout]" -map "[aout]" -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest "${outputPath}"`;

    console.log(`🎥 Executando FFmpeg...`);
    execSync(mixCmd);

    console.log(`✅ Vídeo gerado com sucesso em: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error('❌ Erro na montagem do vídeo:', error.message);
    throw new Error('Falha na geração do vídeo.');
  }
};
