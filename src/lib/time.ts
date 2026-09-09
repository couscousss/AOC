import { format } from 'date-fns';

/** The demo's fixed "now": 04:17 local, pre-dawn. All mock timestamps hang off this. */
export const DEMO_NOW = new Date(2026, 2, 14, 4, 17, 0, 0).getTime();
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEMO_START = DEMO_NOW - DAY_MS;

const bootWall = Date.now();
/** Wall clock mapped into demo time. Ticks forward from DEMO_NOW at real speed. */
export function demoNow(): number {
  return DEMO_NOW + (Date.now() - bootWall);
}

/** Offset in ms relative to DEMO_NOW. Negative = in the past. */
export const ago = (ms: number) => DEMO_NOW - ms;
export const min = (n: number) => n * 60 * 1000;
export const hr = (n: number) => n * 60 * 60 * 1000;
export const sec = (n: number) => n * 1000;

export const fmtTime = (t: number | string) => format(new Date(t), 'HH:mm:ss');
export const fmtClock = (t: number | string) => format(new Date(t), 'HH:mm');
export const fmtDateTime = (t: number | string) => format(new Date(t), 'dd MMM HH:mm:ss');
export const fmtDate = (t: number | string) => format(new Date(t), 'dd MMM yyyy');
export const fmtIso = (t: number) => new Date(t).toISOString();

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r.toString().padStart(2, '0')}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, '0')}m`;
}

export function relTime(t: number, now = demoNow()) {
  const d = now - t;
  if (d < 0) return 'in ' + fmtDuration(-d);
  if (d < sec(45)) return `${Math.round(d / 1000)}s ago`;
  if (d < hr(1)) return `${Math.round(d / min(1))}m ago`;
  if (d < hr(24)) return `${Math.floor(d / hr(1))}h ${Math.round((d % hr(1)) / min(1))}m ago`;
  return fmtDateTime(t);
}
