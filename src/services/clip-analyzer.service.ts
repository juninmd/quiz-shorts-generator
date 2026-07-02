import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '../ai-client.js';
import type { Transcript } from './whisper.service.js';

export interface ClipCandidate {
  title: string;
  startTime: number;
  endTime: number;
  viralScore: number;
  reason: string;
}

const ClipSchema = z.object({
  clips: z.array(z.object({
    title: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    viralScore: z.number().min(1).max(10),
    reason: z.string(),
  })),
});

function formatTranscript(segments: Transcript['segments']): string {
  return segments.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n');
}

export async function analyzeTranscript(
  transcript: Transcript,
  videoTitle: string,
  channelName: string,
  maxClips = 3,
  minDuration = 30,
  maxDuration = 90,
): Promise<ClipCandidate[]> {
  const formatted = formatTranscript(transcript.segments);

  const prompt = `Você é um editor de vídeo especializado em YouTube Shorts virais.
Analise a transcrição abaixo e encontre os melhores trechos para cortes curtos.

VÍDEO: "${videoTitle}"
CANAL: "${channelName}"

CRITÉRIOS:
- O trecho deve ser autocontido (faz sentido sem contexto extra)
- Deve ter início e fim claros
- Duração entre ${minDuration}s e ${maxDuration}s
- Retornar no máximo ${maxClips} cortes, ordenados por viralScore (10=melhor)

PROIBIDO: trechos que referenciem "como vimos", slides, ou dependam de contexto anterior.

TRANSCRIÇÃO:
${formatted}`;

  try {
    const { object } = await generateObject({
      model: getAIModel(),
      schema: ClipSchema,
      prompt,
      temperature: 0.7,
    });

    return (object.clips ?? [])
      .filter((c) => {
        const dur = c.endTime - c.startTime;
        return dur >= minDuration && dur <= maxDuration && c.startTime >= 0 && c.endTime <= transcript.duration;
      })
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, maxClips);
  } catch (err: any) {
    console.error('❌ Clip analysis failed:', err.message);
    return [];
  }
}
