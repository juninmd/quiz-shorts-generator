import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Script para criar arquivos de mídia mínimos necessários
 * Usa ffmpeg se disponível, senão cria stubs
 */

function createMinimalMP3(filePath: string): void {
  // MP3 frame header com silêncio (~3KB)
  // Frame: SYNC(11 bits) + header(21 bits) + CRC(16 bits) + data(8000+ bits)
  const header = Buffer.alloc(4);
  header[0] = 0xFF; // 11111111
  header[1] = 0xFB; // 11111011 (MPEG-1, Layer 3, no CRC, 128kbps)
  header[2] = 0x10; // Sampling rate 44.1kHz, no padding
  header[3] = 0x00; // Private bit, no emphasis

  // Cria um arquivo MP3 com ~1KB de frames silenciosos
  const mp3Data = Buffer.alloc(1024);
  for (let i = 0; i < mp3Data.length - 4; i += 4) {
    mp3Data.set(header, i);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, mp3Data);
}

async function main() {
  const assetDir = path.join(__dirname, '..', 'assets');

  console.log('📦 Criando arquivos de mídia...');

  try {
    createMinimalMP3(path.join(assetDir, 'music', 'background.mp3'));
    console.log('✅ background.mp3 criado');

    createMinimalMP3(path.join(assetDir, 'music', 'beep.mp3'));
    console.log('✅ beep.mp3 criado');

    console.log('✨ Assets de áudio criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar arquivos:', error);
    process.exit(1);
  }
}

main();
