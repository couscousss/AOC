import type { FeedSubjects } from '@/ui/CctvFeed';

/** A bounding box in the CctvFeed's own shape: fractions of the frame, drawn in --agent. */
export type FeedBox = { cls: string; conf: number; box: [number, number, number, number] };

/**
 * Which procedural subjects a camera shows at a given scenario beat.
 * Mirrors what CameraFocus does for the auto-opened tile so every view of the same camera agrees.
 * Beats: 3 = eyes on, 10 = drone on station (one subject at the fence base), 12 = withdrawal.
 */
export function subjectsFor(sensorId: string, beat: number): FeedSubjects {
  if (sensorId === 'OSPREY-1') return beat >= 12 ? 'withdraw' : 'drone-topdown';
  if (sensorId === 'THM-P-NE' || sensorId === 'PTZ-P-NE') {
    if (beat >= 12) return 'withdraw';
    if (beat >= 10) return 'figures-at-fence';
    if (beat >= 3) return 'two-figures';
  }
  if (sensorId === 'CAM-RD-E' && beat >= 12) return 'vehicle-verge';
  return 'none';
}

// Boxes are module-level constants so CctvFeed (memoised) keeps the same reference between renders
// and does not restart its animation loop every time the store ticks.
const TWO_FIGURES: FeedBox[] = [
  { cls: 'person', conf: 0.91, box: [0.385, 0.5, 0.075, 0.29] },
  { cls: 'person', conf: 0.88, box: [0.625, 0.46, 0.07, 0.26] },
  { cls: 'long object', conf: 0.74, box: [0.355, 0.63, 0.13, 0.04] },
];
const FIGURES_AT_FENCE: FeedBox[] = [
  { cls: 'person', conf: 0.93, box: [0.385, 0.5, 0.075, 0.29] },
  { cls: 'person', conf: 0.9, box: [0.565, 0.5, 0.065, 0.17] },
  { cls: 'cutting tool', conf: 0.86, box: [0.355, 0.63, 0.13, 0.04] },
];
const VEHICLE_VERGE: FeedBox[] = [
  { cls: 'vehicle', conf: 0.93, box: [0.6, 0.64, 0.24, 0.16] },
  { cls: 'person', conf: 0.84, box: [0.565, 0.58, 0.07, 0.25] },
];

/**
 * Agent-drawn boxes for the incident cameras while the subjects are static in frame.
 * Returns undefined to fall back to the camera's keyframed BOX_TRACKS; the withdrawal phase
 * has moving figures, so no static box is honest there.
 */
export function boxesFor(sensorId: string, beat: number): FeedBox[] | undefined {
  if (sensorId === 'THM-P-NE' || sensorId === 'PTZ-P-NE') {
    if (beat >= 12) return undefined;
    if (beat >= 10) return FIGURES_AT_FENCE;
    if (beat >= 3) return TWO_FIGURES;
  }
  if (sensorId === 'CAM-RD-E' && beat >= 12) return VEHICLE_VERGE;
  return undefined;
}
