import type { ReactNode } from 'react';
import type { Evidence, IncidentState, Severity, TimelineEvent } from '@/lib/types';
import { makeRng } from '@/lib/rng';
import { fmtDateTime } from '@/lib/time';

/* ---------- severity, state and provenance colours ---------- */

export const SEVERITY_LABEL: Record<Severity, string> = { high: 'High', elevated: 'Elevated', low: 'Low' };
export const STATE_LABEL: Record<IncidentState, string> = { open: 'Open', contained: 'Contained', closed: 'Closed' };

export const severityColor = (s: Severity) => (s === 'high' ? 'var(--alarm)' : s === 'elevated' ? 'var(--advisory)' : 'var(--text-muted)');
export const severityBorder = (s: Severity) => (s === 'high' ? 'rgba(229,72,77,0.55)' : s === 'elevated' ? 'rgba(224,169,59,0.55)' : 'var(--line)');
export const stateColor = (s: IncidentState) => (s === 'open' ? 'var(--advisory)' : s === 'contained' ? 'var(--text-primary)' : 'var(--text-muted)');
/** Agent events in --agent, human events in primary text, system in muted. The whole point of the timeline. */
export const actorColor = (actor: TimelineEvent['actor']) => (actor === 'human' ? 'var(--text-primary)' : actor === 'system' ? 'var(--text-muted)' : 'var(--agent)');

export function SeverityChip({ severity, className = '', size = 11 }: { severity: Severity; className?: string; size?: 11 | 12 }) {
  const color = severityColor(severity);
  return (
    <span className={`chip ${className}`} style={{ color, borderColor: severityBorder(severity), fontSize: size, lineHeight: size === 12 ? '18px' : undefined }}>
      <span className="dot" style={{ background: color }} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function StateText({ state }: { state: IncidentState }) {
  return <span style={{ color: stateColor(state) }}>{STATE_LABEL[state]}</span>;
}

/** Pull a number plate out of an evidence label or detail, e.g. "CAM-RD-E ANPR read SGP-6120". */
export function plateFrom(e: Evidence): string | null {
  const m = `${e.label} ${e.detail ?? ''}`.match(/\b[A-Z]{2,3}-\d{3,4}\b/);
  return m ? m[0] : null;
}

/* ---------- evidence visuals (all 16:9, all deterministic) ---------- */

function AspectBox({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full bg-surface-inset" style={{ aspectRatio: '16 / 9' }}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

const polar = (cx: number, cy: number, deg: number, r: number): [number, number] => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r];

/** Ground radar plan-position plot: a 120° sector, range rings, a slow sweep and the track that started it all. */
export function RadarPlot({ label, detail }: { label: string; detail?: string }) {
  if (/spectrum|\bRF-/i.test(label)) return <SpectrumPlot />;
  const d = detail ?? '';
  const bearing = Number(d.match(/bearing\s+(\d{1,3})/i)?.[1] ?? '58');
  const rangeM = Number(d.match(/(\d{2,4})\s*m\b/i)?.[1] ?? '118');
  const W = 160, H = 90, cx = 80, cy = 86, R = 78, MAX = 250;
  const r = Math.min(R - 4, Math.max(8, (rangeM / MAX) * R));
  const ang = bearing - 90;
  const [px, py] = polar(cx, cy, ang, r);
  const trail = [0.84, 0.88, 0.92, 0.96].map((f, i) => polar(cx, cy, ang - 1.6 * (4 - i), r * f));
  const [e1x, e1y] = polar(cx, cy, -150, R);
  const [e2x, e2y] = polar(cx, cy, -30, R);
  return (
    <AspectBox>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block" aria-label={`Radar track plot, bearing ${bearing}, range ${rangeM} metres`}>
        <rect width={W} height={H} fill="var(--surface-inset)" />
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const [x1, y1] = polar(cx, cy, -150, R * f);
          const [x2, y2] = polar(cx, cy, -30, R * f);
          return <path key={f} d={`M ${x1} ${y1} A ${R * f} ${R * f} 0 0 1 ${x2} ${y2}`} fill="none" stroke="var(--line)" strokeWidth="0.7" />;
        })}
        <line x1={cx} y1={cy} x2={e1x} y2={e1y} stroke="var(--line)" strokeWidth="0.7" />
        <line x1={cx} y1={cy} x2={e2x} y2={e2y} stroke="var(--line)" strokeWidth="0.7" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - R} stroke="var(--text-muted)" strokeWidth="0.8" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" values={`-60 ${cx} ${cy};60 ${cx} ${cy};-60 ${cx} ${cy}`} dur="6s" repeatCount="indefinite" />
        </line>
        {trail.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill="var(--text-primary)" opacity={0.2 + i * 0.15} />
        ))}
        <circle cx={px} cy={py} r="5" fill="var(--text-primary)" opacity="0.18" />
        <circle cx={px} cy={py} r="2.2" fill="var(--text-primary)" />
        <text x={px + 5} y={py - 3} fontSize="6" fill="var(--text-primary)" fontFamily="IBM Plex Mono, monospace">
          {bearing.toString().padStart(3, '0')} · {rangeM}m
        </text>
        <text x="4" y="9" fontSize="5.5" fill="var(--text-muted)" fontFamily="IBM Plex Mono, monospace">PPI · {MAX}m</text>
        <text x={W - 4} y={H - 4} fontSize="5.5" textAnchor="end" fill="var(--agent)" fontFamily="IBM Plex Mono, monospace">unclassified track</text>
      </svg>
    </AspectBox>
  );
}

