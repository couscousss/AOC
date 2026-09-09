import type { Detection, DetectionClass } from '@/lib/types';
import { makeRng } from '@/lib/rng';
import { DEMO_NOW, DAY_MS, min } from '@/lib/time';
import { SENSORS } from './sensors';

const rng = makeRng(20260314);

const CAMS = SENSORS.filter((s) => s.type === 'camera' || s.type === 'thermal' || s.type === 'anpr');

type Template = { cls: DetectionClass; weight: number; cams?: string[]; reasons: string[]; escalate?: number; conf: [number, number] };

const T: Template[] = [
  {
    cls: 'vehicle', weight: 34, conf: [0.82, 0.99],
    cams: ['CAM-G1-01', 'CAM-G1-02', 'CAM-MP-01', 'CAM-MP-02', 'CAM-RD-E', 'ANPR-G1', 'ANPR-G2', 'ANPR-MP'],
    reasons: [
      'dismissed — known vehicle, motor pool inventory',
      'dismissed — plate on allow-list',
      'dismissed — matches scheduled delivery',
      'dismissed — camp vehicle, route matches tasking',
      'dismissed — bakery van, daily 0350–0420',
      'dismissed — patrol vehicle, roster confirmed',
    ],
  },
  {
    cls: 'person', weight: 40, conf: [0.7, 0.98],
    reasons: [
      'dismissed — uniformed, badge read 40s earlier',
      'dismissed — matches roster, expected location',
      'dismissed — guard on foot patrol, position confirmed',
      'dismissed — smoking area, expected 2230–2300',
      'dismissed — re-identified as duty cook',
      'dismissed — contractor, escort confirmed',
    ],
  },
  { cls: 'animal', weight: 9, conf: [0.55, 0.9], cams: ['CAM-P-S1', 'CAM-P-S2', 'THM-P-SW', 'CAM-P-N1', 'CAM-P-W1', 'CAM-P-E2'], reasons: ['dismissed — fox at drainage culvert', 'dismissed — bird', 'dismissed — stray dog, known'] },
  { cls: 'loitering', weight: 5, conf: [0.6, 0.85], cams: ['CAM-BK-02', 'CAM-HQ-01', 'CAM-G1-03', 'CAM-MP-01'], reasons: ['dismissed — smoking area window', 'dismissed — waiting for vehicle, plate arrived 3m later', 'dismissed — phone call, uniformed'] },
  { cls: 'crowd forming', weight: 2, conf: [0.6, 0.8], cams: ['CAM-BK-02', 'CAM-HQ-01'], reasons: ['dismissed — shift change, expected', 'dismissed — smoking area window'] },
  { cls: 'tailgating', weight: 3, conf: [0.65, 0.9], cams: ['CAM-HQ-01', 'CAM-HQ-02', 'CAM-AR-01', 'CAM-BK-01'], reasons: ['dismissed — both badges read within 2s', 'dismissed — bakery van door, known pattern'], escalate: 0.3 },
  { cls: 'bag left unattended', weight: 2, conf: [0.6, 0.85], cams: ['CAM-HQ-01', 'CAM-G1-03', 'CAM-HQ-03'], reasons: ['dismissed — owner returned within 90s'], escalate: 0.5 },
  { cls: 'person down', weight: 1, conf: [0.5, 0.8], cams: ['CAM-BK-02', 'CAM-MP-01', 'CAM-HQ-03'], reasons: ['dismissed — sitting on kerb, stood up 20s later'], escalate: 0.5 },
  { cls: 'climbing fence', weight: 1, conf: [0.5, 0.75], cams: ['CAM-P-N1', 'CAM-P-S1', 'CAM-P-E1'], reasons: ['dismissed — maintenance ladder, ticket FM-1180'], escalate: 0.6 },
  { cls: 'unknown drone', weight: 1, conf: [0.55, 0.85], cams: ['PTZ-P-NE', 'CAM-HQ-04', 'CAM-HP-01'], reasons: ['dismissed — bird, RF confirms no emitter'], escalate: 0.6 },
];

const HISTORICAL_INCIDENTS = ['INC-0330', 'INC-0331', 'INC-0333', 'INC-0335', 'INC-0336', 'INC-0338', 'INC-0339', 'INC-0340', 'INC-0341'];

function pickTemplate() {
  const total = T.reduce((s, t) => s + t.weight, 0);
  let r = rng.next() * total;
  for (const t of T) {
    if (r < t.weight) return t;
    r -= t.weight;
  }
  return T[0];
}

function hourWeight(h: number) {
  // Daytime is busier. Demo now is 04:17, so 24h window spans yesterday 04:17 → now.
  if (h >= 6 && h < 9) return 2.2;
  if (h >= 9 && h < 17) return 1.8;
  if (h >= 17 && h < 20) return 1.6;
  if (h >= 20 && h < 23) return 1.0;
  return 0.45;
}

