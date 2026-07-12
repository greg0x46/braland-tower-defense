import type { VisualAnimationPlayback } from './visualStateMachine';

export function animationFrameIndexAt(
  kind: VisualAnimationPlayback,
  frameCount: number,
  frameDurationMs: number,
  phaseElapsedSec: number,
): number {
  const safeFrameCount = Math.max(1, frameCount);
  const safeFrameDurationMs = Math.max(1, frameDurationMs);
  const rawIndex = Math.floor((phaseElapsedSec * 1000) / safeFrameDurationMs);

  if (kind === 'loop') return rawIndex % safeFrameCount;
  return Math.min(rawIndex, safeFrameCount - 1);
}
