import { useState } from 'react';
import type { Asset, Waypoint } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { MiniMap } from '@/ui/MiniMap';
import { EmptyState } from '@/ui/bits';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { currentPosition } from '@/data/assets';
import { WEATHER } from '@/data/facilities';
import { fmtDuration } from '@/lib/time';
import { DRONE_STATE_LABEL, isAirborne, isReady } from './shared';
import { RESERVE_PCT, flightEstimate, validateRoute } from './geo';

type Props = { drone: Asset; drones: Asset[]; onSelectDrone: (id: string) => void; onLaunched: () => void };

const WIND_LIMIT_KT = 25;

/** Draw a route, set altitude and speed, check it against the airspace, launch. */
export function FlightPlanning({ drone, drones, onSelectDrone, onLaunched }: Props) {
  const dispatchAsset = useStore((s) => s.dispatchAsset);
  const toast = useStore((s) => s.toast);
  const [points, setPoints] = useState<Waypoint[]>([]);
  const [altitude, setAltitude] = useState(40);
  const [speed, setSpeed] = useState(9);
  const [returnHome, setReturnHome] = useState(true);

  const start = currentPosition(drone).position;
  const path = [start, ...points.map((p) => p.position), ...(returnHome ? [drone.home] : [])];
  const est = flightEstimate(path, speed);
  const remaining = drone.battery - est.batteryPct;
  const violations = validateRoute(start, points, altitude);
  const otherAirborne = drones.find((d) => d.id !== drone.id && isAirborne(d));
  const windOk = WEATHER.gustKt <= WIND_LIMIT_KT;

  const blockers: string[] = [];
  if (drone.state === 'maintenance') blockers.push(`${drone.callsign} is held by Fitter${drone.maintenance.flagged ? `: ${drone.maintenance.flagged}` : ''}.`);
  else if (isAirborne(drone)) blockers.push(`${drone.callsign} is already airborne. Use Live flight to re-task or recall it.`);
  if (otherAirborne) blockers.push(`${otherAirborne.callsign} is airborne. Camp policy allows one drone airborne at a time; recall it first.`);
  if (!windOk) blockers.push(`Gusts ${WEATHER.gustKt} kt exceed the ${WIND_LIMIT_KT} kt limit.`);
  if (points.length > 0 && remaining < RESERVE_PCT) blockers.push(`Plan lands with ${Math.round(remaining)}% but the reserve is ${RESERVE_PCT}%. Shorten the route or pick a fuller pack.`);
  const canLaunch = points.length > 0 && violations.length === 0 && blockers.length === 0;

  const displayRoute: Waypoint[] = returnHome && points.length ? [...points, { position: drone.home, action: 'return' }] : points;
  const badIdx = new Set(violations.map((v) => v.pointIndex).filter((i): i is number => i !== undefined));

  const add = (p: [number, number]) => setPoints((ps) => [...ps, { position: [p[0], 0, p[1]], action: 'observe' }]);
  const launch = () => {
    if (!canLaunch) return;
    const wps: Waypoint[] = [...points];
    if (returnHome) wps.push({ position: drone.home, action: 'return' });
    const task = `Flight plan: ${points.length} point${points.length === 1 ? '' : 's'} at ${altitude} m, ${speed} m/s${returnHome ? ', return to nest' : ''}`;
    dispatchAsset(drone.id, wps, task, DUTY_OFFICER, { altitude, speed });
    toast(`${drone.callsign} launched by ${DUTY_OFFICER}. Tracking on the map.`, 'human');
    setPoints([]);
    onLaunched();
  };

  return (
    <div className="h-full min-h-0 flex">
      <div className="flex-1 min-w-0 min-h-0 relative">
        <MiniMap onClick={add} showGeofences showAssets highlightAssetId={drone.id} route={displayRoute} routeColor={violations.length ? 'var(--alarm)' : 'var(--agent)'} interactive>
          {points.length > 0 && (
            <line x1={start[0]} y1={start[2]} x2={points[0].position[0]} y2={points[0].position[2]} stroke={violations.length ? 'var(--alarm)' : 'var(--agent)'} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          )}
          {points.map((p, i) => badIdx.has(i) ? <circle key={i} cx={p.position[0]} cy={p.position[2]} r="7" fill="none" stroke="var(--alarm)" strokeWidth="1.2" /> : null)}
        </MiniMap>
        <div className="absolute left-2 bottom-2 text-11 text-text-muted panel px-2 py-0.5 pointer-events-none">
          Click the plan to add a route point · <span className="text-alarm">red</span> no-fly · <span className="text-advisory">amber</span> helipad corridor · dashed line is the camp geofence
        </div>
      </div>

      <div className="w-[380px] shrink-0 border-l hairline flex flex-col min-h-0">
        <div className="px-3 py-2 border-b hairline space-y-2 shrink-0">
          <label className="block">
            <span className="label">Drone</span>
            <select className="field" value={drone.id} onChange={(e) => onSelectDrone(e.target.value)}>
              {drones.map((d) => <option key={d.id} value={d.id}>{d.callsign} · {DRONE_STATE_LABEL[d.state]} · {d.battery}% · {d.payload}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-12">
            <span className="label w-14">Altitude</span>
            <input type="range" min={20} max={120} step={5} value={altitude} onChange={(e) => setAltitude(Number(e.target.value))} className="flex-1" aria-label="Altitude" />
            <span className="mono w-16 text-right">{altitude} m</span>
          </label>
          <label className="flex items-center gap-2 text-12">
            <span className="label w-14">Speed</span>
            <input type="range" min={5} max={15} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1" aria-label="Speed" />
            <span className="mono w-16 text-right">{speed} m/s</span>
          </label>
          <label className="flex items-center gap-2 text-12 cursor-pointer">
            <input type="checkbox" checked={returnHome} onChange={(e) => setReturnHome(e.target.checked)} />
            <span>Return to nest at the end of the route</span>
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {points.length === 0 ? (
            <EmptyState title="No route yet" body={`Click the plan to add route points for ${drone.callsign}. Each point is an observe stop; the plan is checked against the no-fly volumes and the camp geofence as you draw.`} />
          ) : (
            <ol>
              {points.map((p, i) => (
                <li key={i} className={`flex items-center gap-2 px-3 py-1.5 border-b border-line/50 text-12 ${badIdx.has(i) ? 'text-alarm' : ''}`}>
                  <span className={`mono w-4 shrink-0 ${badIdx.has(i) ? '' : 'agent-text'}`}>{i + 1}</span>
                  <span className="mono flex-1">{Math.round(p.position[0])}, {Math.round(p.position[2])}</span>
                  <span className="text-text-muted">observe at {altitude} m</span>
                  <button type="button" className="btn btn-sm" onClick={() => setPoints((ps) => ps.filter((_, j) => j !== i))} aria-label={`Remove point ${i + 1}`}>Remove</button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-3 py-2 border-t hairline shrink-0 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-12">
            <div><div className="label">Distance</div><div className="mono">{Math.round(est.distanceM)} m</div></div>
            <div><div className="label">Duration</div><div className="mono">{points.length ? fmtDuration(est.minutes * 60000) : '—'}</div></div>
            <div><div className="label">Battery needed</div><div className="mono">{points.length ? `${Math.round(est.batteryPct)}%` : '—'}</div></div>
            <div><div className="label">Lands with</div><div className={`mono ${points.length && remaining < RESERVE_PCT ? 'text-alarm' : ''}`}>{points.length ? `${Math.round(remaining)}%` : `${drone.battery}%`}</div></div>
          </div>
          <div className="text-11 text-text-muted">1.2% a minute at cruise, 4% take-off, 2% landing, {RESERVE_PCT}% reserve · wind {WEATHER.windKt} kt, limit {WIND_LIMIT_KT} kt</div>
          {violations.length > 0 ? (
            <div className="text-12 text-alarm" role="alert">
              <div className="font-medium">Rejected. The plan violates the airspace.</div>
              <ul className="list-disc pl-4">
                {violations.map((v) => (
                  <li key={`${v.fenceId}-${v.where}`}>
                    {v.kind === 'nofly' ? `${v.where} lies inside ${v.fenceName} (${GEOFENCE_BAND(v.fenceId)})` : v.kind === 'outside' ? `${v.where} is outside the ${v.fenceName.toLowerCase()}` : `${v.where} is above the geofence ceiling`}
                  </li>
                ))}
              </ul>
            </div>
          ) : points.length > 0 ? (
            <div className="text-12 text-nominal">Route is clear of the no-fly volumes and inside the camp geofence at {altitude} m.</div>
          ) : null}
          {blockers.map((b) => <div key={b} className="text-12 text-advisory">{b}</div>)}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed" disabled={!canLaunch} onClick={launch}>Launch {drone.callsign}</button>
            <button type="button" className="btn ml-auto disabled:opacity-40" disabled={!points.length} onClick={() => setPoints([])}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { GEOFENCES } from '@/data/facilities';
function GEOFENCE_BAND(id: string) {
  const g = GEOFENCES.find((x) => x.id === id);
  return g ? `${g.minAlt}–${g.maxAlt} m` : '';
}
