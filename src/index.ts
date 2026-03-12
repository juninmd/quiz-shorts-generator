import 'dotenv/config';
import { generateQuiz } from './content.service';
import { generateNarration } from './tts.service';
import { assembleVideo } from './video.service';
import { sendVideoToTelegram } from './telegram.service';
import fs from 'fs';

async function main() {
  console.log('🚀 Iniciando geração de Quiz Short (Node.js/TS)...');

  try {
    // 1. Gerar Conteúdo (Ollama)
    console.log('🤖 Gerando conteúdo com Ollama...');
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
    const outputFileName = `quiz_${quiz.tema.replace(/\s+/g, '_')}.mp4`;
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

    // 5. Limpeza
    if (sent) {
      console.log('🧹 Limpando arquivos temporários...');
      if (fs.existsSync('temp_assets')) {
        fs.rmSync('temp_assets', { recursive: true, force: true });
      }
      if (fs.existsSync(outputFileName) && !process.env.GITHUB_ACTIONS) {
        fs.unlinkSync(outputFileName);
      }
      console.log('✨ Processo concluído com sucesso!');
    } else {
      console.warn('⚠️ O vídeo não foi enviado, mantendo arquivos para depuração.');
    }

  } catch (error) {
    console.error('❌ Erro no processo principal:', error);
    throw error; // Re-throw to be caught by the outer catch and exit with 1
  }
}

main().catch(err => {
  console.error('💥 CRASH FATAL:', err);
  process.exit(1);
});
