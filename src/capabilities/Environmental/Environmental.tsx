import { useEffect, useMemo, useState } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import type { ZoneId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { AIR_QUALITY, FLOOD, MUSTER, WEATHER } from '@/data/facilities';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { EmptyState, Panel, StatusDot } from '@/ui/bits';
import { demoNow, fmtClock } from '@/lib/time';

const STATUS_LINE = 'Air, water, fire and weather nominal. Barracks B boiler CO slightly elevated, Fitter notified.';

/** Cameras running the fall-detection model: interior, door and yard views where a person on the ground is in frame. Fence and roof cameras are excluded. */
const FALL_DETECTION_CAMERAS = new Set(['CAM-HQ-01', 'CAM-HQ-02', 'CAM-HQ-03', 'CAM-BK-01', 'CAM-BK-02', 'CAM-HP-01', 'CAM-AR-02', 'CAM-G1-03', 'CAM-MP-01']);

/** Seconds after a muster starts at which each building's roll-call terminal reports. Fixed so every run of the demo looks the same. */
const MUSTER_REPORT_AFTER_SEC: Record<string, number> = { HQ: 5, 'Guard house': 8, 'Motor pool': 11, 'Mess hall': 14, Workshop: 17, 'Barracks B': 29, 'Barracks A': 38 };

const CO_ADVISORY_PPM = 1.5;

function useDemoClock(enabled: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => demoNow());
  useEffect(() => {
    if (!enabled) return;
    setNow(demoNow());
    const id = window.setInterval(() => setNow(demoNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

function IncidentLink({ id }: { id: string }) {
  const openIncident = useStore((s) => s.openIncident);
  return (
    <button
      type="button"
      className="mono text-11 px-1 rounded border hairline hover:bg-surface-raised align-baseline"
      onClick={() => openIncident(id)}
      title={`Open ${id}`}
    >
      {id}
    </button>
  );
}

export function Environmental({ zone }: CapabilityProps) {
  return (
    <CapabilityShell
      capability="environmental"
      status={STATUS_LINE}
      lowerHeight={120}
      primary={
        <div className="h-full overflow-auto p-2">
          <div className="grid gap-2 h-full min-h-[380px]" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.15fr', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <FireSmokePanel zoneId={zone.id} />
            <AirQualityPanel />
            <WeatherPanel className="row-span-2" />
            <MusterPanel zoneName={zone.name} className="row-span-2" />
            <ManDownPanel zoneId={zone.id} />
            <FloodPanel />
          </div>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ fire and smoke */

function FireSmokePanel({ zoneId }: { zoneId: ZoneId }) {
  const sensors = useStore((s) => s.sensors);
  const cameras = useMemo(() => sensors.filter((x) => x.zoneId === zoneId && (x.type === 'camera' || x.type === 'thermal')), [sensors, zoneId]);
  return (
    <Panel
      title="Fire and smoke"
      right={<span className="text-11 text-text-muted">camera-based · {cameras.length} view{cameras.length === 1 ? '' : 's'}</span>}
      bodyClass="flex flex-col min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-auto">
        {cameras.length === 0 ? (
          <EmptyState title="No cameras in this zone" body="Smoke and flame detection runs on camera feeds. This zone has none assigned; gas and flood sensing still apply." />
        ) : (
          <ul className="px-3 py-1.5 space-y-0.5 text-12">
            {cameras.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <StatusDot status={c.status === 'offline' ? 'offline' : 'nominal'} />
                <span className="mono">{c.id}</span>
                <span className="text-text-muted truncate">{c.label}</span>
                <span className="ml-auto shrink-0 text-text-muted">{c.status === 'offline' ? 'stream unavailable' : 'no smoke signature'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Last smoke event <IncidentLink id="INC-0335" /> yesterday 15:15, workshop. Welding extractor left off; Osprey-2 confirmed no fire.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ gas and air quality */

function AirQualityPanel() {
  const boiler = AIR_QUALITY.find((r) => r.id === 'GAS-BK-01');
  return (
    <Panel title="Gas and air quality" right={<span className="text-11 text-text-muted">{AIR_QUALITY.length} sensors</span>} bodyClass="flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Place</th>
              <th className="text-right">CO₂ ppm</th>
              <th className="text-right">CO ppm</th>
              <th className="text-right">VOC mg/m³</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {AIR_QUALITY.map((r) => (
              <tr key={r.id}>
                <td className="mono whitespace-nowrap">{r.id}</td>
                <td className="whitespace-nowrap">{r.place}</td>
                <td className="mono text-right">{r.co2}</td>
                <td className={`mono text-right ${r.co >= CO_ADVISORY_PPM ? 'text-advisory' : ''}`}>{r.co.toFixed(1)}</td>
                <td className="mono text-right">{r.voc.toFixed(2)}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <StatusDot status={r.status} />
                    <span className={r.status === 'advisory' ? 'text-advisory' : 'text-text-muted'}>{r.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {boiler && (
        <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 agent-text">
          <span className="font-medium">Sentry</span> — Barracks B boiler CO {boiler.co.toFixed(1)} ppm, above the {CO_ADVISORY_PPM} ppm advisory line and well under the 9 ppm alarm. Fitter notified 03:52; flue check on the day-shift list.
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ flood */

function FloodPanel() {
  return (
    <Panel title="Flood" right={<span className="text-11 text-text-muted">low ground and plant rooms</span>} bodyClass="flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Place</th>
              <th>Now</th>
              <th>Last trip</th>
            </tr>
          </thead>
          <tbody>
            {FLOOD.map((f) => {
              const inc = f.lastTrip.match(/INC-\d{4}/)?.[0];
              return (
                <tr key={f.id}>
                  <td className="mono whitespace-nowrap">{f.id}</td>
                  <td className="whitespace-nowrap">{f.place}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <StatusDot status={f.wet ? 'alarm' : f.status} />
                      <span className={f.wet ? 'text-alarm' : f.status === 'degraded' ? 'text-advisory' : 'text-text-muted'}>
                        {f.wet ? 'water present' : f.status === 'degraded' ? 'dry, sensor degraded' : 'dry'}
                      </span>
                    </span>
                  </td>
                  <td className="text-text-muted">
                    {inc ? (
                      <>
                        {f.lastTrip.replace(/\s*\(INC-\d{4}\)/, '')} <IncidentLink id={inc} />
                      </>
                    ) : (
                      f.lastTrip
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 agent-text">
        <span className="font-medium">Fitter</span> — FLD-LG-01 has tripped 3× in 30 days with rain; swap pending. Its trips are treated as real until a robot has looked.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ weather */

function WeatherPanel({ className = '' }: { className?: string }) {
  const rows: { k: string; v: string }[] = [
    { k: 'Temperature', v: `${WEATHER.tempC} °C` },
    { k: 'Wind', v: `${WEATHER.windDir} ${WEATHER.windKt} kt, gusts ${WEATHER.gustKt}` },
    { k: 'Visibility', v: `${WEATHER.visibilityKm} km` },
    { k: 'Pressure', v: `${WEATHER.pressureHpa} hPa` },
    { k: 'Cloud', v: WEATHER.cloud },
    { k: 'Precipitation', v: WEATHER.precip },
    { k: 'Sunrise', v: WEATHER.sunrise },
  ];
  return (
    <Panel title="Weather and operational impact" right={<span className="mono text-11 text-text-muted">HQ roof station</span>} className={className} bodyClass="flex flex-col min-h-0">
      <div className="px-3 py-2 space-y-1.5 shrink-0">
        {WEATHER.impact.map((line, i) => (
          <div key={line.text} className={`flex items-start gap-2 ${i === 0 ? 'text-14' : 'text-12'}`}>
            <StatusDot status={line.level} className={i === 0 ? 'mt-[7px]' : 'mt-[5px]'} />
            <span className={line.level === 'advisory' ? 'text-advisory' : ''}>{line.text}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto border-t hairline">
        <dl className="px-3 py-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-12">
          {rows.map((r) => (
            <div key={r.k} className="contents">
              <dt className="text-text-muted">{r.k}</dt>
              <dd className="mono m-0">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Drone launch limits: 20 kt sustained, 28 kt gust. Radar clutter compensation is applied automatically on RDR-P-N while the ground is wet.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ man-down / fall detection */

function ManDownPanel({ zoneId }: { zoneId: ZoneId }) {
  const sensors = useStore((s) => s.sensors);
  const enabled = useMemo(() => sensors.filter((x) => x.zoneId === zoneId && FALL_DETECTION_CAMERAS.has(x.id)), [sensors, zoneId]);
  return (
    <Panel title="Man-down and fall detection" right={<span className="text-11 text-text-muted">pose model on camera feeds</span>} bodyClass="flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2 text-12 space-y-1.5">
        <div className="flex items-center gap-2">
          <StatusDot status="nominal" />
          <span>No falls detected</span>
        </div>
        {enabled.length > 0 ? (
          <div className="text-text-muted">
            {enabled.length} camera{enabled.length === 1 ? '' : 's'} with fall detection enabled in this zone:{' '}
            <span className="mono text-text-primary">{enabled.map((c) => c.id).join(', ')}</span>
          </div>
        ) : (
          <div className="text-text-muted">No cameras in this zone run the fall-detection model. Coverage comes from the nearest zone with interior views.</div>
        )}
        <div className="text-text-muted">A confirmed fall pages the medic before anyone is asked: medical notifications run at Autonomous by policy, recorded under Sgt M. Okafor.</div>
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Last event <IncidentLink id="INC-0333" /> yesterday 11:47, barracks yard. Heat syncope; medic on scene in 3 minutes.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ muster board */

function MusterPanel({ zoneName, className = '' }: { zoneName: string; className?: string }) {
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const [run, setRun] = useState<{ startedAt: number } | null>(null);
  const now = useDemoClock(run !== null);

  const elapsedMs = run ? Math.max(0, now - run.startedAt) : 0;
  const elapsedSec = elapsedMs / 1000;
  const expected = MUSTER.reduce((n, b) => n + b.expected, 0);
  const present = MUSTER.reduce((n, b) => n + b.present, 0);
  const reportAfter = (building: string) => MUSTER_REPORT_AFTER_SEC[building] ?? 20;
  const hasReported = (building: string) => run === null || elapsedSec >= reportAfter(building);
  const reportedBuildings = MUSTER.filter((b) => hasReported(b.building));
  const reportedPresent = reportedBuildings.reduce((n, b) => n + b.present, 0);
  const allReported = run !== null && reportedBuildings.length === MUSTER.length;
  const allReportedAtMs = Math.max(...MUSTER.map((b) => reportAfter(b.building))) * 1000;
  const short = MUSTER.filter((b) => b.present < b.expected);

  const start = () => {
    setRun({ startedAt: demoNow() });
    pushAudit({
      actor: DUTY_OFFICER, actorKind: 'human', action: 'Started evacuation muster', target: 'Camp-wide',
      record: { initiatedFrom: zoneName, expected, buildings: MUSTER.length },
    });
    pushFeed('warden', `Evacuation muster started by ${DUTY_OFFICER}. Roll-call terminals live in ${MUSTER.length} buildings; door counters switched to muster mode.`);
  };
  const end = () => {
    if (!run) return;
    pushAudit({
      actor: DUTY_OFFICER, actorKind: 'human', action: 'Ended evacuation muster', target: 'Camp-wide',
      record: { durationSec: Math.round(elapsedSec), expected, accountedFor: reportedPresent, unaccounted: expected - reportedPresent },
    });
    setRun(null);
  };

  return (
    <Panel
      title={run ? <span className="text-advisory">Evacuation muster in progress</span> : 'Muster board'}
      right={
        run ? (
          <>
            <span className="dot blink" style={{ background: 'var(--advisory)' }} aria-hidden />
            <span className="mono text-12 text-advisory" aria-label="Elapsed">{mmss(elapsedMs)}</span>
            <button type="button" className="btn btn-sm" onClick={end}>End muster</button>
          </>
        ) : (
          <button type="button" className="btn btn-sm" onClick={start}>Start evacuation muster</button>
        )
      }
      className={className}
      bodyClass="flex flex-col min-h-0"
    >
      <div className={`flex-1 min-h-0 overflow-auto ${run ? 'bg-surface-inset' : ''}`}>
        <table className="data">
          <thead>
            <tr>
              <th>Building</th>
              <th className="text-right">Expected</th>
              <th className="text-right">{run ? 'Reported' : 'Present'}</th>
              <th className="text-right">{run ? 'Outstanding' : 'Discrepancy'}</th>
            </tr>
          </thead>
          <tbody>
            {MUSTER.map((b) => {
              const reported = hasReported(b.building);
              const gap = b.expected - b.present;
              return (
                <tr key={b.building}>
                  <td>{b.building}</td>
                  <td className="mono text-right">{b.expected}</td>
                  <td className={`mono text-right ${!reported ? 'text-text-muted' : gap > 0 ? 'text-advisory' : ''}`}>{reported ? b.present : '—'}</td>
                  <td className={`text-right text-11 ${!reported ? 'text-text-muted' : gap > 0 ? 'text-advisory' : 'text-text-muted'}`}>
                    {!reported ? 'awaiting' : gap > 0 ? `${gap} unaccounted` : run ? 'complete' : ''}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="font-medium">Total</td>
              <td className="mono text-right font-medium">{expected}</td>
              <td className={`mono text-right font-medium ${run && reportedPresent < expected ? 'text-advisory' : ''}`}>{run ? reportedPresent : present}</td>
              <td className={`text-right text-11 ${expected - (run ? reportedPresent : present) > 0 ? 'text-advisory' : 'text-text-muted'}`}>
                {run ? `${reportedBuildings.length} of ${MUSTER.length} buildings` : `${expected - present} unaccounted`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11">
        {run ? (
          allReported ? (
            <span className={expected - present > 0 ? 'text-advisory' : 'text-text-muted'}>
              All buildings reported in <span className="mono">{mmss(allReportedAtMs)}</span>.{' '}
              {expected - present > 0 ? `${expected - present} unaccounted for in ${short.map((b) => b.building).join(', ')}. Search teams to the last badge locations.` : 'Everyone accounted for.'}
            </span>
          ) : (
            <span className="text-text-muted">
              Started <span className="mono">{fmtClock(run.startedAt)}</span> by {DUTY_OFFICER}. Roll-call terminals reporting; door counters in muster mode.
            </span>
          )
        ) : (
          <span className="text-text-muted">
            Headcount from the 22:00 roll, adjusted by door and gate reads since.{' '}
            {short.length > 0 && <span className="text-advisory">{short.map((b) => `${b.building} short by ${b.expected - b.present}`).join('; ')}. Trace is checking gate sign-outs.</span>}
          </span>
        )}
      </div>
    </Panel>
  );
}
