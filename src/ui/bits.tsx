import type { ReactNode } from 'react';
import type { AgentState, Autonomy, SensorStatus, Severity } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';

export function StatusDot({ status, className = '' }: { status: SensorStatus | 'nominal' | 'advisory' | 'alarm' | 'good' | 'fair' | 'poor' | 'lost'; className?: string }) {
  const color =
    status === 'nominal' || status === 'good' ? 'var(--nominal)'
      : status === 'degraded' || status === 'advisory' || status === 'fair' || status === 'poor' ? 'var(--advisory)'
        : 'var(--alarm)';
  return <span className={`dot ${className}`} style={{ background: color }} aria-label={status} />;
}

export function SeverityStripe({ severity }: { severity: Severity }) {
  const color = severity === 'high' ? 'var(--alarm)' : severity === 'elevated' ? 'var(--advisory)' : 'var(--line)';
  return <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: color }} />;
}

export function Panel({ title, right, children, className = '', bodyClass = '', inset }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; inset?: boolean }) {
  return (
    <section className={`${inset ? 'inset' : 'panel'} flex flex-col min-h-0 ${className}`}>
      {title !== undefined && (
        <header className="flex items-center justify-between px-3 py-1.5 border-b hairline shrink-0">
          <div className="text-12 text-text-muted">{title}</div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-6 gap-1">
      <div className="text-14 text-text-primary">{title}</div>
      {body && <div className="text-12 text-text-muted max-w-sm">{body}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'agent' | 'advisory' | 'alarm' | 'nominal' }) {
  const color = tone === 'agent' ? 'var(--agent)' : tone === 'advisory' ? 'var(--advisory)' : tone === 'alarm' ? 'var(--alarm)' : tone === 'nominal' ? 'var(--nominal)' : undefined;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="label truncate">{label}</div>
      <div className="text-20 font-medium leading-6 truncate" style={{ color }}>{value}</div>
      {sub && <div className="text-11 text-text-muted truncate">{sub}</div>}
    </div>
  );
}

export function Sparkline({ data, width = 96, height = 24, color = 'var(--agent)', className = '' }: { data: number[]; width?: number; height?: number; color?: string; className?: string }) {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * width},${height - (v / max) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

export function Battery({ pct, charging }: { pct: number; charging?: boolean }) {
  const color = pct < 20 ? 'var(--alarm)' : pct < 40 ? 'var(--advisory)' : 'var(--nominal)';
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Battery ${pct}%`}>
      <span className="relative inline-block w-6 h-3 border hairline rounded-[2px]">
        <span className="absolute left-[1px] top-[1px] bottom-[1px] rounded-[1px]" style={{ width: `${Math.max(2, (pct / 100) * 20)}px`, background: color }} />
        <span className="absolute -right-[3px] top-[3px] w-[2px] h-[4px] bg-line" />
      </span>
      <span className="mono text-11">{pct}%{charging ? ' ⚡' : ''}</span>
    </span>
  );
}

export const AGENT_STATE_LABEL: Record<AgentState, string> = {
  watching: 'watching',
  investigating: 'investigating',
  'awaiting-approval': 'awaiting approval',
  acting: 'acting',
  degraded: 'degraded',
};

export function agentStateColor(s: AgentState) {
  return s === 'degraded' ? 'var(--alarm)' : s === 'awaiting-approval' ? 'var(--advisory)' : 'var(--agent)';
}

export function autonomyLabel(a: Autonomy) {
  return AUTONOMY_LABELS[a];
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <div className="text-12 text-text-muted">{children}</div>
      {right}
    </div>
  );
}