function generate(): Detection[] {
  const out: Detection[] = [];
  const start = DEMO_NOW - DAY_MS;
  let n = 0;
  while (out.length < 250) {
    n++;
    const ts = start + rng.next() * DAY_MS;
    const h = new Date(ts).getHours();
    if (!rng.chance(hourWeight(h) / 2.2)) continue;
    const t = pickTemplate();
    const pool = t.cams ? CAMS.filter((c) => t.cams!.includes(c.id)) : CAMS.filter((c) => c.type !== 'anpr');
    const cam = rng.pick(pool);
    const conf = rng.float(t.conf[0], t.conf[1]);
    let disposition: Detection['disposition'] = 'dismissed';
    let reason = rng.pick(t.reasons);
    let incidentId: string | undefined;
    const esc = t.escalate ?? 0.02;
    if (rng.chance(esc)) {
      if (rng.chance(0.6)) {
        disposition = 'merged';
        incidentId = rng.pick(HISTORICAL_INCIDENTS);
        reason = `merged into ${incidentId}`;
      } else {
        disposition = 'escalated';
        reason = 'escalated — no matching roster or schedule';
      }
    }
    const bw = rng.float(0.08, 0.22);
    const bh = rng.float(0.15, 0.45);
    out.push({
      id: `DET-${(31000 + n).toString()}`,
      ts: Math.round(ts),
      sensorId: cam.id,
      class: t.cls,
      confidence: Math.round(conf * 100) / 100,
      bbox: [rng.float(0.05, 0.9 - bw), rng.float(0.1, 0.9 - bh), bw, bh],
      thumbnailUrl: '',
      disposition,
      dispositionReason: reason,
      incidentId,
    });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

export const DETECTIONS: Detection[] = generate();

/** Live bounding-box keyframes per camera scene for the video grid overlay (not inference, keyframed). */
export type BoxTrack = { cls: DetectionClass; conf: number; keys: { t: number; box: [number, number, number, number] }[]; period: number };

export const BOX_TRACKS: Record<string, BoxTrack[]> = {
  'CAM-G1-01': [
    { cls: 'vehicle', conf: 0.97, period: 14, keys: [{ t: 0, box: [0.72, 0.42, 0.16, 0.2] }, { t: 6, box: [0.42, 0.44, 0.24, 0.28] }, { t: 10, box: [0.18, 0.48, 0.3, 0.34] }, { t: 14, box: [0.72, 0.42, 0.16, 0.2] }] },
  ],
  'CAM-G1-02': [
    { cls: 'person', conf: 0.91, period: 18, keys: [{ t: 0, box: [0.1, 0.35, 0.07, 0.34] }, { t: 9, box: [0.5, 0.36, 0.07, 0.34] }, { t: 18, box: [0.88, 0.35, 0.07, 0.34] }] },
  ],
  'CAM-MP-01': [
    { cls: 'vehicle', conf: 0.94, period: 20, keys: [{ t: 0, box: [0.15, 0.5, 0.2, 0.22] }, { t: 20, box: [0.15, 0.5, 0.2, 0.22] }] },
    { cls: 'person', conf: 0.88, period: 12, keys: [{ t: 0, box: [0.6, 0.4, 0.06, 0.3] }, { t: 6, box: [0.7, 0.42, 0.06, 0.3] }, { t: 12, box: [0.6, 0.4, 0.06, 0.3] }] },
  ],
  'CAM-BK-02': [
    { cls: 'person', conf: 0.86, period: 16, keys: [{ t: 0, box: [0.3, 0.5, 0.06, 0.28] }, { t: 8, box: [0.34, 0.5, 0.06, 0.28] }, { t: 16, box: [0.3, 0.5, 0.06, 0.28] }] },
    { cls: 'person', conf: 0.83, period: 16, keys: [{ t: 0, box: [0.42, 0.52, 0.06, 0.26] }, { t: 16, box: [0.42, 0.52, 0.06, 0.26] }] },
  ],
  'CAM-HQ-01': [
    { cls: 'person', conf: 0.95, period: 10, keys: [{ t: 0, box: [0.46, 0.3, 0.08, 0.5] }, { t: 5, box: [0.5, 0.28, 0.09, 0.55] }, { t: 10, box: [0.46, 0.3, 0.08, 0.5] }] },
  ],
  'CAM-HQ-03': [
    { cls: 'person', conf: 0.92, period: 14, keys: [{ t: 0, box: [0.2, 0.25, 0.1, 0.6] }, { t: 7, box: [0.6, 0.22, 0.12, 0.66] }, { t: 14, box: [0.2, 0.25, 0.1, 0.6] }] },
  ],
  'CAM-RD-E': [
    { cls: 'vehicle', conf: 0.93, period: 16, keys: [{ t: 0, box: [0.4, 0.55, 0.18, 0.16] }, { t: 8, box: [0.44, 0.4, 0.1, 0.1] }, { t: 16, box: [0.4, 0.55, 0.18, 0.16] }] },
  ],
  'CAM-P-N2': [
    { cls: 'animal', conf: 0.61, period: 22, keys: [{ t: 0, box: [0.1, 0.62, 0.05, 0.06] }, { t: 11, box: [0.5, 0.64, 0.05, 0.06] }, { t: 22, box: [0.9, 0.62, 0.05, 0.06] }] },
  ],
  'CAM-HP-01': [],
  'CAM-AR-01': [],
  'CAM-P-N3': [],
  'CAM-DN-01': [],
};

export function boxAt(track: BoxTrack, tSec: number): [number, number, number, number] {
  const t = tSec % track.period;
  const k = track.keys;
  for (let i = 0; i < k.length - 1; i++) {
    if (t >= k[i].t && t <= k[i + 1].t) {
      const f = (t - k[i].t) / (k[i + 1].t - k[i].t || 1);
      return k[i].box.map((v, j) => v + (k[i + 1].box[j] - v) * f) as [number, number, number, number];
    }
  }
  return k[0].box;
}
