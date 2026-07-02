export type PublishPlatform = 'telegram' | 'youtube';
export type PublishMode = 'auto' | 'draft' | 'manual-review' | 'disabled';

export interface PublishTarget {
  readonly platform: PublishPlatform;
  readonly enabled: boolean;
  readonly mode: PublishMode;
  readonly label: string;
}