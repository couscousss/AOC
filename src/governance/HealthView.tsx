import { useMemo, useState } from 'react';
import type { Asset, Sensor, SensorStatus, SensorType, ZoneId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { ZONES, ZONE_BY_ID } from '@/data/zones';
import { MEMORY } from '@/data/memory';
import { ASSET_CLASS_LABEL } from '@/data/assets';
import { AgentChip } from '@/agents/AgentChip';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { Battery, EmptyState, Panel, Sparkline, Stat, StatusDot } from '@/ui/bits';
import { makeRng } from '@/lib/rng';
import { DAY_MS, DEMO_NOW, ago, fmtClock, fmtDate, min, relTime } from '@/lib/time';

/** Fitter's working notes on the sensors that are not nominal. Short form for the table; the memory entry carries the detail. */
const FITTER_NOTES: Record<string, string> = {
  'CAM-P-W1': 'Media converter fault, ticket FM-1187',
  'CAM-P-N3': 'Exposure drift after midnight, recalibrated 04:00, still degraded',
  'FNC-S-01': 'Intermittent in rain',
  'FLD-LG-01': 'Tripped 3× in 30 days with rain, swap pending',
};

/** Tickets already open when the shift started. */
const EXISTING_TICKETS: Record<string, string> = { 'CAM-P-W1': 'FM-1187' };
const FIRST_NEW_TICKET = 1188;

const TYPE_LABEL: Record<SensorType, string> = {
  camera: 'Camera', thermal: 'Thermal', radar: 'Radar', fence: 'Fence', acoustic: 'Acoustic', rf: 'RF monitor', gas: 'Gas', flood: 'Flood', door: 'Door', anpr: 'ANPR',
};

const STATUS_RANK: Record<SensorStatus, number> = { offline: 0, degraded: 1, nominal: 2 };

type SortKey = 'id' | 'type' | 'zone' | 'status' | 'uptime' | 'lastCheck';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };
type Row = { s: Sensor; zoneName: string; lastCheck: number; note?: string; spark: number[] };

const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

/** Hourly uptime for the last 24 h, deterministic per sensor. Offline sensor drops to zero at 21:40 (index 17). */
function uptimeSeries(s: Sensor): number[] {
  const rng = makeRng(hash(s.id));
  return Array.from({ length: 24 }, (_, i) => {
    if (s.status === 'offline') return i >= 17 ? 0 : 100;
    if (s.status === 'degraded') return rng.chance(0.35) ? rng.int(55, 90) : 100;
    return rng.chance(0.06) ? rng.int(94, 99) : 100;
  });
}

function lastCheckFor(s: Sensor): number {
  if (s.id === 'CAM-P-N3') return ago(min(17));
  if (s.status === 'offline') return ago(min(12));
  const rng = makeRng(hash(s.id) ^ 0x5bd1e995);
  return DEMO_NOW - min(rng.int(1, 14));
}

function noteFor(s: Sensor): string | undefined {
  if (s.status === 'nominal') return undefined;
  return FITTER_NOTES[s.id] ?? MEMORY.fitter.find((m) => m.subject === s.id)?.fact ?? 'Under investigation, no fault isolated yet';
}

