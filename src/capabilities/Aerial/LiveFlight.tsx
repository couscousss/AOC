import { useEffect, useState } from 'react';
import type { Asset, Waypoint } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { MiniMap } from '@/ui/MiniMap';
import { CctvFeed } from '@/ui/CctvFeed';
import { EmptyState, Stat } from '@/ui/bits';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { currentPosition, routeLength } from '@/data/assets';
import { fmtDuration } from '@/lib/time';
import { isAirborne, isReady, joinNames } from './shared';
import { RESERVE_PCT, cardinal, dist, returnHomeMargin } from './geo';

type Held = { route: Waypoint[]; progress: number };

/** The airborne drone on the plan, its downward feed, altitude and heading, and the battery margin to get home. */
export function LiveFlight({ drones, onPlan }: { drones: Asset[]; onPlan: () => void }) {
  const beat = useStore((s) => s.scenario.beat);
  const recallAsset = useStore((s) => s.recallAsset);
  const setAsset = useStore((s) => s.setAsset);
  const toast = useStore((s) => s.toast);
  const [held, setHeld] = useState<Held | null>(null);
  const drone = drones.find(isAirborne);

  // If something else re-tasks the drone while it is held, the saved route is stale.
  useEffect(() => { if (drone?.route) setHeld(null); }, [drone?.route]);

  if (!drone) {
    const ready = drones.filter(isReady).map((d) => d.callsign);
    const heldNames = drones.filter((d) => d.state === 'maintenance').map((d) => d.callsign);
    const body = `${ready.length ? `${joinNames(ready)} ${ready.length === 1 ? 'is' : 'are'} ready in the nest` : 'No drone is ready in the nest'}${heldNames.length ? `; ${joinNames(heldNames)} ${heldNames.length === 1 ? 'is' : 'are'} held for maintenance` : ''}. A perimeter alarm launches the nearest ready drone automatically when auto-launch is armed.`;
    return <EmptyState title="No drone airborne" body={body} action={<button type="button" className="btn btn-primary" onClick={onPlan}>Plan a flight</button>} />;
  }

  const live = currentPosition(drone);
  const speed = drone.route ? drone.speed : 0;
  const margin = returnHomeMargin(live.position, drone.home, drone.speed, drone.battery);
  const stage = drone.route && drone.routeProgress !== undefined ? { total: routeLength(drone.route), left: routeLength(drone.route) * (1 - drone.routeProgress) } : null;
  const etaSec = stage && drone.speed > 0 ? stage.left / drone.speed : 0;
  const subjects = beat >= 12 ? 'withdraw' : 'drone-topdown';
  const marginTone = margin.margin < 5 ? 'alarm' : margin.margin < 15 ? 'advisory' : 'nominal';

  const hold = () => {
    if (!drone.route || drone.routeProgress === undefined) return;
    setHeld({ route: drone.route, progress: drone.routeProgress });
    setAsset(drone.id, { position: [live.position[0], 0, live.position[2]], route: undefined, routeProgress: undefined, telemetry: { ...drone.telemetry, speed: 0 } });
    toast(`${drone.callsign} holding position at ${drone.altitude ?? 0} m.`, 'human');
  };
  const resume = () => {
    if (!held) return;
    setAsset(drone.id, { route: held.route, routeProgress: held.progress });
    setHeld(null);
    toast(`${drone.callsign} resuming its route.`, 'human');
  };
  const recall = () => {
    setHeld(null);
    recallAsset(drone.id, DUTY_OFFICER);
    toast(`${drone.callsign} recalled to the nest by ${DUTY_OFFICER}.`, 'human');
  };

  return (
    <div className="h-full min-h-0 flex">
      <div className="flex-1 min-w-0 min-h-0 relative">
        <MiniMap showGeofences showAssets highlightAssetId={drone.id} route={drone.route ?? held?.route}>
          <line x1={live.position[0]} y1={live.position[2]} x2={drone.home[0]} y2={drone.home[2]} stroke="var(--text-muted)" strokeWidth="0.8" strokeDasharray="1.5 3" opacity="0.7" />
          <g transform={`translate(${live.position[0]} ${live.position[2]})`}>
            <circle r="16" fill="none" stroke="var(--agent)" strokeWidth="0.6" opacity="0.5" style={{ animation: 'pulse-beam 1.6s ease-in-out infinite' }} />
          </g>
        </MiniMap>
        <div className="absolute left-2 bottom-2 text-11 text-text-muted panel px-2 py-0.5 pointer-events-none">
          Dotted line is the return-to-nest leg, {Math.round(dist(live.position, drone.home))} m
        </div>
      </div>

      <div className="w-[380px] shrink-0 border-l hairline flex flex-col min-h-0">
        <CctvFeed sensorId={drone.callsign.toUpperCase()} scene="rooftop" variant="drone" subjects={subjects} label={`${drone.payload ?? 'EO'}, ${drone.altitude ?? 0} m`} showBoxes={false} />
        <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
          <div className="text-12">
            <div className="font-medium">{drone.callsign} · {held ? 'holding position' : drone.state === 'returning' ? 'returning to nest' : 'airborne'}</div>
            <div className="text-text-muted truncate" title={drone.currentTask}>{drone.currentTask}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Altitude" value={`${drone.altitude ?? 0} m`} sub="above ground" />
            <Stat label="Heading" value={`${Math.round(live.heading)}°`} sub={cardinal(live.heading)} />
            <Stat label="Ground speed" value={`${speed.toFixed(1)} m/s`} sub={held ? 'holding' : `set ${drone.speed} m/s`} />
            <Stat label="Battery" value={`${drone.battery}%`} sub={`reserve ${RESERVE_PCT}%`} tone={drone.battery < 30 ? 'advisory' : undefined} />
            <Stat label="Return home needs" value={`${Math.round(margin.rthPct)}%`} sub={`${fmtDuration(margin.rthMin * 60000)} at ${drone.speed} m/s`} />
            <Stat label="Margin on station" value={`${Math.round(margin.margin)}%`} sub={`about ${Math.round(margin.onStationMin)} min`} tone={marginTone} />
          </div>
          {stage && (
            <div>
              <div className="flex items-center justify-between text-11 text-text-muted">
                <span>Route progress</span>
                <span className="mono">{Math.round(stage.left)} m left · {fmtDuration(etaSec * 1000)}</span>
              </div>
              <div className="h-1 bg-line rounded mt-1 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.round((drone.routeProgress ?? 0) * 100)}%`, background: 'var(--agent)' }} />
              </div>
            </div>
          )}
          <div className="text-11 text-text-muted mono">pos {Math.round(live.position[0])}, {Math.round(live.position[2])} · link {drone.connectivity} · wind {drone.telemetry.wind ?? 0} kt</div>
        </div>
        <div className="px-3 py-2 border-t hairline flex gap-2 shrink-0">
          {held ? (
            <button type="button" className="btn btn-primary" onClick={resume}>Resume route</button>
          ) : (
            <button type="button" className="btn disabled:opacity-40 disabled:cursor-not-allowed" disabled={!drone.route} onClick={hold}>Hold position</button>
          )}
          <button type="button" className="btn disabled:opacity-40 disabled:cursor-not-allowed" disabled={drone.state === 'returning'} onClick={recall}>Recall to nest</button>
        </div>
      </div>
    </div>
  );
}
