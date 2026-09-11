import { useState, type FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import { fmtTime, relTime } from '@/lib/time';

export type PlateRead = { ts: number; plate: string; reader: string; result: string; incidentId?: string };
export type AllowEntry = { plate: string; owner: string; kind: string; visits: number };

const isAllowed = (r: PlateRead) => /^allowed/i.test(r.result);

/** Recent ANPR reads. Allow-list matches read quietly; anything else is an exception and reads in advisory. */
export function ReadsTable({ reads, readerId, onOpenIncident }: { reads: PlateRead[]; readerId: string | null; onOpenIncident: (id: string) => void }) {
  const [scope, setScope] = useState<'all' | 'zone'>('all');
  const list = (scope === 'zone' && readerId ? reads.filter((r) => r.reader === readerId) : reads).slice().sort((a, b) => b.ts - a.ts);
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between px-3 py-1.5 border-b hairline shrink-0">
        <span className="text-12 text-text-muted">Recent plate reads</span>
        {readerId && (
          <div className="seg" role="radiogroup" aria-label="Reader scope">
            <button type="button" role="radio" aria-checked={scope === 'all'} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All readers</button>
            <button type="button" role="radio" aria-checked={scope === 'zone'} aria-pressed={scope === 'zone'} onClick={() => setScope('zone')}><span className="mono">{readerId}</span></button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {list.length === 0 ? (
          <div className="p-3 text-12 text-text-muted">No reads on {readerId} in the last 24 hours. Barrier down.</div>
        ) : (
          <table className="data">
            <thead><tr><th>Time</th><th>Plate</th><th>Reader</th><th>Result</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr
                  key={`${r.plate}-${r.ts}-${i}`}
                  className={r.incidentId ? 'cursor-pointer' : ''}
                  onClick={() => r.incidentId && onOpenIncident(r.incidentId)}
                  title={r.incidentId ? `Open ${r.incidentId}` : undefined}
                >
                  <td className="mono text-text-muted whitespace-nowrap">{fmtTime(r.ts)}</td>
                  <td className="mono whitespace-nowrap">{r.plate}</td>
                  <td className="mono text-text-muted whitespace-nowrap">{r.reader}</td>
                  <td className={isAllowed(r) ? 'text-text-muted' : 'text-advisory'}>{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const PLATE_RE = /^([A-Z]{2,4})-?(\d{3,4})$/;
const KINDS = ['Contractor', 'Supplier', 'Camp', 'Temporary'];

/** The vehicle allow-list with a mini-form. Additions are local state and go to the audit log under the duty officer's name. */
export function AllowList({ entries, onAdd }: { entries: AllowEntry[]; onAdd: (e: AllowEntry) => void }) {
  const [plate, setPlate] = useState('');
  const [owner, setOwner] = useState('');
  const [kind, setKind] = useState(KINDS[0]);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = PLATE_RE.exec(plate.trim().toUpperCase());
    if (!m) { setMsg('Plate format is letters, hyphen, digits, for example SGP-4471.'); return; }
    const norm = `${m[1]}-${m[2]}`;
    if (entries.some((x) => x.plate === norm)) { setMsg(`${norm} is already on the list.`); return; }
    if (!owner.trim()) { setMsg('Give the owner or company so the next gate guard knows who it is.'); return; }
    onAdd({ plate: norm, owner: owner.trim(), kind, visits: 0 });
    setPlate(''); setOwner(''); setMsg(`${norm} added. Applies from the next read.`);
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Vehicle allow-list · {entries.length}</div>
      <div className="overflow-auto max-h-[190px]">
        <table className="data">
          <thead><tr><th>Plate</th><th>Owner</th><th>Kind</th><th className="text-right">Visits</th></tr></thead>
          <tbody>
            {entries.map((a) => (
              <tr key={a.plate}>
                <td className="mono whitespace-nowrap">{a.plate}</td>
                <td>{a.owner}</td>
                <td className="text-text-muted">{a.kind}</td>
                <td className="mono text-right text-text-muted">{a.visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={submit} className="px-3 py-2 border-t hairline shrink-0">
        <div className="text-11 text-text-muted mb-1">Add to allow-list</div>
        <div className="flex gap-1.5">
          <input className="field mono uppercase w-28 shrink-0" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="SGP-0000" aria-label="Plate" />
          <input className="field" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner or company" aria-label="Owner" />
          <select className="field w-32 shrink-0" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <button type="submit" className="btn btn-sm btn-primary shrink-0">Add</button>
        </div>
        {msg && <div className="text-11 text-text-muted mt-1">{msg}</div>}
      </form>
    </div>
  );
}

/** Plates the agents are watching for, with the incident that put them there. Shown only when there are entries. */
export function WatchListPanel() {
  const watchList = useStore((s) => s.watchList);
  const openIncident = useStore((s) => s.openIncident);
  if (watchList.length === 0) return null;
  return (
    <div className="inset flex flex-col min-h-0 shrink-0" style={{ borderColor: 'rgba(224,169,59,0.45)' }}>
      <div className="px-3 py-1.5 border-b hairline text-12 flex items-center justify-between shrink-0">
        <span className="text-text-muted">Watch list</span>
        <span className="text-advisory">{watchList.length} plate{watchList.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="divide-y divide-line/50">
        {watchList.map((w) => {
          const inc = /INC-\d{4}/.exec(w.reason)?.[0];
          return (
            <li key={`${w.plate}-${w.ts}`} className={`px-3 py-1 text-12 ${inc ? 'cursor-pointer hover:bg-surface-raised' : ''}`} onClick={() => inc && openIncident(inc)} title={inc ? `Open ${inc}` : undefined}>
              <div className="flex items-center gap-2"><span className="mono text-advisory">{w.plate}</span><span className="mono text-11 text-text-muted ml-auto">{relTime(w.ts)}</span></div>
              <div className={`text-11 truncate ${w.reason.startsWith('Retrospective search by') ? 'text-text-primary' : 'agent-text'}`} title={w.reason}>{w.reason}</div>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-1 text-11 text-text-muted border-t hairline">Any read of these plates at any gate is escalated to the duty officer, not Sift.</div>
    </div>
  );
}
