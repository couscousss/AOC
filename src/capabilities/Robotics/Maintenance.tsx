import { useMemo, useState } from 'react';
import type { Asset, AssetClass } from '@/lib/types';
import { Stat } from '@/ui/bits';
import { ASSET_CLASS_LABEL } from '@/data/assets';
import { agentName } from '@/data/agents';
import { demoNow, fmtDate, DAY_MS } from '@/lib/time';
import { UnitIcon } from './shared';

const RATED_CYCLES: Record<AssetClass, number> = { 'robot-dog': 600, ugv: 900, humanoid: 400, cleaning: 500, service: 500, drone: 800 };

type Note = { observed: string; considered: string[]; concluded: string; did: string };

/** Fitter's reasoning for the units it has flagged. No AgentAction exists for these, so it is rendered inline. */
const FITTER_NOTES: Record<string, Note> = {
  'A-FER4': {
    observed: 'Left track drive current has risen across the last three motor pool sweeps and now sits 9% above the right track on the same surface. Vibration on the left idler is up but still inside limits.',
    considered: ['Sensor drift on the left current monitor', 'Extra load from the wet hardstanding after the rain', 'Track tension drifting out of range'],
    concluded: 'The right track on the same surface shows no rise, so surface load and sensor drift are unlikely. Tension is the fit, and it is worsening rather than settling.',
    did: 'Brought the service forward and told Dispatch to keep Ferret-4 on low-speed sweeps until then. A schedule change needs no approval at this autonomy level.',
  },
};
const genericNote = (a: Asset): Note => ({
  observed: a.maintenance.flagged ?? 'Telemetry outside the expected band on recent tasks.',
  considered: ['Sensor fault', 'Environmental load', 'Component wear'],
  concluded: 'Wear is the most consistent explanation across the last three tasks.',
  did: 'Brought the service forward and notified Dispatch.',
});

function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - demoNow()) / DAY_MS);
}

/** Predictive panel: cycles, actuator hours, projected service date, and Fitter's flags. */
export function MaintenancePanel({ units }: { units: Asset[] }) {
  const sorted = useMemo(
    () => [...units].sort((a, b) => Number(!!b.maintenance.flagged) - Number(!!a.maintenance.flagged) || daysUntil(a.maintenance.nextDue) - daysUntil(b.maintenance.nextDue)),
    [units],
  );
  const flagged = sorted.filter((u) => u.maintenance.flagged).length;
  const dueWeek = sorted.filter((u) => daysUntil(u.maintenance.nextDue) <= 7).length;
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-1.5 border-b hairline text-11 text-text-muted flex items-center justify-between shrink-0">
        <span>{units.length} units · {flagged} flagged by {agentName('fitter')} · {dueWeek} due for service within 7 days</span>
        <span>Projected dates move when cycle rate or vibration changes; Fitter re-projects at the 06:00 health sweep</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {sorted.map((u) => <UnitRow key={u.id} unit={u} />)}
      </div>
    </div>
  );
}

function UnitRow({ unit }: { unit: Asset }) {
  const [open, setOpen] = useState(false);
  const m = unit.maintenance;
  const days = daysUntil(m.nextDue);
  const rated = RATED_CYCLES[unit.class];
  const cyclePct = Math.min(100, Math.round((m.cycles / rated) * 100));
  const since = Math.max(0, Math.round((demoNow() - new Date(m.lastService).getTime()) / DAY_MS));
  const interval = Math.max(1, Math.round((new Date(m.nextDue).getTime() - new Date(m.lastService).getTime()) / DAY_MS));
  const intervalPct = Math.min(100, Math.round((since / interval) * 100));
  const dueTone = days < 0 ? 'alarm' : days <= 7 ? 'advisory' : undefined;
  const dueSub = days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : days === 0 ? 'due today' : `in ${days} day${days === 1 ? '' : 's'}${m.flagged ? ', brought forward' : ''}`;
  const note = m.flagged ? FITTER_NOTES[unit.id] ?? genericNote(unit) : null;

  return (
    <div className="panel p-3 flex gap-4 items-start relative overflow-hidden">
      {m.flagged && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--advisory)' }} />}
      <div className="w-[170px] shrink-0 flex gap-2">
        <UnitIcon cls={unit.class} className="text-text-muted shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-14 font-medium truncate">{unit.callsign}</div>
          <div className="text-11 text-text-muted truncate">{ASSET_CLASS_LABEL[unit.class]} · {unit.model}</div>
        </div>
      </div>
      <div className="w-[120px] shrink-0">
        <Stat label="Battery cycles" value={m.cycles} sub={`${cyclePct}% of rated ${rated}`} tone={cyclePct >= 80 ? 'advisory' : undefined} />
        <Bar pct={cyclePct} />
      </div>
      <div className="w-[120px] shrink-0">
        <Stat label="Actuator hours" value={`${m.hours} h`} sub={`${intervalPct}% of interval`} tone={intervalPct >= 90 ? 'advisory' : undefined} />
        <Bar pct={intervalPct} />
      </div>
      <div className="w-[120px] shrink-0"><Stat label="Last service" value={<span className="mono text-14">{fmtDate(m.lastService)}</span>} sub={`${since} days ago`} /></div>
      <div className="w-[130px] shrink-0"><Stat label="Projected service" value={<span className="mono text-14">{fmtDate(m.nextDue)}</span>} sub={dueSub} tone={dueTone} /></div>
      <div className="flex-1 min-w-0 text-12">
        {note ? (
          <div className="inset p-2">
            <div className="flex items-center gap-2">
              <span className="text-advisory font-medium">Flagged by {agentName('fitter')}</span>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1 text-11 px-1.5 rounded border hover:bg-surface-inset"
                style={{ color: 'var(--agent)', borderColor: 'rgba(79,209,197,0.35)' }}
                aria-expanded={open}
                title="Show Fitter's reasoning"
              >
                <span aria-hidden>?</span> why
              </button>
            </div>
            <div className="agent-text mt-0.5">{m.flagged}</div>
            {open && (
              <div className="mt-2 grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
                <div className="text-text-muted">Observed</div><div className="agent-text">{note.observed}</div>
                <div className="text-text-muted">Considered</div>
                <ul className="agent-text list-disc pl-4">{note.considered.map((c) => <li key={c}>{c}</li>)}</ul>
                <div className="text-text-muted">Concluded</div><div className="agent-text">{note.concluded}</div>
                <div className="text-text-muted">Did</div><div className="agent-text">{note.did}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="agent-text">
            <span className="font-medium">{agentName('fitter')}</span> — Within limits. {cyclePct}% of rated cycles, {intervalPct}% of the service interval. Next check at the 06:00 health sweep.
          </div>
        )}
      </div>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1 bg-line rounded mt-1 overflow-hidden" aria-hidden>
      <div className="h-full" style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--advisory)' : 'var(--text-muted)' }} />
    </div>
  );
}
