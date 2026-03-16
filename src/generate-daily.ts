import 'dotenv/config';
import { generateQuiz } from './content.service.js';
import { generateNarration } from './tts.service.js';
import { assembleVideo } from './video.service.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'output';
const MAX_PARALLEL = 2; // Limitar a 2 paralelos para não sobrecarregar

async function generateSingleShort(index: number): Promise<string> {
  try {
    console.log(`\n📺 [${index}/5] Iniciando short...`);
    const timeStart = Date.now();

    // 1. Gerar Conteúdo (Ollama) - rápido
    const quiz = await generateQuiz();
    console.log(`   ✅ Quiz: "${quiz.tema}"`);

    // 2. Gerar Narrações em paralelo (TTS paralelo é mais rápido)
    console.log(`   🗣️ Gerando áudio...`);
    const [qNarration, aNarration] = await Promise.all([
      generateNarration(`${quiz.pergunta}`, `q_${index}`),
      generateNarration(
        `A resposta correta é ${quiz.resposta_correta}. ${quiz.fato_curioso}. Inscreva-se!`,
        `a_${index}`
      ),
    ]);

    // 3. Montar Vídeo (FFmpeg - precisa ser sequencial)
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
  } catch (error) {
    console.error(`   ❌ Erro no short #${index}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 GERANDO 5 QUIZ SHORTS DO DIA\n');
  const timeAll = Date.now();

  try {
    // Cria pasta output
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const generatedShorts: string[] = [];

    // Gera shorts com limite de paralelismo (2 por vez)
    for (let i = 1; i <= 5; i += MAX_PARALLEL) {
      const batch = [];
      for (let j = i; j < i + MAX_PARALLEL && j <= 5; j++) {
        batch.push(generateSingleShort(j));
      }
      const batchResults = await Promise.all(batch);
      generatedShorts.push(...batchResults);
    }

    // Resumo final
    const totalTime = ((Date.now() - timeAll) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`\n📊 ${generatedShorts.length} shorts gerados em ${totalTime}s`);
    generatedShorts.forEach((short, idx) => {
      const size = (fs.statSync(short).size / 1024 / 1024).toFixed(1);
      console.log(`   ${idx + 1}. ${path.basename(short)} (${size}MB)`);
    });
    console.log(`\n💾 Pasta: ${OUTPUT_DIR}/\n`);

    // Limpeza
    if (fs.existsSync('temp_assets')) {
      fs.rmSync('temp_assets', { recursive: true, force: true });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();
