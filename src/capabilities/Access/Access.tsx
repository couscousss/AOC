import { useMemo, useState } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import type { ZoneId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { CctvFeed } from '@/ui/CctvFeed';
import { ACCESS } from '@/data/facilities';
import { demoNow, fmtClock, fmtTime, DAY_MS } from '@/lib/time';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { ReadsTable, AllowList, WatchListPanel, type PlateRead, type AllowEntry } from './VehiclePanels';
import { Visitors, Escorts, Doors, type Visitor } from './PeoplePanels';

const ZONE_CFG: Partial<Record<ZoneId, { cameraId: string; readerId: string | null }>> = {
  gate: { cameraId: 'CAM-G1-01', readerId: 'ANPR-G1' },
  armoury: { cameraId: 'CAM-AR-01', readerId: null },
  motorpool: { cameraId: 'CAM-MP-01', readerId: 'ANPR-MP' },
};

const incidentIn = (s: string) => /INC-\d{4}/.exec(s)?.[0];

/** Gate camera with plate reads, allow-list, visitors and check-in, escorts, controlled doors and tailgating. Folded into gate, armoury and motor pool. */
export function Access({ zone }: CapabilityProps) {
  const sensors = useStore((s) => s.sensors);
  const doors = useStore((s) => s.doors);
  const actions = useStore((s) => s.actions);
  const detections = useStore((s) => s.detections);
  const replayAt = useStore((s) => s.replayAt);
  const openIncident = useStore((s) => s.openIncident);
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const toast = useStore((s) => s.toast);

  const [added, setAdded] = useState<AllowEntry[]>([]);
  const [visitorState, setVisitorState] = useState<Record<string, Visitor['status']>>({});

  const cfg = ZONE_CFG[zone.id];
  const camera = sensors.find((s) => s.id === cfg?.cameraId) ?? sensors.find((s) => s.type === 'camera' && s.zoneId === zone.id) ?? sensors.find((s) => s.id === 'CAM-G1-01')!;
  const readerId = cfg?.readerId ?? null;
  const now = replayAt ?? demoNow();

  // Plate reads: the seeded list plus the live read Sentry makes during the incident (ACT-SENTRY-2).
  const reads = useMemo<PlateRead[]>(() => {
    const base: PlateRead[] = ACCESS.recentReads.map((r) => ({ ...r, incidentId: incidentIn(r.result) }));
    const live = actions.find((a) => a.id === 'ACT-SENTRY-2');
    if (live) base.push({ ts: live.ts, plate: 'SGP-6120', reader: 'CAM-RD-E', result: `Not on any list — ${live.incidentId ?? 'INC-0342'}`, incidentId: live.incidentId ?? 'INC-0342' });
    return base;
  }, [actions]);
  const visibleReads = reads.filter((r) => r.ts <= now && r.ts > now - DAY_MS);
  const latest = visibleReads.slice().sort((a, b) => b.ts - a.ts)[0];

  const allowList = useMemo<AllowEntry[]>(() => [...added, ...ACCESS.allowList], [added]);
  const visitors = useMemo<Visitor[]>(() => ACCESS.visitors.map((v) => ({ ...v, status: visitorState[v.name] ?? (v.status as Visitor['status']) })), [visitorState]);
  const zoneDoors = useMemo(() => doors.filter((d) => d.zoneId === zone.id), [doors, zone.id]);
  const zoneCameraIds = useMemo(() => new Set(sensors.filter((s) => s.zoneId === zone.id && (s.type === 'camera' || s.type === 'thermal')).map((s) => s.id)), [sensors, zone.id]);
  const tailgating = detections.filter((d) => d.class === 'tailgating' && d.ts <= now && d.ts > now - DAY_MS);
  const tailgatingZone = tailgating.filter((d) => zoneCameraIds.has(d.sensorId)).length;

  const addAllow = (e: AllowEntry) => {
    setAdded((prev) => [e, ...prev]);
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Added to allow-list', target: e.plate, record: { owner: e.owner, kind: e.kind } });
    pushFeed('sift', `Allow-list updated by ${DUTY_OFFICER}: ${e.plate} (${e.owner}, ${e.kind.toLowerCase()}). Applies from the next read.`);
    toast(`${e.plate} added to the allow-list. Recorded.`, 'human');
  };
  const checkIn = (v: Visitor) => {
    setVisitorState((prev) => ({ ...prev, [v.name]: 'on camp' }));
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Checked in visitor', target: v.name, record: { org: v.org, host: v.host, escort: v.escort, at: fmtClock(demoNow()) } });
    pushFeed('sift', `Visitor ${v.name} (${v.org}) checked in at Gate 1 by ${DUTY_OFFICER}. ${v.escort === 'Required' ? `Escort required; host (${v.host}) notified.` : 'No escort required.'}`);
    toast(`${v.name} checked in. Recorded.`, 'human');
  };
  const checkOut = (v: Visitor) => {
    setVisitorState((prev) => ({ ...prev, [v.name]: 'departed' }));
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Checked out visitor', target: v.name, record: { org: v.org, at: fmtClock(demoNow()) } });
    pushFeed('sift', `Visitor ${v.name} (${v.org}) checked out by ${DUTY_OFFICER}. Pass closed.`);
    toast(`${v.name} checked out. Recorded.`, 'human');
  };

  let status: string;
  const armouryDoor = zoneDoors.find((d) => d.id === 'DOOR-AR');
  if (zone.id === 'armoury') {
    status = armouryDoor && !armouryDoor.locked
      ? `Armoury door unlocked at ${fmtTime(armouryDoor.lastTs)} (${armouryDoor.lastEvent.toLowerCase()}). Seals intact. Re-lock when done.`
      : 'Dual-authorisation door secure, seals intact, last reconciliation 22:00.';
  } else if (zone.id === 'gate') {
    status = latest
      ? `Barrier down. Last plate read ${latest.plate} at ${fmtClock(latest.ts)}${latest.reader !== 'ANPR-G1' ? ` on ${latest.reader}` : ''}, ${/^allowed/i.test(latest.result) ? 'allowed' : 'not on any list'}.`
      : 'Barrier down. No plate reads in the last 24 hours.';
  } else if (zone.id === 'motorpool') {
    status = '27 of 31 vehicles on site, all plates reconciled.';
  } else {
    const exceptions = visibleReads.filter((r) => !/^allowed/i.test(r.result)).length;
    status = `Watching ${zone.name}. ${visibleReads.length} plate reads in 24h, ${exceptions} exception${exceptions === 1 ? '' : 's'}.`;
  }
  if (replayAt) status = `Replay at ${fmtTime(replayAt)}. ${status}`;

  return (
    <CapabilityShell
      capability="access"
      status={status}
      noLower
      primary={
        <div className="h-full min-h-0 flex">
          {/* Gate camera and reads */}
          <div className="w-[31%] min-w-[330px] shrink-0 border-r hairline flex flex-col min-h-0">
            <div className="relative shrink-0">
              <CctvFeed sensorId={camera.id} scene={camera.scene ?? 'gate'} variant={camera.type === 'thermal' ? 'thermal' : 'cctv'} label={camera.label} />
              {latest && (
                <div className="absolute left-1.5 bottom-1 mono text-11 pointer-events-none" style={{ textShadow: '0 0 3px #000' }}>
                  <span className="agent-text">{latest.plate}</span> <span className="text-text-muted">· {/^allowed/i.test(latest.result) ? 'allowed' : 'exception'} · {fmtClock(latest.ts)}</span>
                </div>
              )}
            </div>
            <div className="px-3 py-1 text-11 text-text-muted flex justify-between border-b hairline">
              <span><span className="mono text-text-primary">{camera.id}</span> · {camera.label}</span>
              {readerId && <span>reader <span className="mono">{readerId}</span></span>}
            </div>
            <ReadsTable reads={visibleReads} readerId={readerId} onOpenIncident={openIncident} />
          </div>

          {/* Vehicles */}
          <div className="flex-1 min-w-0 min-h-0 overflow-auto flex flex-col gap-2 p-2 border-r hairline">
            <div className="inset flex flex-col min-h-0 shrink-0">
              <AllowList entries={allowList} onAdd={addAllow} />
            </div>
            <WatchListPanel />
          </div>

          {/* People and doors */}
          <div className="w-[34%] min-w-[360px] shrink-0 min-h-0 overflow-auto flex flex-col gap-2 p-2">
            <Visitors visitors={visitors} onCheckIn={checkIn} onCheckOut={checkOut} />
            <Escorts escorts={ACCESS.escorts} />
            <Doors zone={zone} doors={zoneDoors} tailgatingZone={tailgatingZone} tailgatingCamp={tailgating.length} zoneCameraIds={zoneCameraIds} />
          </div>
        </div>
      }
    />
  );
}
