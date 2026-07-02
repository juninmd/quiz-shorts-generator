import type { PublishTarget } from '../../domain/publish-target.js';
import type { SourceRef } from '../../domain/source-ref.js';

export type PolicyStatus = 'approved' | 'requires-approval' | 'blocked';

export interface PolicyDecision {
  readonly status: PolicyStatus;
  readonly reasons: readonly string[];
  readonly publishTargets: readonly PublishTarget[];
}

const autoApprovedLicenses = new Set(['owned', 'licensed']);

const toReviewTarget = (target: PublishTarget): PublishTarget => {
  if (!target.enabled) {
    return target;
  }

  return {
    ...target,
    mode: target.platform === 'youtube' ? 'draft' : 'manual-review',
  };
};

export const evaluateRightsPolicy = (
  sourceRefs: readonly SourceRef[],
  publishTargets: readonly PublishTarget[],
): PolicyDecision => {
  if (sourceRefs.length === 0) {
    return {
      status: 'blocked',
      reasons: ['missing-source-reference'],
      publishTargets,
    };
  }

  if (sourceRefs.some((sourceRef) => !sourceRef.permissionEvidence.trim())) {
    return {
      status: 'blocked',
      reasons: ['missing-permission-evidence'],
      publishTargets,
    };
  }

  const requiresApproval = sourceRefs.some(
    (sourceRef) => !autoApprovedLicenses.has(sourceRef.licenseType),
  );

  if (!requiresApproval) {
    return {
      status: 'approved',
      reasons: ['auto-approved-owned-or-licensed'],
      publishTargets,
    };
  }

  return {
    status: 'requires-approval',
    reasons: ['third-party-content-requires-draft-review'],
    publishTargets: publishTargets.map(toReviewTarget),
  };
};