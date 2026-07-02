import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runApp } from '../app/main.js';

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
  },
}));

describe('runApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria o workspace do job e delega ao runner com os targets esperados', async () => {
    const runner = {
      run: vi.fn().mockResolvedValue({
        jobId: 'job-123',
        workflowId: 'quiz',
        status: 'generated',
        publishTargets: [],
      }),
    };

    await runApp({
      jobId: 'job-123',
      runner,
      env: {
        enableYouTube: true,
        outputDir: 'output',
        workspaceRoot: 'temp_assets/jobs',
        workflowId: 'quiz',
        youtubePrivacyStatus: 'public',
      },
    });

    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith('output', { recursive: true });
    expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(path.join('temp_assets/jobs', 'job-123'), { recursive: true });
    expect(runner.run).toHaveBeenCalledWith('quiz', expect.objectContaining({
      id: 'job-123',
      workflowId: 'quiz',
      workspacePath: path.join('temp_assets/jobs', 'job-123'),
      requestedTargets: [
        { platform: 'telegram', enabled: true, mode: 'auto', label: 'telegram-primary' },
        { platform: 'youtube', enabled: true, mode: 'auto', label: 'youtube-primary' },
      ],
    }));
  });
});