import { useMemo, useState } from 'react';
import { useStore, selectLiveIncident } from '@/store/useStore';
import type { Incident, ZoneId } from '@/lib/types';
import { ZONES, ZONE_BY_ID } from '@/data/zones';
import { agentName } from '@/data/agents';
import { DAY_MS, demoNow, fmtDuration, fmtTime } from '@/lib/time';
import { EmptyState, Stat } from '@/ui/bits';
import { SeverityChip, StateText } from './incidentBits';

type Filter = 'all' | 'open' | 'closed' | 'human' | 'agents';

const FILTERS: { id: Filter; label: string; title: string }[] = [
  { id: 'all', label: 'All', title: 'Every incident in the last 24 hours' },
  { id: 'open', label: 'Open', title: 'Open or contained, not yet closed' },
  { id: 'closed', label: 'Closed', title: 'Closed incidents' },
  { id: 'human', label: 'Human decision required', title: 'Incidents where a person made at least one decision' },
  { id: 'agents', label: 'Agents only', title: 'Resolved by the agents with no human involvement' },
];

const matches = (i: Incident, f: Filter) =>
  f === 'all' ? true : f === 'open' ? i.state !== 'closed' : f === 'closed' ? i.state === 'closed' : f === 'human' ? i.humanDecisions > 0 : i.humanDecisions === 0;

/** Full-stage list of every incident the agents opened, newest first. The live one is pinned. */
export function IncidentList() {
  const incidents = useStore((s) => s.incidents);
  const live = useStore(selectLiveIncident);
  const replayAt = useStore((s) => s.replayAt);
  const openIncident = useStore((s) => s.openIncident);
  const [filter, setFilter] = useState<Filter>('all');
  const [zone, setZone] = useState<ZoneId | 'all'>('all');

  const now = demoNow();
  const visible = useMemo(() => (replayAt ? incidents.filter((i) => i.openedAt <= replayAt) : incidents), [incidents, replayAt]);

  const closed = visible.filter((i) => i.state === 'closed');
  const counts = {
    open: visible.filter((i) => i.state === 'open').length,
    contained: visible.filter((i) => i.state === 'contained').length,
    closed24h: closed.filter((i) => (i.closedAt ?? i.openedAt) >= now - DAY_MS).length,
    human: visible.reduce((n, i) => n + i.humanDecisions, 0),
    agentsOnly: closed.filter((i) => i.humanDecisions === 0).length,
  };
  const agentsOnlyPct = closed.length ? Math.round((counts.agentsOnly / closed.length) * 100) : 0;

  const rows = useMemo(() => {
    let l = visible.filter((i) => matches(i, filter));
    if (zone !== 'all') l = l.filter((i) => i.zoneId === zone);
    l = [...l].sort((a, b) => b.openedAt - a.openedAt);
    if (live) {
      const idx = l.findIndex((i) => i.id === live.id);
      if (idx > 0) {
        const [pinned] = l.splice(idx, 1);
        l.unshift(pinned);
      }
    }
    return l;
  }, [visible, filter, zone, live]);

  const reset = () => { setFilter('all'); setZone('all'); };

  return (
    <div className="h-full min-h-0 flex flex-col px-6 pt-4 pb-4 gap-3">
      <header className="flex items-end justify-between gap-6 shrink-0">
        <div className="min-w-0">
          <h1 className="text-20 font-medium">Incidents</h1>
          <div className="text-12 text-text-muted mt-0.5">
            Every incident the agents opened in the last 24 hours, newest first. Click a row for the map, the evidence, the full timeline and Scribe's report.
          </div>
        </div>
        <div className="flex gap-8 shrink-0">
          <Stat label="Open" value={counts.open} tone={counts.open ? 'advisory' : undefined} sub={live ? `${live.id} is live` : 'nothing open'} />
          <Stat label="Contained" value={counts.contained} />
          <Stat label="Closed in 24h" value={counts.closed24h} />
          <Stat label="Human decisions" value={counts.human} sub="across all incidents" />
          <Stat label="Resolved without a human" value={counts.agentsOnly} tone="agent" sub={`${agentsOnlyPct}% of closed`} />
        </div>
      </header>

      <div className="flex items-center gap-1 shrink-0 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} title={f.title}>
            {f.label}
          </button>
        ))}
        <select className="chip bg-transparent ml-2 cursor-pointer" value={zone} onChange={(e) => setZone(e.target.value as ZoneId | 'all')} aria-label="Filter by zone">
          <option value="all">All zones</option>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <span className="ml-auto text-11 text-text-muted">
          {rows.length} of {visible.length}
          {replayAt ? <span className="text-advisory"> · replay, up to {fmtTime(replayAt)}</span> : null}
        </span>
      </div>

      <div className="panel flex-1 min-h-0 overflow-auto">
        {rows.length === 0 ? (
          <EmptyState
            title="No incidents match"
            body={`Nothing in the last 24 hours fits this filter. Clear it to see all ${visible.length} incidents.`}
            action={<button type="button" className="btn btn-sm" onClick={reset}>Show all</button>}
          />
        ) : (
          <table className="data">
            <thead>
              <tr>
                {['Incident', 'Title', 'Zone', 'Severity', 'State', 'Opened', 'Duration', 'Opened by', 'Sensors', 'Assets', 'Human decisions'].map((h) => (
                  <th key={h} className="sticky top-0 bg-surface-raised z-10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const isLive = live?.id === i.id;
                return (
                  <tr
                    key={i.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => openIncident(i.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIncident(i.id); } }}
                    title={i.summary}
                  >
                    <td className="mono whitespace-nowrap">
                      {isLive && <span className="dot bg-advisory animate-pulse mr-1.5 align-middle" style={{ boxShadow: '0 0 6px var(--advisory)' }} aria-label="live" />}
                      {i.id}
                      {isLive && <span className="ml-1.5 text-advisory text-11">live</span>}
                    </td>
                    <td className="text-text-primary">{i.title}</td>
                    <td className="text-text-muted whitespace-nowrap">{ZONE_BY_ID[i.zoneId]?.name ?? i.zoneId}</td>
                    <td><SeverityChip severity={i.severity} /></td>
                    <td><StateText state={i.state} /></td>
                    <td className="mono whitespace-nowrap">{fmtTime(i.openedAt)}</td>
                    <td className="mono whitespace-nowrap">
                      {i.closedAt ? fmtDuration(i.closedAt - i.openedAt) : <span className="text-advisory">open · {fmtDuration(now - i.openedAt)}</span>}
                    </td>
                    <td className="agent-text whitespace-nowrap">{agentName(i.openedBy)}</td>
                    <td className="mono">{i.sensorIds.length}</td>
                    <td className="mono">{i.assetIds.length}</td>
                    <td className="mono whitespace-nowrap">{i.humanDecisions === 0 ? <span className="text-text-muted">0 — agents only</span> : i.humanDecisions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
