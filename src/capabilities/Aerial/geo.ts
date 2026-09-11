import type { Vec3, Waypoint } from '@/lib/types';
import { GEOFENCES } from '@/data/facilities';

/** Ray-casting point-in-polygon in the x/z plane. */
export function pointInPolygon(p: [number, number], poly: [number, number][]) {
  const [x, z] = p;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const crosses = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function polygonArea(poly: [number, number][]) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return Math.abs(a) / 2;
}

export const dist = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[2] - a[2]);

export function cardinal(deg: number) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export type Violation = { fenceId: string; fenceName: string; where: string; kind: 'nofly' | 'outside' | 'altitude'; pointIndex?: number };

const CAMP = GEOFENCES.find((g) => g.kind === 'geofence');
const NOFLY = GEOFENCES.filter((g) => g.kind === 'nofly');

/**
 * Check a planned route at a given altitude. Points inside a no-fly volume whose altitude band
 * covers the flight, or outside the camp geofence, are rejected. Legs are sampled so a route
 * cannot pass through a volume between two legal points.
 */
export function validateRoute(start: Vec3, points: Waypoint[], altitude: number): Violation[] {
  const out: Violation[] = [];
  const seen = new Set<string>();
  const push = (v: Violation) => { const k = `${v.fenceId}|${v.where}`; if (!seen.has(k)) { seen.add(k); out.push(v); } };
  if (CAMP && altitude > CAMP.maxAlt) push({ fenceId: CAMP.id, fenceName: CAMP.name, where: `altitude ${altitude} m`, kind: 'altitude' });
  points.forEach((w, i) => {
    const p: [number, number] = [w.position[0], w.position[2]];
    for (const f of NOFLY) {
      if (altitude >= f.minAlt && altitude <= f.maxAlt && pointInPolygon(p, f.polygon)) push({ fenceId: f.id, fenceName: f.name, where: `point ${i + 1}`, kind: 'nofly', pointIndex: i });
    }
    if (CAMP && !pointInPolygon(p, CAMP.polygon)) push({ fenceId: CAMP.id, fenceName: CAMP.name, where: `point ${i + 1}`, kind: 'outside', pointIndex: i });
  });
  const path: Vec3[] = [start, ...points.map((w) => w.position)];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    for (let s = 1; s < 8; s++) {
      const t = s / 8;
      const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t];
      for (const f of NOFLY) {
        if (altitude >= f.minAlt && altitude <= f.maxAlt && pointInPolygon(p, f.polygon)) push({ fenceId: f.id, fenceName: f.name, where: i === 0 ? `leg from the nest to point 1` : `leg ${i} to ${i + 1}`, kind: 'nofly' });
      }
    }
  }
  return out;
}

/** Battery model used across the module. Percent of pack. */
export const DRAIN_PER_MIN = 1.2;
export const TAKEOFF_PCT = 4;
export const LANDING_PCT = 2;
export const RESERVE_PCT = 20;

export function flightEstimate(path: Vec3[], speedMs: number) {
  let distanceM = 0;
  for (let i = 0; i < path.length - 1; i++) distanceM += dist(path[i], path[i + 1]);
  const minutes = speedMs > 0 ? distanceM / speedMs / 60 + 0.5 : 0;
  const batteryPct = TAKEOFF_PCT + LANDING_PCT + DRAIN_PER_MIN * minutes;
  return { distanceM, minutes, batteryPct };
}

/** What it costs to get home from here, and what is left to spend on station. */
export function returnHomeMargin(here: Vec3, home: Vec3, speedMs: number, battery: number) {
  const rthMin = speedMs > 0 ? dist(here, home) / speedMs / 60 + 0.5 : 0;
  const rthPct = LANDING_PCT + DRAIN_PER_MIN * rthMin;
  const margin = battery - RESERVE_PCT - rthPct;
  const onStationMin = Math.max(0, margin / DRAIN_PER_MIN);
  return { rthMin, rthPct, margin, onStationMin };
}
