import 'dotenv/config';
import { generateQuiz } from './content.service.js';
import { generateNarration } from './tts.service.js';
import { assembleVideo } from './video.service.js';
import { sendVideoToTelegram } from './telegram.service.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'output';
const TOTAL_SHORTS = 5;

function logConfig() {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:1b';
  const hasTelegram = !!(process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const hasYoutube = !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN);

  console.log('📦 Configuração:');
  console.log(`   OLLAMA_HOST  : ${ollamaHost}`);
  console.log(`   OLLAMA_MODEL : ${ollamaModel}`);
  console.log(`   Telegram     : ${hasTelegram ? '✅ Configurado' : '⚠️  Não configurado (shorts salvos apenas localmente)'}`);
  console.log(`   YouTube      : ${hasYoutube ? '✅ Configurado' : '⚠️  Não configurado (upload pulado)'}`);
}

async function generateSingleShort(index: number): Promise<string> {
  console.log(`\n📺 [${index}/${TOTAL_SHORTS}] Iniciando short...`);
  const timeStart = Date.now();

  // 1. Gerar Conteúdo (Ollama) - sequencial para evitar erros de memória em CI
  const quiz = await generateQuiz();
  console.log(`   ✅ Quiz: "${quiz.tema}"`);

  // 2. Gerar Narrações em paralelo (TTS é leve, pode ser paralelo)
  console.log(`   🗣️ Gerando áudio...`);
  const [qNarration, aNarration] = await Promise.all([
    generateNarration(`${quiz.pergunta}`, `q_${index}`),
    generateNarration(
      `A resposta correta é ${quiz.resposta_correta}. ${quiz.fato_curioso}. Inscreva-se!`,
      `a_${index}`
    ),
  ]);

  // 3. Montar Vídeo (FFmpeg - sequencial)
  console.log(`   🎬 Montando vídeo...`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const shortName = `short_${index}_${quiz.tema.replace(/\s+/g, '_')}_${timestamp}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, shortName);

  await assembleVideo(
    quiz,
    {
      qPath: qNarration.audioPath,
      aPath: aNarration.audioPath,
      qWords: qNarration.wordTimestamps,
      aWords: aNarration.wordTimestamps,
    },
    outputPath
  );

  const duration = ((Date.now() - timeStart) / 1000).toFixed(1);
  console.log(`   ✨ Short ${index} pronto! (${duration}s)`);
  return outputPath;
}

async function distributeToTelegram(shorts: string[]) {
  if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  console.log('\n📤 Enviando shorts para o Telegram...');
  for (const [idx, short] of shorts.entries()) {
    const caption = `🎬 <b>QUIZ SHORT ${idx + 1}/${shorts.length}</b>\n\n#quiz #shorts #gerado_por_ia`;
    await sendVideoToTelegram(short, caption);
  }
}

async function main() {
  console.log('🚀 GERANDO 5 QUIZ SHORTS DO DIA\n');
  logConfig();
  const timeAll = Date.now();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const generatedShorts: string[] = [];

  // Gera shorts sequencialmente para evitar sobrecarga de memória no Ollama em CI
  for (let i = 1; i <= TOTAL_SHORTS; i++) {
    try {
      const shortPath = await generateSingleShort(i);
      generatedShorts.push(shortPath);
    } catch (error) {
      console.error(`   ❌ Short #${i} falhou:`, error);
    }
  }

  if (generatedShorts.length === 0) {
    console.error('\n❌ Nenhum short foi gerado com sucesso.');
    process.exit(1);
  }

  // Resumo final
  const totalTime = ((Date.now() - timeAll) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${generatedShorts.length}/${TOTAL_SHORTS} SHORTS GERADOS`);
  console.log('='.repeat(60));
  generatedShorts.forEach((short, idx) => {
    const size = (fs.statSync(short).size / 1024 / 1024).toFixed(1);
    console.log(`   ${idx + 1}. ${path.basename(short)} (${size}MB)`);
  });
  console.log(`\n💾 Pasta: ${OUTPUT_DIR}/  ⏱️ ${totalTime}s\n`);

  // Distribuição opcional para o Telegram
  await distributeToTelegram(generatedShorts);

  // Limpeza de assets temporários
  if (fs.existsSync('temp_assets')) {
    fs.rmSync('temp_assets', { recursive: true, force: true });
  }

  process.exit(generatedShorts.length === TOTAL_SHORTS ? 0 : 1);
}

main().catch(err => {
  console.error('💥 CRASH FATAL:', err);
  process.exit(1);
});
