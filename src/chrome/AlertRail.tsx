import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import type { Alert, Severity, ZoneId } from '@/lib/types';
import { ZONE_BY_ID, ZONES } from '@/data/zones';
import { agentName } from '@/data/agents';
import { fmtTime, demoNow } from '@/lib/time';
import { WhyButton } from '@/agents/ReasoningChain';

const SEV: { id: Severity | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'elevated', label: 'Elevated' },
  { id: 'low', label: 'Low' },
];

export function AlertRail() {
  const alerts = useStore((s) => s.alerts);
  const replayAt = useStore((s) => s.replayAt);
  const openIncident = useStore((s) => s.openIncident);
  const setView = useStore((s) => s.setView);
  const selectZone = useStore((s) => s.selectZone);
  const [sev, setSev] = useState<Severity | 'all'>('all');
  const [zone, setZone] = useState<ZoneId | 'all'>('all');
  const reduced = useReducedMotion();

  const list = useMemo(() => {
    let l = alerts;
    if (replayAt) {
      l = l.filter((a) => a.ts <= replayAt).map((a) => (replayAt - a.ts < 90_000 && a.state === 'resolved' ? { ...a, state: 'triaging' as const, resolution: undefined } : a));
    }
    if (sev !== 'all') l = l.filter((a) => a.severity === sev);
    if (zone !== 'all') l = l.filter((a) => a.zoneId === zone);
    return l.slice(0, 80);
  }, [alerts, sev, zone, replayAt]);

  const openCount = alerts.filter((a) => a.state !== 'resolved').length;
  const resolvedByAgents = alerts.filter((a) => a.state === 'resolved' && a.resolution?.includes('dismissed by')).length;

  return (
    <aside className="w-[var(--rail-w)] shrink-0 border-l hairline bg-surface-raised flex flex-col min-h-0" aria-label="Alert rail">
      <div className="px-3 pt-2 pb-1.5 border-b hairline shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-12 text-text-muted">Alerts</div>
          <div className="text-11 text-text-muted">
            <span className={openCount ? 'text-advisory' : ''}>{openCount} open</span> · {resolvedByAgents} dismissed by agents
          </div>
        </div>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {SEV.map((s) => (
            <button key={s.id} type="button" className="chip" aria-pressed={sev === s.id} onClick={() => setSev(s.id)}>{s.label}</button>
          ))}
          <select className="chip bg-transparent ml-auto cursor-pointer" value={zone} onChange={(e) => setZone(e.target.value as ZoneId | 'all')} aria-label="Filter by zone">
            <option value="all">All zones</option>
            {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" role="list">
        <AnimatePresence initial={false}>
          {list.map((a) => (
            <motion.li
              key={a.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduced ? undefined : { opacity: 0, height: 0, x: 40, transition: { duration: 0.45, ease: 'easeIn' } }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <AlertRow
                a={a}
                onClick={() => {
                  if (a.incidentId) openIncident(a.incidentId);
                  else if (a.actionId) setView('approvals');
                  else selectZone(a.zoneId);
                }}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </aside>
  );
}

function AlertRow({ a, onClick }: { a: Alert; onClick: () => void }) {
  const isNew = a.arrivedAt !== undefined && Date.now() - a.arrivedAt < 1500;
  const stripe = a.severity === 'high' ? 'var(--alarm)' : a.severity === 'elevated' ? 'var(--advisory)' : 'var(--line)';
  const stateColor = a.state === 'resolved' ? 'var(--text-muted)' : a.state === 'awaiting approval' ? 'var(--advisory)' : a.severity === 'high' ? 'var(--alarm)' : 'var(--advisory)';
  const merged = a.mergedInto !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left px-3 py-1.5 border-b border-line/50 hover:bg-surface-inset/60 ${isNew ? 'alert-new' : ''}`}
      style={{ boxShadow: `inset 3px 0 0 ${stripe}`, ['--stripe' as string]: stripe, ['--flash' as string]: a.severity === 'high' ? 'var(--alarm)' : 'var(--advisory)' }}
    >
      <div className="flex items-center gap-2 text-11">
        <span className="mono text-text-muted">{fmtTime(a.ts)}</span>
        <span className="text-text-muted truncate">{ZONE_BY_ID[a.zoneId]?.name}</span>
        <span className="ml-auto shrink-0" style={{ color: stateColor }}>{a.state}</span>
      </div>
      <div className={`text-12 leading-4 mt-0.5 ${a.state === 'resolved' ? 'text-text-primary/80' : 'text-text-primary'}`}>{a.text}</div>
      <div className="flex items-center gap-2 text-11 mt-0.5">
        <span className="agent-text">{agentName(a.agentId)}</span>
        {a.resolution && <span className="text-text-muted truncate">· {a.resolution}</span>}
        {merged && <span className="text-text-muted">· merged</span>}
        {a.actionId && <span className="ml-auto"><WhyButton actionId={a.actionId} /></span>}
      </div>
    </button>
  );
}

export function alertAge(a: Alert) {
  return demoNow() - a.ts;
}
