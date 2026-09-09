import type { SceneKind } from '@/lib/types';

/**
 * Optional real footage. Drop looping MP4s (5–15s, muted) into public/video/ and
 * list them here by scene kind; any scene without an entry renders the procedural
 * canvas feed instead. Paths are relative so the build works from file:// too.
 */
export const VIDEO_MANIFEST: Partial<Record<SceneKind, string>> = {
  // fence: './video/fence.mp4',
  // carpark: './video/carpark.mp4',
  // corridor: './video/corridor.mp4',
  // gate: './video/gate.mp4',
  // road: './video/road.mp4',
};
