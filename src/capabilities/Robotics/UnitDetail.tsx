import type { Asset } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { CctvFeed } from '@/ui/CctvFeed';
import { Stat, StatusDot } from '@/ui/bits';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { ASSET_CLASS_LABEL, currentPosition } from '@/data/assets';
import { fmtDuration, fmtTime, fmtDate } from '@/lib/time';
import { ACTION_LABEL, STATE_LABEL, UnitIcon, cardinal, fmtCoord, isActive, locationName, routeStage } from './shared';

type Props = { unit: Asset; units: Asset[]; onSelect: (id: string) => void; onPlan: (id: string) => void };

/** Telemetry, first-person feed, current mission and task history for one unit. */
export function UnitDetail({ unit, units, onSelect, onPlan }: Props) {
  const recallAsset = useStore((s) => s.recallAsset);
  const toast = useStore((s) => s.toast);
  const live = currentPosition(unit);
  const t = unit.telemetry;
  const speed = t.speed ?? 0;
  const temp = t.temperature ?? 0;
  const stage = unit.route && unit.routeProgress !== undefined ? routeStage(unit.route, unit.routeProgress) : null;
  const etaSec = stage && unit.speed > 0 ? stage.remainingM / unit.speed : 0;
  const active = isActive(unit);

  const recall = () => {
    recallAsset(unit.id, DUTY_OFFICER);
    toast(`${unit.callsign} recalled to dock by ${DUTY_OFFICER}.`, 'human');
  };

  return (
    <div className="h-full min-h-0 flex">
      <div className="w-[300px] shrink-0 border-r hairline flex flex-col min-h-0">
        <div className="px-3 py-1.5 border-b hairline flex items-center gap-2">
          <UnitIcon cls={unit.class} className="text-text-muted shrink-0" />
          <select className="field" value={unit.id} onChange={(e) => onSelect(e.target.value)} aria-label="Unit">
            {units.map((u) => <option key={u.id} value={u.id}>{u.callsign} · {ASSET_CLASS_LABEL[u.class]}</option>)}
          </select>
        </div>
        <CctvFeed sensorId={unit.callsign} scene={unit.route ? 'road' : 'yard'} variant="robot" label="forward camera" showBoxes={false} />
        <div className="p-3 text-12 space-y-1 overflow-auto min-h-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="label">Current mission</span>
            <span className="inline-flex items-center gap-1.5 text-11"><StatusDot status={unit.connectivity} />link {unit.connectivity}</span>
          </div>
          <div>{unit.currentTask ?? 'Idle'}</div>
          <div className="text-11 text-text-muted">{STATE_LABEL[unit.state]} · {locationName(live.position)} <span className="mono">{fmtCoord(live.position)}</span></div>
          {stage && unit.route && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-11 text-text-muted">
                <span>Waypoint {stage.next} of {unit.route.length - 1}{unit.route[stage.next]?.action ? ` · ${ACTION_LABEL[unit.route[stage.next].action!].toLowerCase()}` : ''}</span>
                <span className="mono">{Math.round(stage.remainingM)} m · {fmtDuration(etaSec * 1000)}</span>
              </div>
              <div className="h-1 bg-line rounded mt-1 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.round((unit.routeProgress ?? 0) * 100)}%`, background: 'var(--agent)' }} />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-sm" onClick={() => onPlan(unit.id)}>Plan mission</button>
            <button type="button" className="btn btn-sm disabled:opacity-40 disabled:cursor-not-allowed" disabled={!active || unit.state === 'returning'} onClick={recall}>Recall to dock</button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="grid grid-cols-6 gap-3 px-3 py-2 border-b hairline shrink-0">
          <Stat label="Battery" value={`${unit.battery}%`} sub={unit.state === 'charging' ? 'charging' : `${unit.class === 'ugv' ? 'LiFePO4' : 'Li-ion'} pack`} tone={unit.battery < 20 ? 'alarm' : unit.battery < 40 ? 'advisory' : undefined} />
          <Stat label="Speed" value={`${speed.toFixed(1)} m/s`} sub={`rated ${unit.speed.toFixed(1)} m/s`} />
          <Stat label="Heading" value={`${Math.round(live.heading)}°`} sub={cardinal(live.heading)} />
          <Stat label="Temperature" value={`${temp} °C`} sub="motor housing, band 20–45" tone={temp > 45 ? 'advisory' : undefined} />
          <Stat label="Odometer" value={`${((t.odometer ?? 0) / 1000).toFixed(1)} km`} sub="since commissioning" />
          <Stat label="IMU" value={`${(t.imu ?? 0).toFixed(2)} g`} sub="vibration, rms" tone={(t.imu ?? 0) > 0.05 ? 'advisory' : undefined} />
        </div>
        <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted flex items-center justify-between shrink-0">
          <span>Task history</span>
          <span className="text-11">Last service <span className="mono">{fmtDate(unit.maintenance.lastService)}</span> · next due <span className="mono">{fmtDate(unit.maintenance.nextDue)}</span></span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="data">
            <thead><tr><th className="w-[90px]">Time</th><th>Task</th><th>Result</th></tr></thead>
            <tbody>
              {unit.taskHistory.map((h, i) => (
                <tr key={i}>
                  <td className="mono text-text-muted">{fmtTime(h.ts)}</td>
                  <td>{h.task}</td>
                  <td className={/exception|warning|vibration/i.test(h.result) ? 'text-advisory' : ''}>{h.result}</td>
                </tr>
              ))}
              {unit.taskHistory.length === 0 && <tr><td colSpan={3} className="text-text-muted">No tasks recorded for this unit yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
