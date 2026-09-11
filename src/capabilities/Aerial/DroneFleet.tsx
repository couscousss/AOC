import { useMemo, type ReactNode } from 'react';
import type { Asset } from '@/lib/types';
import { Battery, StatusDot } from '@/ui/bits';
import { currentPosition } from '@/data/assets';
import { WEATHER } from '@/data/facilities';
import { fmtDate } from '@/lib/time';
import { DRONE_STATE_LABEL, DroneIcon, attentionScore, isAirborne } from './shared';

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-text-muted shrink-0 narrow">{k}</span>
      <span className="truncate">{v}</span>
    </div>
  );
}

/** A card per drone: same pattern as the ground fleet, plus flight hours, payload and dock/airborne state. */
export function DroneFleet({ drones, onOpen }: { drones: Asset[]; onOpen: (id: string) => void }) {
  const sorted = useMemo(() => [...drones].sort((a, b) => attentionScore(b) - attentionScore(a) || a.callsign.localeCompare(b.callsign)), [drones]);
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-1.5 border-b hairline text-11 text-text-muted shrink-0">
        Wind {WEATHER.windKt} kt gusting {WEATHER.gustKt} kt from the {WEATHER.windDir}, limit 25 kt · visibility {WEATHER.visibilityKm} km · {WEATHER.cloud} · sunrise {WEATHER.sunrise}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <div className="grid grid-cols-3 gap-3">
          {sorted.map((d) => <DroneCard key={d.id} drone={d} onOpen={() => onOpen(d.id)} />)}
        </div>
      </div>
    </div>
  );
}

function DroneCard({ drone, onOpen }: { drone: Asset; onOpen: () => void }) {
  const air = isAirborne(drone);
  const held = drone.state === 'maintenance';
  const pos = currentPosition(drone).position;
  const stripe = held || drone.maintenance.flagged ? 'var(--advisory)' : drone.connectivity === 'lost' ? 'var(--alarm)' : air ? 'var(--agent)' : undefined;
  return (
    <button type="button" onClick={onOpen} className="panel relative overflow-hidden text-left p-3 hover:bg-[#1c2a34] w-full" aria-label={`${drone.callsign}, ${DRONE_STATE_LABEL[drone.state]}. Open.`}>
      {stripe && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: stripe }} />}
      <div className="flex items-start gap-3">
        <DroneIcon size={22} className={`shrink-0 mt-0.5 ${air ? 'agent-text' : 'text-text-muted'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-14 font-medium truncate">{drone.callsign}</div>
            <Battery pct={drone.battery} charging={drone.state === 'charging'} />
          </div>
          <div className="text-11 text-text-muted truncate">{drone.model} · {drone.payload ?? 'no payload'}</div>
          <div className="text-12 mt-1 truncate" title={drone.currentTask}>{drone.currentTask ?? 'Idle'}</div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-11">
            <Row k="State" v={air ? <span className="agent-text">{DRONE_STATE_LABEL[drone.state]}, {drone.altitude ?? 0} m</span> : DRONE_STATE_LABEL[drone.state]} />
            <Row k="Link" v={<span className="inline-flex items-center gap-1.5"><StatusDot status={drone.connectivity} />{drone.connectivity}</span>} />
            <Row k="Flight hours" v={<span className="mono">{drone.flightHours ?? 0} h</span>} />
            <Row k="Position" v={<span className="mono">{Math.round(pos[0])}, {Math.round(pos[2])}</span>} />
            <Row k="Payload" v={drone.payload ?? '—'} />
            <Row k="Serviced" v={<span className="mono">{fmtDate(drone.maintenance.lastService)}</span>} />
          </div>
          {drone.maintenance.flagged && (
            <div className="mt-1.5 text-11 truncate"><span className="text-advisory">Held by Fitter</span> <span className="agent-text">· {drone.maintenance.flagged}</span></div>
          )}
        </div>
      </div>
    </button>
  );
}
