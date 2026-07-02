export type SourceLicenseType = 'owned' | 'licensed' | 'third-party' | 'commentary' | 'unknown';
export type SourceContentType = 'quiz' | 'podcast-clip' | 'release-radar' | 'video-clip';

export interface ClipRange {
  readonly startSeconds: number;
  readonly endSeconds: number;
}

export interface SourceRef {
  readonly id: string;
  readonly provider: string;
  readonly sourceUrl: string;
  readonly owner: string;
  readonly licenseType: SourceLicenseType;
  readonly permissionEvidence: string;
  readonly contentType: SourceContentType;
  readonly attributionRequired: boolean;
  readonly editorialNotes?: string;
  readonly clipRange?: ClipRange;
}