/** RF spectrum capture: a band of bars with one control-link peak. */
function SpectrumPlot() {
  const W = 160, H = 90, n = 32;
  const rng = makeRng(2412);
  const bars = Array.from({ length: n }, (_, i) => (i === 19 ? 62 : 6 + rng.float(0, 14)));
  return (
    <AspectBox>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block" aria-label="RF spectrum capture">
        <rect width={W} height={H} fill="var(--surface-inset)" />
        {[20, 40, 60].map((y) => <line key={y} x1="0" y1={H - y} x2={W} y2={H - y} stroke="var(--line)" strokeWidth="0.5" />)}
        {bars.map((h, i) => (
          <rect key={i} x={4 + i * 4.75} y={H - 8 - h} width="3.2" height={h} fill={i === 19 ? 'var(--text-primary)' : 'var(--text-muted)'} opacity={i === 19 ? 1 : 0.55} />
        ))}
        <text x="4" y="9" fontSize="5.5" fill="var(--text-muted)" fontFamily="IBM Plex Mono, monospace">2.400 – 2.483 GHz</text>
        <text x={W - 4} y={H - 12} fontSize="5.5" textAnchor="end" fill="var(--agent)" fontFamily="IBM Plex Mono, monospace">control link · consumer UAS</text>
      </svg>
    </AspectBox>
  );
}

/** Fence vibration trace: a flat, faintly noisy baseline with the pulses that tripped it. */
export function FenceTrace({ detail, seed = 1 }: { detail?: string; seed?: number }) {
  const d = detail ?? '';
  const pulses = Math.max(1, Math.min(6, Number(d.match(/(\d+)\s+pulses?/i)?.[1] ?? '2')));
  const ampLabel = /high/i.test(d) ? 'high' : /very low/i.test(d) ? 'very low' : /low/i.test(d) ? 'low' : 'medium';
  const amp = ampLabel === 'high' ? 30 : ampLabel === 'very low' ? 5 : ampLabel === 'low' ? 10 : 20;
  const W = 160, H = 90, mid = 48;
  const rng = makeRng(seed * 97 + pulses);
  const centers = Array.from({ length: pulses }, (_, i) => W * (0.26 + (0.52 * (i + 0.5)) / pulses));
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 1) {
    let y = mid + (rng.next() - 0.5) * 2.4;
    for (const c of centers) {
      const dx = x - c;
      if (dx >= 0 && dx < 30) y += Math.sin(dx * 1.15) * amp * Math.exp(-dx / 8);
    }
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <AspectBox>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block" aria-label={`Fence vibration trace, ${pulses} pulses, amplitude ${ampLabel}`}>
        <rect width={W} height={H} fill="var(--surface-inset)" />
        {[20, 40, 60, 80, 100, 120, 140].map((x) => <line key={x} x1={x} y1="12" x2={x} y2={H - 8} stroke="var(--line)" strokeWidth="0.4" />)}
        <line x1="0" y1={mid - 14} x2={W} y2={mid - 14} stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
        <line x1="0" y1={mid + 14} x2={W} y2={mid + 14} stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
        <polyline points={pts.join(' ')} fill="none" stroke="var(--text-primary)" strokeWidth="0.9" strokeLinejoin="round" />
        <text x="4" y="9" fontSize="5.5" fill="var(--text-muted)" fontFamily="IBM Plex Mono, monospace">FNC · vibration · 10s</text>
        <text x={W - 4} y={H - 4} fontSize="5.5" textAnchor="end" fill="var(--text-primary)" fontFamily="IBM Plex Mono, monospace">
          {pulses} pulse{pulses === 1 ? '' : 's'} · {ampLabel}
        </text>
      </svg>
    </AspectBox>
  );
}

/** A number plate as the ANPR reader returned it. */
export function PlateTile({ plate, sub }: { plate: string; sub?: string }) {
  return (
    <AspectBox>
      <div className="h-full w-full flex flex-col items-center justify-center gap-1">
        <div className="mono text-20 font-medium px-3 py-0.5 rounded-[3px] border text-text-primary" style={{ borderColor: 'var(--text-muted)', background: 'rgba(220,230,236,0.06)', letterSpacing: '0.06em' }}>
          {plate}
        </div>
        {sub && <div className="text-11 text-text-muted">{sub}</div>}
      </div>
    </AspectBox>
  );
}

/** Small plate read burned into the corner of a road-camera frame. */
export function PlateOverlay({ plate }: { plate: string }) {
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 mono text-11 px-1.5 rounded-[2px] border text-text-primary pointer-events-none" style={{ borderColor: 'rgba(220,230,236,0.5)', background: 'rgba(10,16,19,0.75)' }}>
      {plate}
    </div>
  );
}

/** A log line as the system emitted it. */
export function LogTile({ ts, sensorId, detail }: { ts: number; sensorId?: string; detail?: string }) {
  return (
    <AspectBox>
      <div className="h-full w-full p-2 mono text-11 leading-4 overflow-hidden">
        <div className="text-text-muted">
          {fmtDateTime(ts)}
          {sensorId ? ` ${sensorId}` : ''}
        </div>
        <div className="text-text-primary/90 break-words">
          <span className="text-text-muted">&gt; </span>
          {detail ?? 'No detail recorded.'}
        </div>
      </div>
    </AspectBox>
  );
}
