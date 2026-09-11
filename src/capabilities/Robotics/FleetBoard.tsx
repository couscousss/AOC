import { useMemo, type ReactNode } from 'react';
import type { Asset } from '@/lib/types';
import { Battery, StatusDot } from '@/ui/bits';
import { ASSET_CLASS_LABEL, currentPosition } from '@/data/assets';
import { fmtDate } from '@/lib/time';
import { STATE_LABEL, UnitIcon, attentionReason, attentionScore, fmtCoord, locationName } from './shared';

/** A card per ground unit, sorted by how much attention it needs. Click opens the unit detail. */
export function FleetBoard({ units, onOpen }: { units: Asset[]; onOpen: (id: string) => void }) {
  const sorted = useMemo(
    () => [...units].sort((a, b) => attentionScore(b) - attentionScore(a) || a.callsign.localeCompare(b.callsign)),
    [units],
  );
  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid grid-cols-3 gap-3">
        {sorted.map((u) => <UnitCard key={u.id} unit={u} onOpen={() => onOpen(u.id)} />)}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-text-muted shrink-0 narrow">{k}</span>
      <span className="truncate">{v}</span>
    </div>
  );
}

export function UnitCard({ unit, onOpen }: { unit: Asset; onOpen: () => void }) {
  const reason = attentionReason(unit);
  const pos = currentPosition(unit).position;
  const stripe = reason ? (reason.tone === 'alarm' ? 'var(--alarm)' : 'var(--advisory)') : undefined;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel relative overflow-hidden text-left p-3 hover:bg-[#1c2a34] w-full"
      aria-label={`${unit.callsign}, ${STATE_LABEL[unit.state]}. Open unit detail.`}
    >
      {stripe && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: stripe }} />}
      <div className="flex items-start gap-3">
        <UnitIcon cls={unit.class} size={22} className="text-text-muted shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-14 font-medium truncate">{unit.callsign}</div>
            <Battery pct={unit.battery} charging={unit.state === 'charging'} />
          </div>
          <div className="text-11 text-text-muted truncate">{ASSET_CLASS_LABEL[unit.class]} · {unit.model}</div>
          <div className="text-12 mt-1 truncate" title={unit.currentTask}>{unit.currentTask ?? 'Idle'}</div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-11">
            <Row k="Location" v={<>{locationName(pos)} <span className="mono text-text-muted">{fmtCoord(pos)}</span></>} />
            <Row k="Link" v={<span className="inline-flex items-center gap-1.5"><StatusDot status={unit.connectivity} />{unit.connectivity}</span>} />
            <Row k="State" v={STATE_LABEL[unit.state]} />
            <Row k="Serviced" v={<span className="mono">{fmtDate(unit.maintenance.lastService)}</span>} />
          </div>
          {reason && (
            <div className="mt-1.5 text-11 truncate">
              <span className={reason.tone === 'alarm' ? 'text-alarm' : 'text-advisory'}>{reason.text}</span>
              {unit.maintenance.flagged && <span className="agent-text"> · {unit.maintenance.flagged}</span>}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
