import { useMemo, useState } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import type { Detection, FeedLine, Incident, Sensor, Zone } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { ZONE_BY_ID } from '@/data/zones';
import { agentName } from '@/data/agents';
import { demoNow, fmtTime, min, DAY_MS } from '@/lib/time';
import { VideoWall, type WallCamera } from './VideoWall';
import { DetectionLedger } from './DetectionLedger';

/** The zone's cameras first, then the nearest cameras from the rest of the camp, so the wall is always 12. */
function pickWall(sensors: Sensor[], zone: Zone): WallCamera[] {
  const cams = sensors.filter((s) => s.type === 'camera' || s.type === 'thermal');
  const own = cams.filter((s) => s.zoneId === zone.id);
  const dist = (s: Sensor) => Math.hypot(s.position[0] - zone.position[0], s.position[2] - zone.position[2]);
  const others = cams.filter((s) => s.zoneId !== zone.id).sort((a, b) => dist(a) - dist(b));
  return [...own, ...others].slice(0, 12).map((s) => ({ sensor: s, away: s.zoneId === zone.id ? null : ZONE_BY_ID[s.zoneId].name }));
}

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** Open incidents are not in the detection table, so their merged camera signals are derived here and shown as ledger rows. */
function liveRows(incidents: Incident[], wall: WallCamera[]): Detection[] {
  const out: Detection[] = [];
  for (const inc of incidents) {
    if (inc.state === 'closed') continue;
    for (const cam of wall) {
      const id = cam.sensor.id;
      if (!inc.sensorIds.includes(id)) continue;
      const evt = inc.timeline.find((e) => e.text.includes(id));
      const vehicleScene = cam.sensor.scene === 'road' || cam.sensor.scene === 'gate' || cam.sensor.scene === 'carpark';
      out.push({
        id: `DET-${inc.id}-${id}`, ts: evt?.ts ?? inc.openedAt, sensorId: id,
        class: vehicleScene ? 'vehicle' : 'person', confidence: 0.84 + (hash(id) % 12) / 100,
        bbox: vehicleScene ? [0.6, 0.64, 0.24, 0.16] : [0.385, 0.5, 0.075, 0.29], thumbnailUrl: '',
        disposition: 'merged', dispositionReason: `merged into ${inc.id}`, incidentId: inc.id,
      });
    }
  }
  return out;
}

export function VideoAnalytics({ zone }: CapabilityProps) {
  const sensors = useStore((s) => s.sensors);
  const detections = useStore((s) => s.detections);
  const incidents = useStore((s) => s.incidents);
  const feed = useStore((s) => s.feed);
  const replayAt = useStore((s) => s.replayAt);
  const beat = useStore((s) => s.scenario.beat);
  const openIncident = useStore((s) => s.openIncident);

  const [selected, setSelected] = useState<string | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);

  const wall = useMemo(() => pickWall(sensors, zone), [sensors, zone]);
  const wallIds = useMemo(() => new Set(wall.map((c) => c.sensor.id)), [wall]);
  const now = replayAt ?? demoNow();

  const allRows = useMemo(() => {
    const base = detections.filter((d) => wallIds.has(d.sensorId));
    return [...base, ...liveRows(incidents, wall)].sort((a, b) => a.ts - b.ts);
  }, [detections, incidents, wall, wallIds]);
  // Cut to the 24h window ending at the replay point (or now). `now` is deliberately not a memo dependency:
  // the list is small and the boundary moves by a few rows per hour.
  const rows = allRows.filter((d) => d.ts <= now && d.ts > now - DAY_MS);

  const live = incidents.find((i) => i.state !== 'closed' && i.sensorIds.some((id) => wallIds.has(id)));
  const offline = wall.filter((c) => c.sensor.status === 'offline');
  const lastMinute = rows.filter((d) => d.ts > now - min(1)).length + feed.filter((f) => f.agentId === 'sentry' && f.ts > now - min(1)).length;
  const streams = wall.length - offline.length;

  let status: string;
  if (replayAt) {
    status = `Replay at ${fmtTime(replayAt)}. Ledger and timestamps as they stood then; streams keep looping.`;
  } else if (live) {
    const cams = live.sensorIds.filter((id) => wallIds.has(id));
    status = `Watching ${streams} streams. ${live.id} open on ${cams.join(' and ')}; ${lastMinute} other detection${lastMinute === 1 ? '' : 's'} in the last minute, all below threshold.`;
  } else {
    status = `Watching ${streams} streams. ${lastMinute === 0 ? 'Nothing above threshold in the last minute.' : `${lastMinute} detection${lastMinute === 1 ? '' : 's'} in the last minute, all below threshold.`}`;
  }
  if (offline.length) status += ` ${offline.map((c) => c.sensor.id).join(', ')} offline, covered by thermal and a robot pass.`;

  return (
    <CapabilityShell
      capability="video"
      status={status}
      headerRight={
        <button type="button" className="chip" aria-pressed={showBoxes} onClick={() => setShowBoxes((v) => !v)} title="Sentry's boxes, drawn in agent colour">
          Bounding boxes {showBoxes ? 'on' : 'off'}
        </button>
      }
      noLower
      primary={
        <div className="h-full min-h-0 flex">
          <div className="flex-1 min-w-0 min-h-0 flex flex-col p-2 gap-2">
            <VideoWall cameras={wall} selectedId={selected} onSelect={setSelected} showBoxes={showBoxes} beat={beat} />
            <ActivityStrip feed={feed} />
          </div>
          <div className="w-[38%] min-w-[340px] max-w-[460px] shrink-0 border-l hairline min-h-0">
            <DetectionLedger
              rows={rows}
              cameraId={selected}
              onClearCamera={() => setSelected(null)}
              onOpenIncident={openIncident}
              onShowCamera={(id) => setSelected(wallIds.has(id) ? id : null)}
              replayAt={replayAt}
            />
          </div>
        </div>
      }
    />
  );
}

/** Perception and triage lines only: what Sentry saw and what Sift did with it. Every line is machine-authored. */
function ActivityStrip({ feed }: { feed: FeedLine[] }) {
  const lines = useMemo(() => feed.filter((f) => f.agentId === 'sentry' || f.agentId === 'sift' || f.incidentId).slice(-30).reverse(), [feed]);
  return (
    <div className="h-[96px] shrink-0 inset flex flex-col min-h-0">
      <div className="px-3 py-1 border-b hairline text-12 text-text-muted shrink-0">Agent activity · Sentry and Sift</div>
      <div className="flex-1 min-h-0 overflow-auto">
        {lines.length === 0 ? (
          <div className="p-2 text-12 text-text-muted">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-line/50">
            {lines.map((l) => (
              <li key={l.id} className="px-3 py-0.5 text-12 flex gap-2 min-w-0">
                <span className="mono text-text-muted shrink-0">{fmtTime(l.ts)}</span>
                <span className="agent-text truncate" title={l.text}><span className="font-medium">{agentName(l.agentId)}</span> — {l.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
