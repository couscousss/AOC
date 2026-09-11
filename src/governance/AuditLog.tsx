import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/store/useStore';
import type { AuditEntry } from '@/lib/types';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { demoNow, fmtDateTime, hr } from '@/lib/time';

type Kind = 'all' | 'agent' | 'human' | 'system';
type Window = '1h' | '4h' | '24h';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'agent', label: 'Agents' },
  { id: 'human', label: 'Humans' },
  { id: 'system', label: 'System' },
];
const WINDOWS: { id: Window; label: string; ms: number }[] = [
  { id: '1h', label: 'Last hour', ms: hr(1) },
  { id: '4h', label: 'Last 4 hours', ms: hr(4) },
  { id: '24h', label: 'Last 24 hours', ms: hr(24) },
];
const MAX_ROWS = 400;

function csvEscape(v: unknown) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a plausible CSV: one row per audit entry, record JSON-stringified in the last column. */
export function auditToCsv(rows: AuditEntry[]) {
  const header = ['id', 'timestamp', 'actor', 'actor_kind', 'action', 'target', 'record'];
  const lines = rows.map((r) =>
    [r.id, new Date(r.ts).toISOString(), r.actor, r.actorKind, r.action, r.target, JSON.stringify(r.record)].map(csvEscape).join(','),
  );
  return [header.join(','), ...lines].join('\r\n') + '\r\n';
}

function actorClass(kind: AuditEntry['actorKind']) {
  return kind === 'agent' ? 'agent-text' : kind === 'human' ? 'text-text-primary' : 'text-text-muted';
}

/**
 * Append-only, filterable view of `s.audit`. Every agent decision, human approval and decline,
 * autonomy change and configuration edit. Exporting it writes a row of its own.
 */
export function AuditLog({ initialSearch = '', className = '' }: { initialSearch?: string; className?: string }) {
  const audit = useStore((s) => s.audit);
  const pushAudit = useStore((s) => s.pushAudit);
  const toast = useStore((s) => s.toast);

  const [kind, setKind] = useState<Kind>('all');
  const [search, setSearch] = useState(initialSearch);
  const [win, setWin] = useState<Window>('24h');
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const since = demoNow() - (WINDOWS.find((w) => w.id === win)?.ms ?? hr(24));
    const q = search.trim().toLowerCase();
    return audit
      .filter((r) => r.ts >= since)
      .filter((r) => kind === 'all' || r.actorKind === kind)
      .filter((r) => !q || r.action.toLowerCase().includes(q) || r.target.toLowerCase().includes(q) || r.actor.toLowerCase().includes(q));
  }, [audit, kind, search, win]);

  const shown = filtered.length > MAX_ROWS ? filtered.slice(0, MAX_ROWS) : filtered;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () => {
    const file = `camp-raven-audit-${format(demoNow(), 'yyyy-MM-dd-HHmm')}.csv`;
    const blob = new Blob([auditToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    pushAudit({
      actor: DUTY_OFFICER, actorKind: 'human', action: 'Exported audit log', target: file,
      record: { rows: filtered.length, window: WINDOWS.find((w) => w.id === win)?.label ?? win, actors: KINDS.find((k) => k.id === kind)?.label ?? kind, search: search.trim() },
    });
    toast(`Audit log exported: ${filtered.length} rows to ${file}. The export is itself logged.`, 'human');
  };

  return (
    <div className={`h-full min-h-0 flex flex-col ${className}`}>
      <header className="px-4 py-2 border-b hairline shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-14 font-medium">
            Audit log <span className="text-text-muted font-normal">· <span className="mono">{audit.length.toLocaleString('en-GB')}</span> rows · append-only</span>
          </div>
          <div className="text-12 text-text-muted truncate">
            Every agent decision, human approval and decline, autonomy change and configuration edit. Rows are never edited or deleted.
          </div>
        </div>
        <button type="button" className="btn shrink-0" onClick={exportCsv} title="Download the rows currently shown as CSV. The export is recorded as a row of its own.">
          Export CSV
        </button>
      </header>

      <div className="px-4 py-2 border-b hairline shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1" role="group" aria-label="Actor kind">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="chip" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        <input
          className="field !w-[280px]"
          placeholder="Search action, target or actor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search the audit log"
        />
        <select className="field !w-auto" value={win} onChange={(e) => setWin(e.target.value as Window)} aria-label="Time window">
          {WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select>
        <div className="ml-auto text-11 text-text-muted">
          <span className="mono">{filtered.length.toLocaleString('en-GB')}</span> matching
          {filtered.length > MAX_ROWS && <span> · showing <span className="mono">{MAX_ROWS}</span> of <span className="mono">{filtered.length.toLocaleString('en-GB')}</span></span>}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {shown.length === 0 ? (
          <div className="p-6 text-center text-12 text-text-muted">
            Nothing in this window matches. Widen the time window or clear the search; the log itself is untouched.
          </div>
        ) : (
          <table className="data">
            <thead className="sticky top-0 bg-surface-deep">
              <tr>
                <th className="w-6" aria-label="Expand" />
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isOpen = open.has(r.id);
                const keys = Object.keys(r.record);
                return (
                  <RowPair key={r.id} r={r} isOpen={isOpen} keys={keys} onToggle={() => toggle(r.id)} />
                );
              })}
            </tbody>
          </table>
        )}
        {filtered.length > MAX_ROWS && (
          <div className="px-4 py-2 text-11 text-text-muted border-t hairline">
            Showing {MAX_ROWS} of {filtered.length.toLocaleString('en-GB')} rows. Narrow the window or search to see the rest; the export includes all of them.
          </div>
        )}
      </div>
    </div>
  );
}

function RowPair({ r, isOpen, keys, onToggle }: { r: AuditEntry; isOpen: boolean; keys: string[]; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer" onClick={onToggle} aria-expanded={isOpen}>
        <td className="text-text-muted text-11 select-none" aria-hidden>{isOpen ? '▾' : '▸'}</td>
        <td className="mono whitespace-nowrap">{fmtDateTime(r.ts)}</td>
        <td className={`whitespace-nowrap ${actorClass(r.actorKind)}`}>{r.actor}</td>
        <td>{r.action}</td>
        <td className={/^[A-Z]{2,5}-[A-Z0-9-]+$/.test(r.target) ? 'mono' : ''}>{r.target}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={5} className="!py-2">
            <div className="inset px-3 py-2 mono text-11">
              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-0.5">
                <span className="text-text-muted">id</span><span>{r.id}</span>
                <span className="text-text-muted">timestamp</span><span>{new Date(r.ts).toISOString()}</span>
                <span className="text-text-muted">actor</span><span className={actorClass(r.actorKind)}>{r.actor} <span className="text-text-muted">({r.actorKind})</span></span>
                {keys.length === 0 ? (
                  <><span className="text-text-muted">record</span><span className="text-text-muted">No additional fields.</span></>
                ) : (
                  keys.map((k) => (
                    <span key={k} className="contents">
                      <span className="text-text-muted">{k}</span>
                      <span className={r.actorKind === 'agent' ? 'agent-text' : ''}>{String(r.record[k])}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
