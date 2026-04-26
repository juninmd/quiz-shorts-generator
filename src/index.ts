import 'dotenv/config';
import { generateQuiz } from './content.service.js';
import { generateNarration } from './tts.service.js';
import { assembleVideo } from './video.service.js';
import { sendVideoToTelegram, sendMessageToTelegram } from './telegram.service.js';
import { generateYoutubeMetadata, uploadToYouTube } from './youtube.service.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Iniciando geração de Quiz Short (Node.js/TS)...');

  try {
    // 0. Preparar ambiente
    const outputDir = path.resolve('output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync('temp_assets')) {
      fs.mkdirSync('temp_assets', { recursive: true });
    }

    // 1. Gerar Conteúdo
    console.log('🤖 Gerando conteúdo...');
    const quiz = await generateQuiz();
    console.log(`✅ Quiz gerado sobre: ${quiz.tema}`);

    // 2. Gerar Narrações (TTS) em paralelo
    console.log('🗣️ Gerando narrações (Edge-TTS) em paralelo...');
    console.time('TTS_Generation');
    const [qNarration, aNarration] = await Promise.all([
      generateNarration(`${quiz.pergunta}`, 'question'),
      generateNarration(`A resposta correta é a letra ${quiz.resposta_correta}: ${quiz.opcoes[quiz.resposta_correta]}. ${quiz.fato_curioso}. E aí, você sabia? Se gostou da curiosidade, curta o vídeo e se inscreva no canal para mais vídeos como este!`, 'answer')
    ]);
    console.timeEnd('TTS_Generation');

    // 3. Montar Vídeo (FFmpeg)
    console.log('🎬 Montando o vídeo (FFmpeg)...');
    console.time('Video_Assembly');
    const outputFileName = path.join(outputDir, `quiz_${quiz.tema.replace(/\s+/g, '_')}.mp4`);
    await assembleVideo(quiz, {
      qPath: qNarration.audioPath,
      aPath: aNarration.audioPath,
      qWords: qNarration.wordTimestamps,
      aWords: aNarration.wordTimestamps
    }, outputFileName);
    console.timeEnd('Video_Assembly');

    // 4. Enviar para Telegram
    console.log('📤 Enviando para o Telegram...');
    const caption = `🏆 <b>NOVO QUIZ: ${quiz.tema.toUpperCase()}!</b>\n\nPerguntamos: ${quiz.pergunta}\n\n#quiz #shorts #gerado_ia`;
    const sent = await sendVideoToTelegram(outputFileName, caption);

    // 5. YouTube Upload
    if (process.env.ENABLE_YOUTUBE === 'true') {
      console.log('🎥 Gerando metadados e enviando para o YouTube...');
      const { title, description } = await generateYoutubeMetadata(quiz);
      const url = await uploadToYouTube(outputFileName, title, description);
      
      if (url) {
        console.log('📤 Repassando link do YouTube para o Telegram...');
        const ytCaption = `📺 <b>O vídeo do quiz "${quiz.tema.toUpperCase()}" também já está no YouTube!</b>\n\nAssista e deixe aquele like: ${url}`;
        await sendMessageToTelegram(ytCaption);
      }
    } else {
      console.log('⏩ Upload do YouTube desabilitado. Pulando fase 5...');
    }

    // 6. Limpeza
    if (sent) {
      console.log('🧹 Limpando arquivos temporários...');
      if (fs.existsSync('temp_assets')) {
        fs.rmSync('temp_assets', { recursive: true, force: true });
      }
      console.log('✨ Processo concluído com sucesso!');
      process.exit(0);
    } else {
      console.warn('⚠️ O vídeo não foi enviado, mantendo arquivos para depuração.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro no processo principal:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 CRASH FATAL:', err);
  process.exit(1);
});
