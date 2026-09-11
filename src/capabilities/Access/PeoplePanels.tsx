import { useState } from 'react';
import type { Detection, DoorState, Zone } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { relTime } from '@/lib/time';
import { RecentDetections } from '@/capabilities/CapabilityShell';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';

export type VisitorStatus = 'pre-registered' | 'on camp' | 'departed';
export type Visitor = { name: string; org: string; host: string; arrive: string; status: VisitorStatus; escort: string };
export type Escort = { contractor: string; escort: string; location: string; since: number; status: string };

/** Pre-registration and check-in. Check-in flips status locally, writes an audit row and a Sift feed line. */
export function Visitors({ visitors, onCheckIn, onCheckOut }: { visitors: Visitor[]; onCheckIn: (v: Visitor) => void; onCheckOut: (v: Visitor) => void }) {
  return (
    <div className="inset flex flex-col min-h-0 shrink-0">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0 flex justify-between">
        <span>Visitors · pre-registration and check-in</span>
        <span>{visitors.filter((v) => v.status === 'on camp').length} on camp</span>
      </div>
      <ul className="divide-y divide-line/50">
        {visitors.map((v) => (
          <li key={v.name} className="px-3 py-1 text-12 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate">{v.name}</span>
                <span className="narrow text-text-muted truncate">{v.org} · host {v.host}</span>
              </div>
              <div className="text-11 text-text-muted flex items-center gap-2">
                <span>{v.status === 'pre-registered' ? `Expected ${v.arrive}` : `Arrived ${v.arrive}`}</span>
                <span className={v.escort === 'Required' ? 'text-advisory' : ''}>escort {v.escort.toLowerCase()}</span>
                <span className="flex items-center gap-1">
                  <span className="dot" style={{ background: v.status === 'on camp' ? 'var(--nominal)' : 'var(--line)' }} />
                  {v.status}
                </span>
              </div>
            </div>
            {v.status === 'pre-registered' && <button type="button" className="btn btn-sm btn-primary shrink-0" onClick={() => onCheckIn(v)}>Check in</button>}
            {v.status === 'on camp' && <button type="button" className="btn btn-sm shrink-0" onClick={() => onCheckOut(v)}>Check out</button>}
            {v.status === 'departed' && <span className="text-11 text-text-muted shrink-0">departed</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Contractors on camp and who is escorting them. */
export function Escorts({ escorts }: { escorts: Escort[] }) {
  return (
    <div className="inset flex flex-col min-h-0 shrink-0">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Contractor escort tracking</div>
      {escorts.length === 0 ? (
        <div className="p-3 text-12 text-text-muted">No contractors under escort. The first pre-registered arrival is at 09:00.</div>
      ) : (
        <ul className="divide-y divide-line/50">
          {escorts.map((e) => (
            <li key={e.contractor} className="px-3 py-1 text-12">
              <div className="flex items-center gap-2">
                <span>{e.contractor}</span>
                <span className="text-text-muted truncate">· {e.location}</span>
                <span className="ml-auto flex items-center gap-1 text-11 text-text-muted shrink-0"><span className="dot" style={{ background: 'var(--nominal)' }} />{e.status} · <span className="mono">{relTime(e.since)}</span></span>
              </div>
              <div className="text-11 text-text-muted">Escort: {e.escort}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const isTailgating = (d: Detection) => d.class === 'tailgating';

/** Controlled doors for the zone with lock state and a toggle, plus tailgating in the last 24h with a link into the ledger. */
export function Doors({ zone, doors, tailgatingZone, tailgatingCamp, zoneCameraIds }: { zone: Zone; doors: DoorState[]; tailgatingZone: number; tailgatingCamp: number; zoneCameraIds: Set<string> }) {
  const setDoor = useStore((s) => s.setDoor);
  const toast = useStore((s) => s.toast);
  const [showLedger, setShowLedger] = useState(false);

  const toggle = (d: DoorState) => {
    setDoor(d.id, !d.locked, DUTY_OFFICER);
    toast(`${d.name} ${d.locked ? 'unlocked' : 'locked'} by ${DUTY_OFFICER}. Recorded.`, 'human');
  };

  return (
    <div className="inset flex flex-col min-h-0 shrink-0">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Controlled doors · tailgating detection</div>
      {doors.length === 0 ? (
        <div className="p-3 text-12 text-text-muted">No controlled doors in {zone.name}. The vehicle shelter roller doors are padlocked and watched by CAM-MP-02.</div>
      ) : (
        <ul className="divide-y divide-line/50">
          {doors.map((d) => {
            const armoury = d.zoneId === 'armoury';
            return (
              <li key={d.id} className="px-3 py-1 text-12 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span>{d.name}</span>
                    <span className="mono text-text-muted">{d.id}</span>
                    <span className={`flex items-center gap-1 ${d.locked ? '' : armoury ? 'text-advisory' : 'text-text-muted'}`}>
                      <span className="dot" style={{ background: d.locked ? 'var(--nominal)' : armoury ? 'var(--advisory)' : 'var(--line)' }} />
                      {d.locked ? 'Locked' : 'Unlocked'}
                    </span>
                  </div>
                  <div className="text-11 text-text-muted truncate" title={d.lastEvent}>{d.lastEvent} · <span className="mono">{relTime(d.lastTs)}</span></div>
                </div>
                <button type="button" className="btn btn-sm shrink-0" onClick={() => toggle(d)} title={`${d.locked ? 'Unlock' : 'Lock'} ${d.name}, recorded under your name`}>
                  {d.locked ? 'Unlock' : 'Lock'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {zone.id === 'armoury' && (
        <div className="px-3 py-1 text-11 text-text-muted border-t hairline flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="dot" style={{ background: 'var(--nominal)' }} />Seal S-04 intact</span>
          <span className="flex items-center gap-1"><span className="dot" style={{ background: 'var(--nominal)' }} />Seal S-05 intact</span>
          <span className="ml-auto">Last reconciliation <span className="mono">22:00</span></span>
        </div>
      )}
      <div className="px-3 py-1.5 text-12 border-t hairline flex items-center gap-2">
        <span>
          <span className={tailgatingZone > 0 ? 'text-advisory' : ''}>{tailgatingZone}</span> tailgating event{tailgatingZone === 1 ? '' : 's'} at {zone.name} doors in 24h
          <span className="text-text-muted"> · {tailgatingCamp} camp-wide</span>
        </span>
        <button type="button" className="chip ml-auto shrink-0" aria-pressed={showLedger} onClick={() => setShowLedger((v) => !v)}>
          {showLedger ? 'Hide ledger' : 'Show in ledger'}
        </button>
      </div>
      {showLedger && (
        <div className="border-t hairline max-h-[160px] overflow-auto">
          <RecentDetections limit={12} filter={(d) => isTailgating(d) && (tailgatingZone === 0 || zoneCameraIds.has(d.sensorId))} />
        </div>
      )}
    </div>
  );
}
