import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface WordTimestamp {
  start: number;
  end: number;
  word: string;
}

export interface NarrationResult {
  audioPath: string;
  wordTimestamps: WordTimestamp[];
}

/**
 * Converte tempo do formato VTT (00:00:00.123) para segundos.
 */
const vttTimeToSeconds = (vttTime: string): number => {
  const [h, m, s] = vttTime.split(':');
  return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s.replace(',', '.'));
};

export const generateNarration = async (
  text: string,
  fileName: string,
  outputDir: string = 'temp_assets'
): Promise<NarrationResult> => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const audioPath = path.join(outputDir, `${fileName}.mp3`);
  const vttPath = path.join(outputDir, `${fileName}.vtt`);
  const voice = 'pt-BR-ThalitaMultilingualNeural';

  console.log(`🗣️ Invocando edge-tts (Python) para: ${fileName}...`);

  try {
    // Escapa aspas no texto para o shell
    const escapedText = text.replace(/"/g, '\\"');

    // Comando edge-tts do Python com flags de áudio e legendas (vtt)
    // Usando python -m edge_tts para garantir que o executável seja encontrado
    const command = `python -m edge_tts --voice ${voice} --text "${escapedText}" --write-media ${audioPath} --write-subtitles ${vttPath}`;
    execSync(command);

    // Parse do arquivo VTT para extrair os word timestamps
    const vttContent = fs.readFileSync(vttPath, 'utf8');
    const wordTimestamps: WordTimestamp[] = [];

    // Regex para capturar os blocos de tempo e texto do VTT
    // Ex: 00:00:00.000 --> 00:00:00.400\nTexto
    const lines = vttContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        const [startStr, endStr] = lines[i].split(' --> ');
        const word = lines[i + 1]?.trim();
        if (word) {
          wordTimestamps.push({
            start: vttTimeToSeconds(startStr),
            end: vttTimeToSeconds(endStr),
            word: word
          });
        }
      }
    }

    // Opcional: Remove o VTT temporário
    // fs.unlinkSync(vttPath);

    return { audioPath, wordTimestamps };
  } catch (error: any) {
    console.error(`❌ Erro ao invocar edge-tts (Python):`, error.message);
    throw new Error('Falha na narração via edge-tts.');
  }
};
