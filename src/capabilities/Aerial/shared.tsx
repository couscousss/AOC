import type { Asset, AssetState } from '@/lib/types';

export type AerialTab = 'fleet' | 'plan' | 'live' | 'airspace' | 'auto';
export const AERIAL_TABS: { id: AerialTab; label: string }[] = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'plan', label: 'Flight planning' },
  { id: 'live', label: 'Live flight' },
  { id: 'airspace', label: 'Airspace' },
  { id: 'auto', label: 'Auto-launch' },
];

export const isDrone = (a: Asset) => a.class === 'drone';
export const isAirborne = (a: Asset) => a.state === 'airborne' || a.state === 'returning';
export const isReady = (a: Asset) => a.state === 'docked' || a.state === 'charging';

export const DRONE_STATE_LABEL: Record<AssetState, string> = {
  docked: 'Docked in nest',
  charging: 'Charging in nest',
  patrolling: 'Airborne, patrol',
  tasked: 'Airborne, tasked',
  returning: 'Returning to nest',
  maintenance: 'Held for maintenance',
  airborne: 'Airborne',
};

export function attentionScore(a: Asset) {
  if (a.maintenance.flagged || a.state === 'maintenance') return 6;
  if (a.battery < 30) return 5;
  if (a.connectivity === 'lost' || a.connectivity === 'poor') return 4;
  if (isAirborne(a)) return 3;
  return 1;
}

export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function DroneIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 8l8 8M16 8l-8 8" />
      <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
    </svg>
  );
}
