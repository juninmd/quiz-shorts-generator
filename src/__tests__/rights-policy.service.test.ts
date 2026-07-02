import { describe, expect, it } from 'vitest';
import { evaluateRightsPolicy } from '../services/policy/rights-policy.service.js';

describe('RightsPolicyService', () => {
  const publishTargets = [
    { platform: 'telegram' as const, enabled: true, mode: 'auto' as const, label: 'telegram' },
    { platform: 'youtube' as const, enabled: true, mode: 'auto' as const, label: 'youtube' },
  ];

  it('aprova automaticamente conteúdo próprio', () => {
    const result = evaluateRightsPolicy([
      {
        id: '1', provider: 'internal', sourceUrl: 'internal://1', owner: 'me', licenseType: 'owned',
        permissionEvidence: 'self-generated', contentType: 'quiz', attributionRequired: false,
      },
    ], publishTargets);

    expect(result.status).toBe('approved');
    expect(result.publishTargets).toEqual(publishTargets);
  });

  it('bloqueia quando falta evidência de permissão', () => {
    const result = evaluateRightsPolicy([
      {
        id: '1', provider: 'ext', sourceUrl: 'https://x', owner: 'other', licenseType: 'licensed',
        permissionEvidence: '', contentType: 'podcast-clip', attributionRequired: true,
      },
    ], publishTargets);

    expect(result.status).toBe('blocked');
  });

  it('rebaixa conteúdo de terceiros para draft/manual-review', () => {
    const result = evaluateRightsPolicy([
      {
        id: '1', provider: 'ext', sourceUrl: 'https://x', owner: 'other', licenseType: 'third-party',
        permissionEvidence: 'license-doc', contentType: 'podcast-clip', attributionRequired: true,
      },
    ], publishTargets);

    expect(result.status).toBe('requires-approval');
    expect(result.publishTargets).toEqual([
      { platform: 'telegram', enabled: true, mode: 'manual-review', label: 'telegram' },
      { platform: 'youtube', enabled: true, mode: 'draft', label: 'youtube' },
    ]);
  });
});