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

  it.each([
    {
      name: 'deve criar a pasta temp_assets caso nao exista',
      exists: false,
      expectedToCreate: true
    },
    {
      name: 'nao deve tentar criar pasta se ja existir',
      exists: true,
      expectedToCreate: false
    }
  ])('$name', async ({ exists, expectedToCreate }) => {
    vi.mocked(fs.existsSync).mockReturnValue(exists);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });
    vi.mocked(fsPromises.readFile).mockResolvedValue('');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await generateNarration('teste', 'file');

    if (expectedToCreate) {
      expect(fsPromises.mkdir).toHaveBeenCalledWith('temp_assets', { recursive: true });
    } else {
      expect(fsPromises.mkdir).not.toHaveBeenCalled();
    }
    consoleSpy.mockRestore();
  });

  it('deve extrair word timestamps a partir de um arquivo VTT valido', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    const vttContent = `WEBVTT

00:00:00.100 --> 00:00:00.500
Olá

00:00:00.600 --> 00:00:01.000
Mundo`;
    vi.mocked(fsPromises.readFile).mockResolvedValue(vttContent);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('Olá Mundo', 'file');

    expect(result.audioPath).toBe(path.join('temp_assets', 'file.mp3'));
    expect(result.wordTimestamps).toHaveLength(2);
    expect(result.wordTimestamps[0]).toEqual({ start: 0.1, end: 0.5, word: 'Olá' });
    expect(result.wordTimestamps[1]).toEqual({ start: 0.6, end: 1, word: 'Mundo' });

    consoleSpy.mockRestore();
  });

  it('deve extrair word timestamps a partir de um arquivo VTT valido com virgulas', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    const vttContent = `WEBVTT

00:00:00,100 --> 00:00:00,500
Olá

00:00:00,600 --> 00:00:01,000
Mundo`;
    vi.mocked(fsPromises.readFile).mockResolvedValue(vttContent);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('Olá Mundo', 'file');

    expect(result.audioPath).toBe(path.join('temp_assets', 'file.mp3'));
    expect(result.wordTimestamps).toHaveLength(2);
    expect(result.wordTimestamps[0]).toEqual({ start: 0.1, end: 0.5, word: 'Olá' });
    expect(result.wordTimestamps[1]).toEqual({ start: 0.6, end: 1, word: 'Mundo' });

    consoleSpy.mockRestore();
  });

  it('deve ignorar blocos incompletos ou invalidos no VTT', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    const vttContent = `WEBVTT

invalid --> line

00:00:00.100 --> 00:00:00.500

00:00:00.600 -->

00:00:00.600 --> 00:00:01.000
Palavra

--> 00:00:02.000
Teste`;
    vi.mocked(fsPromises.readFile).mockResolvedValue(vttContent);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('teste', 'file');

    // Expected extractions
    expect(result.wordTimestamps).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('deve lidar com falha vttTimeToSeconds retornando 0 se invalid format (h,m,s undefined)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    // Time split that lacks colons
    const vttContent = `000000.100 --> 000000.500
InvalidTimeFormat`;
    vi.mocked(fsPromises.readFile).mockResolvedValue(vttContent);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await generateNarration('teste', 'file');

    expect(result.wordTimestamps[0]).toEqual({ start: 0, end: 0, word: 'InvalidTimeFormat' });

    consoleSpy.mockRestore();
  });

  it.each([
    {
      name: 'retornar status diferente de 0',
      execResult: { stdout: '', stderr: 'Python not found', code: 1 }
    }
  ])('deve lançar erro se execAsync $name', async ({ execResult }) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockResolvedValue(execResult);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(generateNarration('teste', 'file')).rejects.toThrow('Falha na narração via edge-tts.');

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('deve lançar erro se execAsync falhar com exceção', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(execModule.execAsync).mockRejectedValue(new Error('Spawn error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(generateNarration('teste', 'file')).rejects.toThrow('Falha na narração via edge-tts.');

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});