export function HealthView() {
  const sensors = useStore((s) => s.sensors);
  const assets = useStore((s) => s.assets);
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);

  const [statusFilter, setStatusFilter] = useState<SensorStatus | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<ZoneId | 'all'>('all');
  const [sort, setSort] = useState<Sort>({ key: 'status', dir: 'asc' });
  const [tickets, setTickets] = useState<Record<string, string>>(EXISTING_TICKETS);

  const rows = useMemo<Row[]>(
    () => sensors.map((s) => ({ s, zoneName: ZONE_BY_ID[s.zoneId].name, lastCheck: lastCheckFor(s), note: noteFor(s), spark: uptimeSeries(s) })),
    [sensors],
  );

  const counts = useMemo(() => {
    const c = { nominal: 0, degraded: 0, offline: 0 };
    for (const s of sensors) c[s.status]++;
    return c;
  }, [sensors]);
  const meanUptime = sensors.length ? sensors.reduce((n, s) => n + s.uptimePct, 0) / sensors.length : 0;
  const assetsOnline = assets.filter((a) => a.connectivity !== 'lost').length;

  const visible = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const cmp = (a: Row, b: Row): number => {
      switch (sort.key) {
        case 'id': return a.s.id.localeCompare(b.s.id);
        case 'type': return TYPE_LABEL[a.s.type].localeCompare(TYPE_LABEL[b.s.type]);
        case 'zone': return a.zoneName.localeCompare(b.zoneName);
        case 'status': return STATUS_RANK[a.s.status] - STATUS_RANK[b.s.status];
        case 'uptime': return a.s.uptimePct - b.s.uptimePct;
        case 'lastCheck': return a.lastCheck - b.lastCheck;
      }
    };
    return rows
      .filter((r) => (statusFilter === 'all' || r.s.status === statusFilter) && (zoneFilter === 'all' || r.s.zoneId === zoneFilter))
      .sort((a, b) => cmp(a, b) * dir || a.s.id.localeCompare(b.s.id));
  }, [rows, sort, statusFilter, zoneFilter]);

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const raiseTicket = (r: Row) => {
    if (tickets[r.s.id]) return;
    const id = `FM-${FIRST_NEW_TICKET + Object.keys(tickets).length - Object.keys(EXISTING_TICKETS).length}`;
    setTickets((t) => ({ ...t, [r.s.id]: id }));
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Raised maintenance ticket', target: r.s.id, record: { ticket: id, status: r.s.status, fault: r.note ?? '' } });
    pushFeed('fitter', `Ticket ${id} raised for ${r.s.id} by ${DUTY_OFFICER}: ${r.note ?? 'no fault text'}. Added to the day-shift work list; parts checked against workshop stock.`);
  };

  const openTickets = Object.keys(tickets).length;
  const statusLine = `Sweep complete ${fmtClock(ago(min(12)))}: ${sensors.length} sensors checked, ${counts.degraded} degraded, ${counts.offline} offline. CAM-P-W1 is the only coverage gap and THM-P-SW covers most of it. Next sweep ${fmtClock(DEMO_NOW + min(48))}.`;

  const chip = (label: string, value: SensorStatus | 'all', n: number) => (
    <button key={value} type="button" className="chip" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
      {value !== 'all' && <StatusDot status={value} />}
      {label} <span className="mono">{n}</span>
    </button>
  );

  return (
    <div className="h-full min-h-0 flex flex-col p-4 gap-3">
      <header className="shrink-0 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-20 font-medium">Health</h1>
            <AgentChip agentId="fitter" />
          </div>
          <div className="text-12 agent-text mt-0.5">{statusLine}</div>
        </div>
        <div className="panel px-4 py-2 grid grid-cols-6 gap-6 shrink-0">
          <Stat label="Sensors online" value={<span>{counts.nominal + counts.degraded}<span className="text-14 text-text-muted"> / {sensors.length}</span></span>} sub="responding to health checks" />
          <Stat label="Degraded" value={counts.degraded} tone={counts.degraded ? 'advisory' : undefined} sub="reduced confidence" />
          <Stat label="Offline" value={counts.offline} tone={counts.offline ? 'alarm' : undefined} sub="coverage gap" />
          <Stat label="Assets online" value={<span>{assetsOnline}<span className="text-14 text-text-muted"> / {assets.length}</span></span>} sub="fleet link up" />
          <Stat label="Mean uptime" value={<span className="mono">{meanUptime.toFixed(1)}%</span>} sub="30 days, all sensors" />
          <Stat label="Open tickets" value={openTickets} sub="facilities maintenance" />
        </div>
      </header>

      <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) 500px' }}>
        <Panel
          title={<span>Sensors <span className="mono">{visible.length}</span> of {sensors.length}</span>}
          right={
            <>
              {chip('All', 'all', sensors.length)}
              {chip('Nominal', 'nominal', counts.nominal)}
              {chip('Degraded', 'degraded', counts.degraded)}
              {chip('Offline', 'offline', counts.offline)}
              <select className="field !w-auto !py-0.5 text-12" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value as ZoneId | 'all')} aria-label="Zone">
                <option value="all">All zones</option>
                {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </>
          }
          bodyClass="overflow-auto"
        >
          {visible.length === 0 ? (
            <EmptyState title="No sensors match" body="Nothing in this zone has that status. Clear a filter to see the rest of the estate." action={<button type="button" className="btn btn-sm" onClick={() => { setStatusFilter('all'); setZoneFilter('all'); }}>Clear filters</button>} />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <Th label="Id" k="id" sort={sort} onSort={onSort} />
                  <Th label="Type" k="type" sort={sort} onSort={onSort} />
                  <Th label="Zone" k="zone" sort={sort} onSort={onSort} />
                  <Th label="Status" k="status" sort={sort} onSort={onSort} />
                  <Th label="Uptime %" k="uptime" sort={sort} onSort={onSort} className="text-right" />
                  <th className="sticky top-0 bg-surface-raised">24 h</th>
                  <Th label="Last check" k="lastCheck" sort={sort} onSort={onSort} />
                  <th className="sticky top-0 bg-surface-raised" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <SensorRow key={r.s.id} r={r} ticket={tickets[r.s.id]} onRaise={() => raiseTicket(r)} />
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="min-h-0 flex flex-col gap-3">
          <Panel title={<span>Assets <span className="mono">{assets.length}</span></span>} right={<span className="text-11 text-text-muted">battery, link, service</span>} className="shrink-0 max-h-[58%]" bodyClass="overflow-auto">
            <AssetTable assets={assets} />
          </Panel>
          <Panel title="What Fitter knows" right={<span className="text-11 text-text-muted">memory, {MEMORY.fitter.length} entries</span>} className="flex-1" bodyClass="overflow-auto">
            <ul className="divide-y divide-line/50">
              {MEMORY.fitter.map((m) => (
                <li key={m.id} className="px-3 py-1.5">
                  <div className="flex items-center gap-2 text-12">
                    <span className="font-medium">{m.subject}</span>
                    <span className="mono text-11 text-text-muted ml-auto">{relTime(m.learnedAt)}</span>
                    <span className="mono text-11 text-text-muted">{Math.round(m.confidence * 100)}%</span>
                  </div>
                  <div className="text-12 agent-text">{m.fact}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Th({ label, k, sort, onSort, className = '' }: { label: string; k: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`sticky top-0 bg-surface-raised ${className}`}>
      <button type="button" className={`inline-flex items-center gap-1 hover:text-text-primary ${active ? 'text-text-primary' : ''}`} onClick={() => onSort(k)} title={`Sort by ${label.toLowerCase()}`}>
        {label}
        <span className="text-[9px] w-2 inline-block" aria-hidden>{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

function SensorRow({ r, ticket, onRaise }: { r: Row; ticket?: string; onRaise: () => void }) {
  const attention = r.s.status !== 'nominal';
  return (
    <>
      <tr>
        <td className="mono whitespace-nowrap">{r.s.id}</td>
        <td className="whitespace-nowrap">{TYPE_LABEL[r.s.type]}</td>
        <td className="text-text-muted whitespace-nowrap">{r.zoneName}</td>
        <td className="whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot status={r.s.status} />
            <span className={r.s.status === 'nominal' ? 'text-text-muted' : r.s.status === 'degraded' ? 'text-advisory' : 'text-alarm'}>{r.s.status}</span>
          </span>
        </td>
        <td className="mono text-right">{r.s.uptimePct.toFixed(1)}</td>
        <td><Sparkline data={r.spark} width={64} height={14} color="var(--text-muted)" /></td>
        <td className="mono text-text-muted whitespace-nowrap">
          {fmtClock(r.lastCheck)}
          {r.s.status === 'offline' && <span className="text-11"> · no response</span>}
        </td>
        <td className="text-right whitespace-nowrap">
          {attention && (
            ticket ? (
              <span className="text-11 text-text-muted">{ticket in EXISTING_TICKETS_BY_ID ? `${ticket} open` : 'Ticket raised'} <span className="mono">{ticket}</span></span>
            ) : (
              <button type="button" className="btn btn-sm" onClick={onRaise}>Raise ticket</button>
            )
          )}
        </td>
      </tr>
      {attention && r.note && (
        <tr>
          <td className="!border-b-0 !pt-0" />
          <td colSpan={7} className="!pt-0 agent-text text-11">
            <span className="font-medium">Fitter</span> — {r.note}
          </td>
        </tr>
      )}
    </>
  );
}

const EXISTING_TICKETS_BY_ID: Record<string, true> = Object.fromEntries(Object.values(EXISTING_TICKETS).map((t) => [t, true]));

function AssetTable({ assets }: { assets: Asset[] }) {
  const sorted = useMemo(
    () => [...assets].sort((a, b) => Number(Boolean(b.maintenance.flagged)) - Number(Boolean(a.maintenance.flagged)) || a.battery - b.battery),
    [assets],
  );
  return (
    <table className="data">
      <thead>
        <tr>
          <th className="sticky top-0 bg-surface-raised">Callsign</th>
          <th className="sticky top-0 bg-surface-raised">Class</th>
          <th className="sticky top-0 bg-surface-raised">Battery</th>
          <th className="sticky top-0 bg-surface-raised">State</th>
          <th className="sticky top-0 bg-surface-raised">Link</th>
          <th className="sticky top-0 bg-surface-raised text-right">Hours</th>
          <th className="sticky top-0 bg-surface-raised">Next service</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((a) => {
          const dueDays = Math.round((new Date(a.maintenance.nextDue).getTime() - DEMO_NOW) / DAY_MS);
          return (
            <AssetRows key={a.id} a={a} dueDays={dueDays} />
          );
        })}
      </tbody>
    </table>
  );
}

function AssetRows({ a, dueDays }: { a: Asset; dueDays: number }) {
  return (
    <>
      <tr>
        <td className="whitespace-nowrap font-medium">{a.callsign}</td>
        <td className="text-text-muted whitespace-nowrap">{ASSET_CLASS_LABEL[a.class]}</td>
        <td><Battery pct={a.battery} charging={a.state === 'charging'} /></td>
        <td className={`whitespace-nowrap ${a.state === 'maintenance' ? 'text-advisory' : ''}`}>{a.state}</td>
        <td className="whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-text-muted"><StatusDot status={a.connectivity} />{a.connectivity}</span>
        </td>
        <td className="mono text-right">{a.maintenance.hours}</td>
        <td className="whitespace-nowrap">
          {dueDays < 0 ? (
            <span className="text-advisory">overdue {Math.abs(dueDays)} d</span>
          ) : (
            <span className={dueDays <= 3 ? 'text-advisory' : 'text-text-muted'}>{fmtDate(a.maintenance.nextDue)} <span className="mono text-11">in {dueDays} d</span></span>
          )}
        </td>
      </tr>
      {a.maintenance.flagged && (
        <tr>
          <td className="!border-b-0 !pt-0" />
          <td colSpan={6} className="!pt-0 text-11 text-advisory">Flagged by Fitter — {a.maintenance.flagged}</td>
        </tr>
      )}
    </>
  );
}
