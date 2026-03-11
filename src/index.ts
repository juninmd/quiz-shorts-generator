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

    // 2. Gerar Narrações (TTS)
    console.log('🗣️ Gerando narração (Edge-TTS)...');
    const qNarration = await generateNarration(`${quiz.pergunta}`, 'question');
    const aNarration = await generateNarration(`A resposta correta é a letra ${quiz.resposta_correta}: ${quiz.opcoes[quiz.resposta_correta]}. ${quiz.fato_curioso}`, 'answer');

    // 3. Montar Vídeo (FFmpeg)
    console.log('🎬 Montando o vídeo (FFmpeg)...');
    const outputFileName = `quiz_${quiz.tema.replace(/\s+/g, '_')}.mp4`;
    await assembleVideo(quiz, {
      qPath: qNarration.audioPath,
      aPath: aNarration.audioPath,
      qWords: qNarration.wordTimestamps,
      aWords: aNarration.wordTimestamps
    }, outputFileName);

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
      if (fs.existsSync(outputFileName)) {
        fs.unlinkSync(outputFileName);
      }
      console.log('✨ Processo concluído com sucesso!');
    } else {
      console.warn('⚠️ O vídeo não foi enviado, mantendo arquivos para depuração.');
    }

  } catch (error) {
    console.error('❌ Erro no processo principal:', error);
  }
}

main();
