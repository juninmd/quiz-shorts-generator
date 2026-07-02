import fs from 'node:fs';
import path from 'node:path';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface Transcript {
  videoId: string;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  fullText: string;
  duration: number;
}

export async function transcribeAudio(audioPath: string, videoId: string, duration: number): Promise<Transcript> {
  const baseUrl = process.env.WHISPER_BASE_URL;
  if (!baseUrl) throw new Error('WHISPER_BASE_URL not set — remote Whisper is required');

  const url = new URL('/asr', baseUrl);
  url.searchParams.append('task', 'transcribe');
  url.searchParams.append('language', 'pt');
  url.searchParams.append('output', 'json');
  url.searchParams.append('word_timestamps', 'True');

  const fileBuffer = fs.readFileSync(audioPath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'audio/wav' });
  formData.append('audio_file', blob, path.basename(audioPath));

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(600_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Whisper failed (${response.status}): ${text}`);
  }

  const raw = (await response.json()) as any;

  const segments: TranscriptSegment[] = [];
  const words: TranscriptWord[] = [];

  for (const seg of raw.segments ?? []) {
    segments.push({ start: seg.start ?? 0, end: seg.end ?? 0, text: (seg.text ?? '').trim() });
    for (const w of (seg as any).words ?? []) {
      words.push({ word: (w.word ?? '').trim(), start: w.start ?? 0, end: w.end ?? 0 });
    }
  }

  segments.sort((a, b) => a.start - b.start);
  words.sort((a, b) => a.start - b.start);

  return {
    videoId,
    segments,
    words,
    fullText: segments.map((s) => s.text).join(' '),
    duration,
  };
}
