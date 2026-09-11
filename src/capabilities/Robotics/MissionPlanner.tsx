import { useState } from 'react';
import type { Asset, Waypoint, WaypointAction } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { MiniMap } from '@/ui/MiniMap';
import { EmptyState } from '@/ui/bits';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { currentPosition, routeLength } from '@/data/assets';
import { agentName } from '@/data/agents';
import { fmtDuration, fmtTime } from '@/lib/time';
import { ACTION_LABEL, PLANNER_ACTIONS, STATE_LABEL, fmtCoord, isActive, locationName, shortTask } from './shared';

type Props = { unit: Asset; units: Asset[]; onSelectUnit: (id: string) => void };

/** Click the plan to drop waypoints, choose an action per waypoint, dispatch. The marker really moves. */
export function MissionPlanner({ unit, units, onSelectUnit }: Props) {
  const dispatchAsset = useStore((s) => s.dispatchAsset);
  const recallAsset = useStore((s) => s.recallAsset);
  const toast = useStore((s) => s.toast);
  const feed = useStore((s) => s.feed);
  let lastDispatch = undefined as (typeof feed)[number] | undefined;
  for (let i = feed.length - 1; i >= 0; i--) if (feed[i].agentId === 'dispatch') { lastDispatch = feed[i]; break; }

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [speed, setSpeed] = useState(unit.speed);

  const start = currentPosition(unit).position;
  const distance = routeLength([{ position: start }, ...waypoints]);
  const etaSec = speed > 0 ? distance / speed : 0;
  const actions = Array.from(new Set(waypoints.map((w) => w.action ?? 'patrol')));
  const canDispatch = waypoints.length > 0 && unit.state !== 'maintenance';
  const active = isActive(unit);

  const addWaypoint = (p: [number, number]) => setWaypoints((w) => [...w, { position: [p[0], 0, p[1]], action: 'patrol' }]);
  const setAction = (i: number, action: WaypointAction) => setWaypoints((w) => w.map((x, j) => (j === i ? { ...x, action } : x)));
  const remove = (i: number) => setWaypoints((w) => w.filter((_, j) => j !== i));
  const addReturn = () => setWaypoints((w) => [...w, { position: unit.home, action: 'return' }]);

  const dispatch = () => {
    if (!canDispatch) return;
    const n = waypoints.length;
    const task = `Mission: ${n} waypoint${n === 1 ? '' : 's'} (${actions.map((a) => ACTION_LABEL[a].toLowerCase()).join(', ')})`;
    dispatchAsset(unit.id, waypoints, task, DUTY_OFFICER, { speed });
    toast(`${unit.callsign} dispatched by ${DUTY_OFFICER}. Watch the marker on the map.`, 'human');
    setWaypoints([]);
  };
  const recall = () => {
    recallAsset(unit.id, DUTY_OFFICER);
    toast(`${unit.callsign} recalled to dock by ${DUTY_OFFICER}.`, 'human');
  };
  const chooseUnit = (id: string) => {
    onSelectUnit(id);
    const u = units.find((x) => x.id === id);
    if (u) setSpeed(u.speed);
  };

  return (
    <div className="h-full min-h-0 flex">
      <div className="flex-1 min-w-0 min-h-0 relative">
        <MiniMap onClick={addWaypoint} showAssets highlightAssetId={unit.id} route={waypoints} interactive>
          {waypoints.length > 0 && (
            <line x1={start[0]} y1={start[2]} x2={waypoints[0].position[0]} y2={waypoints[0].position[2]} stroke="var(--agent)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          )}
        </MiniMap>
        <div className="absolute left-2 bottom-2 text-11 text-text-muted panel px-2 py-0.5 pointer-events-none">
          Click the plan to add a waypoint · {unit.callsign} is highlighted
        </div>
      </div>

      <div className="w-[380px] shrink-0 border-l hairline flex flex-col min-h-0">
        <div className="px-3 py-2 border-b hairline space-y-2 shrink-0">
          <label className="block">
            <span className="label">Unit</span>
            <select className="field" value={unit.id} onChange={(e) => chooseUnit(e.target.value)}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.callsign} · {STATE_LABEL[u.state]} · {u.battery}%</option>)}
            </select>
          </label>
          <div className="text-11 text-text-muted truncate">Now: {shortTask(unit)}{unit.maintenance.flagged ? <span className="text-advisory"> · flagged by Fitter, low-speed tasks only</span> : null}</div>
          <label className="flex items-center gap-2 text-12">
            <span className="label w-12">Speed</span>
            <input type="range" min={0.5} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1" aria-label="Speed" />
            <span className="mono w-16 text-right">{speed.toFixed(1)} m/s</span>
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {waypoints.length === 0 ? (
            <EmptyState title="No waypoints yet" body="Click anywhere on the plan to add the first waypoint. Each waypoint takes an action: patrol, hold and observe, inspect, or return to dock." action={<button type="button" className="btn btn-sm" onClick={addReturn}>Start with return to dock</button>} />
          ) : (
            <ol>
              {waypoints.map((w, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-line/50 text-12">
                  <span className="mono agent-text w-4 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{locationName(w.position)}</div>
                    <div className="mono text-11 text-text-muted">{fmtCoord(w.position)}</div>
                  </div>
                  <select className="field" style={{ width: 'auto' }} value={w.action ?? 'patrol'} onChange={(e) => setAction(i, e.target.value as WaypointAction)} aria-label={`Action at waypoint ${i + 1}`}>
                    {PLANNER_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" onClick={() => remove(i)} aria-label={`Remove waypoint ${i + 1}`}>Remove</button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-3 py-2 border-t hairline shrink-0">
          <div className="grid grid-cols-3 gap-2 text-12">
            <div><div className="label">Distance</div><div className="mono">{Math.round(distance)} m</div></div>
            <div><div className="label">ETA at {speed.toFixed(1)} m/s</div><div className="mono">{waypoints.length ? fmtDuration(etaSec * 1000) : '—'}</div></div>
            <div><div className="label">Waypoints</div><div className="mono">{waypoints.length}</div></div>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed" disabled={!canDispatch} onClick={dispatch}>Dispatch {unit.callsign}</button>
            <button type="button" className="btn disabled:opacity-40 disabled:cursor-not-allowed" disabled={!active || unit.state === 'returning'} onClick={recall}>Recall</button>
            {waypoints.length > 0 && <button type="button" className="btn" onClick={addReturn}>Add return</button>}
            <button type="button" className="btn ml-auto disabled:opacity-40" disabled={!waypoints.length} onClick={() => setWaypoints([])}>Clear</button>
          </div>
          {lastDispatch && (
            <div className="mt-2 text-11 agent-text truncate" title={lastDispatch.text}>
              <span className="mono text-text-muted">{fmtTime(lastDispatch.ts)}</span> <span className="font-medium">{agentName('dispatch')}</span> — {lastDispatch.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
