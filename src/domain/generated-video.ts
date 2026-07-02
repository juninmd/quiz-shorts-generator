import type { SourceRef } from './source-ref.js';

export interface GeneratedVideo {
  readonly filePath: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly sourceRefs: readonly SourceRef[];
}