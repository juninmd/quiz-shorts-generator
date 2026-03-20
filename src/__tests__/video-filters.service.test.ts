import { describe, it, expect, vi } from 'vitest';
import { generateFilters } from '../video-filters.service.js';


vi.mock('../video-assets.service.js', async (importOriginal) => {
  const mod = await importOriginal<any>();
  return {
    ...mod,
    normalizePath: (p: string) => `normalized_${p}`,
    esc: (p: string) => `esc_${p}`
  };
});

describe('VideoFiltersService', () => {
  const quizBase = {
    tema: 'teste',
    pergunta: 'Pergunta?',
    opcoes: { A: '1', B: '2', C: '3', D: '4' },
    resposta_correta: 'A' as const,
    fato_curioso: 'Fato'
  };

  const optTxtPathsAll = { A: 'A.txt', B: 'B.txt', C: 'C.txt', D: 'D.txt' };

  it('deve gerar filtros completos (bg imagem, com logo, com musica, com beep)', () => {
    const res = generateFilters(
      quizBase,
      'bg.jpg', // isImg = true
      'q.mp3',
      'a.mp3',
      5, // qDur
      'font.ttf',
      'q.txt',
      optTxtPathsAll,
      true, // hasMusic
      true, // hasBeep
      true, // hasLogo
      'music.mp3',
      'beep.mp3',
      'logo.png'
    );

    // ffmpegInputs checks
    expect(res.ffmpegInputs).toContain('-loop');
    expect(res.ffmpegInputs).toContain('normalized_bg.jpg');
    expect(res.ffmpegInputs).toContain('q.mp3');
    expect(res.ffmpegInputs).toContain('normalized_music.mp3');
    expect(res.ffmpegInputs).toContain('normalized_beep.mp3');
    expect(res.ffmpegInputs).toContain('normalized_logo.png');

    // filterComplex checks
    expect(res.filterComplex).toContain('[vbg]');
    expect(res.filterComplex).toContain('[logo_scaled]');
    expect(res.filterComplex).toContain('@akitemquiz');
    // correct answer box
    expect(res.filterComplex).toContain('boxcolor=yellow@0.8');
    // countdown loop
    expect(res.filterComplex).toContain("text='5'");
    // audio mixes
    expect(res.filterComplex).toContain('[bgm]');
    expect(res.filterComplex).toContain('amix');
  });

  it('deve gerar filtros basicos (bg video, sem extras)', () => {
    const res = generateFilters(
      { ...quizBase, resposta_correta: 'B' }, // Muda a resposta pra cobrir branch do if/else de answer rendering
      'bg.mp4', // isImg = false
      'q.mp3',
      'a.mp3',
      5,
      'font.ttf',
      'q.txt',
      { B: 'B.txt', C: 'C.txt' }, // algumas opcoes faltando
      false, // hasMusic
      false, // hasBeep
      false, // hasLogo
      '',
      '',
      ''
    );

    // ffmpegInputs
    expect(res.ffmpegInputs).toContain('-stream_loop');
    expect(res.ffmpegInputs).toContain('-1');

    // Nao deve ter mixes
    expect(res.filterComplex).not.toContain('[bgm]');
    expect(res.filterComplex).not.toContain('[logo_scaled]');

    // Fallback de aout sem musica
    expect(res.filterComplex).toContain('[base]volume=1.0[aout]');
  });
});
