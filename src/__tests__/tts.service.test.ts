import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateNarration } from '../tts.service.js';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as execModule from '../utils/exec.js';
import path from 'node:path';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('../utils/exec.js');

describe('TTSService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar a pasta temp_assets caso nao exista', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });
    vi.mocked(fsPromises.readFile).mockResolvedValue('');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await generateNarration('teste', 'file');

    expect(fsPromises.mkdir).toHaveBeenCalledWith('temp_assets', { recursive: true });
    consoleSpy.mockRestore();
  });

  it('nao deve tentar criar pasta se ja existir', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });
    vi.mocked(fsPromises.readFile).mockResolvedValue('');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await generateNarration('teste', 'file');

    expect(fsPromises.mkdir).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it.each([
    {
      name: 'com pontos',
      content: `WEBVTT

00:00:00.100 --> 00:00:00.500
Olá

00:00:00.600 --> 00:00:01.000
Mundo`
    },
    {
      name: 'com virgulas',
      content: `WEBVTT

00:00:00,100 --> 00:00:00,500
Olá

00:00:00,600 --> 00:00:01,000
Mundo`
    }
  ])('deve extrair word timestamps a partir de um arquivo VTT valido $name', async ({ content }) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });
    vi.mocked(fsPromises.readFile).mockResolvedValue(content);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('Olá Mundo', 'file');

    expect(result.audioPath).toBe(path.join('temp_assets', 'file.mp3'));
    expect(result.wordTimestamps).toHaveLength(2);
    expect(result.wordTimestamps[0]).toEqual({ start: 0.1, end: 0.5, word: 'Olá' });
    expect(result.wordTimestamps[1]).toEqual({ start: 0.6, end: 1, word: 'Mundo' });

    consoleSpy.mockRestore();
  });

  it.each([
    {
      name: 'ignorar blocos incompletos ou invalidos',
      vttContent: `WEBVTT

invalid --> line

00:00:00.100 --> 00:00:00.500

00:00:00.600 -->

00:00:00.600 --> 00:00:01.000
Palavra

--> 00:00:02.000
Teste`,
      expectedWords: [{ start: 0.6, end: 1, word: 'Palavra' }]
    },
    {
      name: 'lidar com falha vttTimeToSeconds retornando 0 se invalid format',
      vttContent: `000000.100 --> 000000.500
InvalidTimeFormat`,
      expectedWords: [{ start: 0, end: 0, word: 'InvalidTimeFormat' }]
    }
  ])('deve $name no VTT', async ({ vttContent, expectedWords }) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });
    vi.mocked(fsPromises.readFile).mockResolvedValue(vttContent);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('teste', 'file');

    expect(result.wordTimestamps).toBeDefined();
    expect(result.wordTimestamps).toEqual(expectedWords);

    consoleSpy.mockRestore();
  });

  it.each([
    {
      name: 'retornar status diferente de 0',
      execSetup: () => vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: 'Python not found', code: 1 })
    },
    {
      name: 'falhar com exceção',
      execSetup: () => vi.mocked(execModule.execAsync).mockRejectedValue(new Error('Spawn error'))
    }
  ])('deve lançar erro se execAsync $name', async ({ execSetup }) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    execSetup();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(generateNarration('teste', 'file')).rejects.toThrow('Falha na narração via edge-tts.');

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});
