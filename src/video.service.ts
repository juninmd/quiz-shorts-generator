import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Quiz } from './content.service';
import { WordTimestamp } from './tts.service';

export const assembleVideo = async (
  quiz: Quiz,
  audioData: { qPath: string; aPath: string; qWords: WordTimestamp[]; aWords: WordTimestamp[] },
  outputPath: string = 'final_short.mp4'
): Promise<string> => {
  const tempDir = 'temp_assets';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const finalAudio = path.join(tempDir, 'final_audio.mp3');
  const bgBlack = path.join(tempDir, 'bg_black.mp4');

  console.log(`🎬 Processando vídeo de fundo...`);

  try {
    // 1. Unir os dois áudios em um único arquivo (simples concatenação ffmpeg)
    const concatCmd = `ffmpeg -y -i ${audioData.qPath} -i ${audioData.aPath} -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" ${finalAudio}`;
    execSync(concatCmd);

    // 2. Verificar se existe vídeo de fundo, senão gera um fundo preto de 30s
    const bgFiles = fs.existsSync('assets/backgrounds') ? fs.readdirSync('assets/backgrounds') : [];
    let bgVideo = bgFiles.length > 0 ? path.join('assets/backgrounds', bgFiles[0]) : '';

    if (!bgVideo) {
      console.log('⚠️ Nenhum fundo encontrado em assets/backgrounds. Gerando fundo preto...');
      // Gera um fundo preto de 30 segundos
      const genBgCmd = `ffmpeg -y -f lavfi -i color=c=black:s=1080x1920:d=30 -pix_fmt yuv420p ${bgBlack}`;
      execSync(genBgCmd);
      bgVideo = bgBlack;
    }

    // 3. Montar o vídeo final unindo o fundo com o áudio final
    console.log(`🎥 Mixando áudio com o vídeo: ${bgVideo}`);
    const mixCmd = `ffmpeg -y -i ${bgVideo} -i ${finalAudio} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest ${outputPath}`;
    execSync(mixCmd);

    console.log(`✅ Vídeo gerado com sucesso em: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error('❌ Erro na montagem do vídeo:', error.message);
    throw new Error('Falha na geração do vídeo.');
  }
};
