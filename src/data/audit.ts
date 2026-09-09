import type { AuditEntry } from '@/lib/types';
import { makeRng } from '@/lib/rng';
import { DEMO_NOW, DAY_MS, ago, hr, min } from '@/lib/time';
import { DETECTIONS } from './detections';
import { HISTORICAL_INCIDENTS } from './incidents';
import { SENSORS } from './sensors';

const rng = makeRng(4417);

const HUMANS = ['Sgt K. Adeyemi', 'Sgt M. Okafor', 'Cpl D. Ferreira', 'Security manager R. Bell'];

function generate(): AuditEntry[] {
  const out: AuditEntry[] = [];
  let n = 0;
  const push = (ts: number, actor: string, actorKind: AuditEntry['actorKind'], action: string, target: string, record: AuditEntry['record']) => {
    out.push({ id: `AUD-${(50000 + ++n).toString()}`, ts, actor, actorKind, action, target, record });
  };

  // Every detection disposition is an audit row
  for (const d of DETECTIONS) {
    push(d.ts + 1200, 'Sift', 'agent', d.disposition === 'dismissed' ? 'Dismissed detection' : d.disposition === 'merged' ? 'Merged detection' : 'Escalated detection', d.id, {
      sensor: d.sensorId, class: d.class, confidence: d.confidence, reason: d.dispositionReason, incident: d.incidentId ?? '',
    });
  }

  // Incident timeline events
  for (const inc of HISTORICAL_INCIDENTS) {
    for (const e of inc.timeline) {
      push(e.ts, e.actorName, e.actor === 'human' ? 'human' : 'agent', e.actor === 'human' ? 'Human decision' : 'Agent action', inc.id, { text: e.text });
    }
  }

  // Patrol completions, ~every 20 minutes
  for (let t = DEMO_NOW - DAY_MS; t < DEMO_NOW; t += min(20) + rng.int(-120, 120) * 1000) {
    push(t, 'Trace', 'agent', 'Virtual patrol completed', rng.pick(['PR-01 Perimeter sweep', 'PR-02 HQ interior', 'PR-03 Motor pool and fuel', 'PR-04 Armoury and barracks']), {
      stops: rng.int(6, 12), exceptions: rng.chance(0.15) ? 1 : 0, durationSec: rng.int(180, 320),
    });
  }

  // Health checks, hourly
  for (let t = DEMO_NOW - DAY_MS; t < DEMO_NOW; t += hr(1)) {
    push(t + rng.int(0, 600) * 1000, 'Fitter', 'agent', 'Sensor health sweep', 'All sensors', { checked: SENSORS.length, degraded: 3, offline: 1 });
  }

  // A few recalibrations and configuration edits
  push(ago(hr(6) + min(30)), 'Fitter', 'agent', 'Raised maintenance ticket', 'CAM-P-W1', { ticket: 'FM-1187', fault: 'Media converter' });
  push(ago(min(22)), 'Fitter', 'agent', 'Recalibrated exposure', 'CAM-P-N3', { before: 'auto', after: 'manual -1.3EV', result: 'still degraded' });
  push(ago(hr(8) + min(5)), 'Fitter', 'agent', 'Held asset for maintenance', 'Kite-3', { reason: 'Motor 3 vibration above threshold' });
  push(ago(hr(9) + min(2)), 'Sgt M. Okafor', 'human', 'Changed autonomy level', 'Warden / medical notifications', { from: 'Act with approval', to: 'Autonomous', reason: 'Medic paging must not wait' });
  push(ago(hr(12) + min(40)), 'Security manager R. Bell', 'human', 'Edited policy', 'Contractor account single-session', { enabled: true });
  push(ago(hr(2) + min(1)), 'Sgt K. Adeyemi', 'human', 'Acknowledged shift start', 'Night shift', { onDuty: true });
  push(ago(hr(10) + min(1)), 'Sgt M. Okafor', 'human', 'Signed incident report', 'INC-0335', { signed: true });
  push(ago(hr(4) + min(50)), 'Sgt K. Adeyemi', 'human', 'Signed incident report', 'INC-0339', { signed: true });
  push(ago(hr(11) + min(9)), 'Scribe', 'agent', 'Drafted incident report', 'INC-0333', { words: 412 });
  push(ago(hr(22)), 'Scribe', 'agent', 'Published daily summary', '13 Mar', { incidents: 7, humanDecisions: 5, autoResolvedPct: 94 });
  push(ago(hr(22) + min(17)), 'Scribe', 'agent', 'Published shift handover', '0600 handover', { words: 540 });
  push(ago(min(11)), 'Overwatch', 'agent', 'Held signal for correlation', 'ID-2261', { reason: 'Badge refused at DOOR-HQ-N; portal auth from off-camp address 8 minutes earlier' });
  push(ago(hr(15)), 'Dispatch', 'agent', 'Modified patrol loop', 'Kestrel-2', { change: 'West fence pass every 20m while CAM-P-W1 offline' });

  for (const h of HUMANS) {
    push(ago(hr(rng.int(3, 23)) + min(rng.int(0, 59))), h, 'human', 'Viewed audit log', 'Governance', { filter: 'Human decisions' });
  }

  out.sort((a, b) => b.ts - a.ts);
  return out;
}

export const AUDIT: AuditEntry[] = generate();
