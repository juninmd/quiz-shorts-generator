import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAuditRecord } from '../services/sources/source-registry.js';

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  },
}));

describe('SourceRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persiste o ledger em formato jsonl', async () => {
    const auditRecord = {
      jobId: 'job-1',
      workflowId: 'quiz',
      createdAt: '2026-05-02T00:00:00.000Z',
      decision: 'approved' as const,
      reasons: ['ok'],
      sourceRefs: [],
      prompts: [],
      publishTargets: [],
      outputs: ['output/file.mp4'],
      publishedUrls: [],
    };

    const result = await persistAuditRecord('output', auditRecord);

    expect(result).toBe(path.join('output', 'audit-ledger.jsonl'));
    expect(vi.mocked(fs.appendFileSync)).toHaveBeenCalledWith(
      path.join('output', 'audit-ledger.jsonl'),
      `${JSON.stringify(auditRecord)}\n`,
      'utf8',
    );
  });
});