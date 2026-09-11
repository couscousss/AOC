import type { Asset, AssetClass, AssetState, Vec3, Waypoint, WaypointAction } from '@/lib/types';
import { ZONE_GEOMS, BUILDINGS, FENCE } from '@/scene/campConfig';
import { ZONE_BY_ID } from '@/data/zones';
import { PERIMETER_LOOP, MOTORPOOL_LOOP, HQ_LOOP, routeLength } from '@/data/assets';

export type RoboticsTab = 'fleet' | 'unit' | 'planner' | 'schedule' | 'maintenance';
export const ROBOTICS_TABS: { id: RoboticsTab; label: string }[] = [
  { id: 'fleet', label: 'Fleet board' },
  { id: 'unit', label: 'Unit detail' },
  { id: 'planner', label: 'Mission planner' },
  { id: 'schedule', label: 'Patrol scheduling' },
  { id: 'maintenance', label: 'Maintenance' },
];

export const isGroundUnit = (a: Asset) => a.class !== 'drone';
export const isActive = (a: Asset) => a.state === 'patrolling' || a.state === 'tasked' || a.state === 'returning';

export const STATE_LABEL: Record<AssetState, string> = {
  docked: 'Docked',
  charging: 'Charging',
  patrolling: 'Patrolling',
  tasked: 'On task',
  returning: 'Returning to dock',
  maintenance: 'Held for maintenance',
  airborne: 'Airborne',
};

export const ACTION_LABEL: Record<WaypointAction, string> = {
  patrol: 'Patrol',
  hold: 'Hold and observe',
  inspect: 'Inspect',
  return: 'Return to dock',
  observe: 'Observe',
};
export const PLANNER_ACTIONS: WaypointAction[] = ['patrol', 'hold', 'inspect', 'return'];

/** Higher floats to the top of the fleet board: flagged > low battery > weak link > tasked > patrolling > docked. */
export function attentionScore(a: Asset) {
  if (a.maintenance.flagged || a.state === 'maintenance') return 6;
  if (a.battery < 30) return 5;
  if (a.connectivity === 'lost' || a.connectivity === 'poor') return 4;
  if (a.state === 'tasked' || a.state === 'returning') return 3;
  if (a.state === 'patrolling') return 2;
  return 1;
}

export type Attention = { text: string; tone: 'advisory' | 'alarm' } | null;
export function attentionReason(a: Asset): Attention {
  if (a.maintenance.flagged) return { text: 'Flagged by Fitter', tone: 'advisory' };
  if (a.state === 'maintenance') return { text: 'Held for maintenance', tone: 'advisory' };
  if (a.battery < 20) return { text: `Battery ${a.battery}%, needs charge`, tone: 'alarm' };
  if (a.battery < 30) return { text: `Battery low, ${a.battery}%`, tone: 'advisory' };
  if (a.connectivity === 'lost') return { text: 'Link lost', tone: 'alarm' };
  if (a.connectivity === 'poor') return { text: 'Link poor', tone: 'advisory' };
  return null;
}

/** Human-readable place for a world position: zone, building, or the perimeter. */
export function locationName(p: Vec3): string {
  const x = p[0], z = p[2];
  for (const g of ZONE_GEOMS) {
    if (g.ring) continue;
    if (Math.abs(x - g.center[0]) <= g.size[0] / 2 + 8 && Math.abs(z - g.center[1]) <= g.size[1] / 2 + 8) return ZONE_BY_ID[g.id].name;
  }
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.position[0]) <= b.size[0] / 2 + 6 && Math.abs(z - b.position[2]) <= b.size[2] / 2 + 6) return b.name;
  }
  if (Math.abs(x) >= FENCE.x - 6 || Math.abs(z) >= FENCE.z - 6) return 'Fence line';
  if (Math.abs(x) >= FENCE.x - 24 || Math.abs(z) >= FENCE.z - 24) return 'Perimeter road';
  let best = ZONE_GEOMS[0];
  let bd = Infinity;
  for (const g of ZONE_GEOMS) {
    if (g.ring) continue;
    const d = Math.hypot(x - g.center[0], z - g.center[1]);
    if (d < bd) { bd = d; best = g; }
  }
  return `Near ${ZONE_BY_ID[best.id].name}`;
}

export const fmtCoord = (p: Vec3) => `${Math.round(p[0])}, ${Math.round(p[2])}`;

const samePoint = (a: Vec3, b: Vec3) => a[0] === b[0] && a[2] === b[2];

/** Short, lower-case description of what a unit is doing, for the status line. */
export function shortTask(a: Asset): string {
  if (a.routeLoop && a.route && a.route.length > 0) {
    const p = a.route[0].position;
    if (samePoint(p, PERIMETER_LOOP[0].position)) return 'perimeter loop';
    if (samePoint(p, MOTORPOOL_LOOP[0].position)) return 'motor pool sweep';
    if (samePoint(p, HQ_LOOP[0].position)) return 'HQ loop';
  }
  let t = (a.currentTask ?? 'a task').replace(/^INC-\d+:\s*/, '').replace(/\s*\(.*\)\s*$/, '');
  if (/^Mission:/.test(t)) return 'a planned mission, ' + t.replace(/^Mission:\s*/, '');
  t = t.split(', ')[0];
  if (/^[A-Z][a-z]/.test(t)) t = t[0].toLowerCase() + t.slice(1);
  return t;
}

/** Where a unit is along its route: which waypoint is next and how far is left. */
export function routeStage(route: Waypoint[], progress: number) {
  const total = routeLength(route);
  const target = total * Math.min(1, Math.max(0, progress));
  let acc = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i].position, b = route[i + 1].position;
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (acc + d >= target) return { next: i + 1, remainingM: total - target, totalM: total };
    acc += d;
  }
  return { next: Math.max(0, route.length - 1), remainingM: 0, totalM: total };
}

export function cardinal(deg: number) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Simple line icon per unit class. Inherits colour from the text. */
export function UnitIcon({ cls, size = 20, className = '' }: { cls: AssetClass; size?: number; className?: string }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true,
  };
  switch (cls) {
    case 'robot-dog':
      return <svg {...common}><rect x="4" y="9" width="12" height="6" rx="1.5" /><path d="M16 10h3l1.5 3" /><path d="M6 15v5M9 15v5M12 15v5M15 15v5" /></svg>;
    case 'ugv':
      return <svg {...common}><rect x="6" y="7" width="12" height="7" rx="1" /><rect x="3" y="14" width="18" height="5" rx="2.5" /><path d="M12 7V4h3" /></svg>;
    case 'humanoid':
      return <svg {...common}><circle cx="12" cy="5" r="2.5" /><path d="M8 10h8v6H8z" /><path d="M9.5 16v5M14.5 16v5M8 11l-3 4M16 11l3 4" /></svg>;
    case 'cleaning':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4v2M12 18v2" /></svg>;
    case 'service':
      return <svg {...common}><path d="M3 6h3l2 9h9l2-6H8" /><circle cx="10" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>;
    case 'drone':
      return <svg {...common}><path d="M8 8l8 8M16 8l-8 8" /><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><rect x="10" y="10" width="4" height="4" rx="1" /></svg>;
    default:
      return <svg {...common}><rect x="5" y="5" width="14" height="14" rx="2" /></svg>;
  }
}
