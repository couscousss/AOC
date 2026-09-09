import type { LightingZone, DoorState, Geofence, PatrolRoute, PatrolLogEntry } from '@/lib/types';
import { ago, min, hr, sec, DEMO_NOW } from '@/lib/time';

export const LIGHTING_ZONES: LightingZone[] = [
  { id: 'LZ-GATE', name: 'Main gate', state: 'on', level: 100 },
  { id: 'LZ-ROADS', name: 'Internal roads', state: 'auto', level: 40 },
  { id: 'LZ-NE', name: 'Sector NE fence', state: 'auto', level: 15 },
  { id: 'LZ-NW', name: 'Sector NW fence', state: 'auto', level: 15 },
  { id: 'LZ-SE', name: 'Sector SE fence', state: 'auto', level: 15 },
  { id: 'LZ-SW', name: 'Sector SW fence', state: 'auto', level: 15 },
  { id: 'LZ-MP', name: 'Motor pool', state: 'auto', level: 35 },
  { id: 'LZ-HQ', name: 'HQ exterior', state: 'auto', level: 50 },
  { id: 'LZ-HELI', name: 'Helipad', state: 'off', level: 0 },
];

export const DOORS: DoorState[] = [
  { id: 'DOOR-HQ-S', name: 'HQ main entrance', zoneId: 'hq', locked: false, lastEvent: 'Badge 0331 accepted (Heron-1 escort)', lastTs: ago(min(2)) },
  { id: 'DOOR-HQ-N', name: 'HQ north door', zoneId: 'hq', locked: true, lastEvent: 'Badge ID-2261 refused', lastTs: ago(min(11)) },
  { id: 'DOOR-HQ-SRV', name: 'Server room', zoneId: 'hq', locked: true, lastEvent: 'Badge 0107 accepted', lastTs: ago(hr(5) + min(20)) },
  { id: 'DOOR-AR', name: 'Armoury', zoneId: 'armoury', locked: true, lastEvent: 'Dual-auth 0412 + 0587 accepted', lastTs: ago(hr(3) + min(40)) },
  { id: 'DOOR-G1', name: 'Guard house', zoneId: 'gate', locked: false, lastEvent: 'Badge 0228 accepted', lastTs: ago(min(19)) },
  { id: 'DOOR-BK-A', name: 'Barracks A', zoneId: 'barracks', locked: false, lastEvent: 'Badge 0455 accepted', lastTs: ago(min(48)) },
  { id: 'DOOR-BK-B', name: 'Barracks B', zoneId: 'barracks', locked: false, lastEvent: 'Badge 0609 accepted', lastTs: ago(hr(1) + min(5)) },
  { id: 'DOOR-DN', name: 'Drone nest hatch', zoneId: 'dronenest', locked: true, lastEvent: 'Auto-close after Osprey-1 return', lastTs: ago(hr(2) + min(38)) },
];

export const POWER = {
  gridKw: 412,
  generator: { id: 'GEN-1', state: 'standby' as 'standby' | 'running', fuelL: 1480, capacityL: 2400, burnLh: 3.1, reserveL: 400, hoursSinceService: 212 },
  generator2: { id: 'GEN-2', state: 'standby' as 'standby' | 'running', fuelL: 2310, capacityL: 2400, burnLh: 3.0, reserveL: 400, hoursSinceService: 88 },
  waterTankPct: 78,
  waterTankL: 18700,
  hvac: [
    { building: 'HQ', mode: 'night', setpoint: 19, actual: 19.4, status: 'nominal' as const },
    { building: 'Barracks A', mode: 'night', setpoint: 18, actual: 18.1, status: 'nominal' as const },
    { building: 'Barracks B', mode: 'night', setpoint: 18, actual: 17.2, status: 'advisory' as const },
    { building: 'Server room', mode: 'cool', setpoint: 21, actual: 21.0, status: 'nominal' as const },
    { building: 'Armoury', mode: 'dehumidify', setpoint: 17, actual: 17.3, status: 'nominal' as const },
    { building: 'Mess hall', mode: 'off', setpoint: 0, actual: 14.8, status: 'nominal' as const },
  ],
  powerSeries: Array.from({ length: 24 }, (_, i) => ({ h: i, kw: 380 + Math.round(Math.sin((i - 6) / 3.8) * 90 + (i > 7 && i < 19 ? 120 : 0)) })),
};

export const GEOFENCES: Geofence[] = [
  { id: 'GF-HELI', name: 'Helipad approach corridor', kind: 'corridor', polygon: [[100, -70], [140, -70], [220, -160], [180, -180]], minAlt: 0, maxAlt: 120 },
  { id: 'GF-NOFLY-AR', name: 'Armoury no-fly', kind: 'nofly', polygon: [[-150, 50], [-98, 50], [-98, 94], [-150, 94]], minAlt: 0, maxAlt: 150 },
  { id: 'GF-NOFLY-COMMS', name: 'Comms tower exclusion', kind: 'nofly', polygon: [[48, -92], [76, -92], [76, -64], [48, -64]], minAlt: 0, maxAlt: 80 },
  { id: 'GF-CAMP', name: 'Camp operating geofence', kind: 'geofence', polygon: [[-220, -170], [230, -170], [230, 170], [-220, 170]], minAlt: 0, maxAlt: 120 },
];

export const PATROL_ROUTES: PatrolRoute[] = [
  { id: 'PR-01', name: 'Perimeter sweep', cameraIds: ['CAM-P-N1', 'CAM-P-N2', 'CAM-P-N3', 'PTZ-P-NE', 'CAM-P-E1', 'CAM-P-E2', 'CAM-P-S1', 'CAM-P-S2', 'THM-P-SW', 'CAM-P-W1'], dwellSec: 20, frequencyMin: 30, lastCompleted: ago(min(9)), nextDue: DEMO_NOW + min(21), agentId: 'trace', runsPerNight: 18 },
  { id: 'PR-02', name: 'HQ interior', cameraIds: ['CAM-HQ-01', 'CAM-HQ-03', 'CAM-HQ-05', 'CAM-HQ-02', 'CAM-HQ-04'], dwellSec: 25, frequencyMin: 40, lastCompleted: ago(min(3)), nextDue: DEMO_NOW + min(37), agentId: 'trace', runsPerNight: 13 },
  { id: 'PR-03', name: 'Motor pool and fuel', cameraIds: ['CAM-MP-01', 'CAM-MP-02', 'CAM-HQ-04', 'CAM-P-E2', 'CAM-P-S1'], dwellSec: 20, frequencyMin: 45, lastCompleted: ago(min(41)), nextDue: DEMO_NOW + min(4), agentId: 'trace', runsPerNight: 12 },
  { id: 'PR-04', name: 'Armoury and barracks', cameraIds: ['CAM-AR-01', 'CAM-AR-02', 'CAM-BK-01', 'CAM-BK-02', 'CAM-P-S2'], dwellSec: 30, frequencyMin: 30, lastCompleted: ago(min(17)), nextDue: DEMO_NOW + min(13), agentId: 'trace', runsPerNight: 18 },
];

const obs = [
  'Fence line intact, no movement.',
  'Door closed, no one in frame.',
  'Vehicles as inventoried, shelter lights on night cycle.',
  'Corridor empty, lights on reduced setting.',
  'Yard empty, bench unoccupied.',
  'Roof clear, comms tower beacon steady.',
  'Barrier down, guard visible at window.',
  'No thermal signatures above background.',
];

export const PATROL_LOG: PatrolLogEntry[] = (() => {
  const out: PatrolLogEntry[] = [];
  let n = 0;
  for (const r of PATROL_ROUTES) {
    let t = r.lastCompleted - r.cameraIds.length * r.dwellSec * 1000;
    r.cameraIds.forEach((c, i) => {
      const exception = (r.id === 'PR-01' && c === 'CAM-P-W1') || (r.id === 'PR-03' && c === 'CAM-MP-02' && i === 1);
      out.push({
        id: `PL-${(++n).toString().padStart(3, '0')}`,
        routeId: r.id,
        ts: t,
        cameraId: c,
        observation: exception
          ? c === 'CAM-P-W1'
            ? 'Stream unavailable. Substituted THM-P-SW; no signatures in the west sector.'
            : 'Shelter door 3 ajar approximately 30cm. Not on the open-door list. Flagged to Sift; matched to Ferret-4 spares delivery.'
          : obs[(i + r.cameraIds.length) % obs.length],
        flag: exception ? 'exception' : 'nominal',
      });
      t += r.dwellSec * 1000 + sec(6);
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
})();

export const WEATHER = {
  tempC: 9,
  windKt: 6,
  gustKt: 11,
  windDir: 'NW',
  visibilityKm: 8,
  cloud: 'Overcast, base 900 ft',
  precip: 'Light rain earlier, stopped 02:40',
  pressureHpa: 1009,
  sunrise: '06:41',
  impact: [
    { text: 'Wind 6 kt — drone ops unrestricted', level: 'nominal' as const },
    { text: 'Visibility 8 km — EO cameras nominal', level: 'nominal' as const },
    { text: 'Ground wet — radar clutter slightly elevated on RDR-P-N', level: 'advisory' as const },
  ],
};

export const MUSTER = [
  { building: 'HQ', expected: 14, present: 14 },
  { building: 'Barracks A', expected: 128, present: 126 },
  { building: 'Barracks B', expected: 131, present: 131 },
  { building: 'Guard house', expected: 4, present: 4 },
  { building: 'Mess hall', expected: 3, present: 3 },
  { building: 'Workshop', expected: 0, present: 0 },
  { building: 'Motor pool', expected: 1, present: 1 },
];

export const AIR_QUALITY = [
  { id: 'GAS-HQ-01', place: 'HQ plant room', co2: 612, co: 0.4, voc: 0.12, status: 'nominal' as const },
  { id: 'GAS-BK-01', place: 'Barracks B boiler', co2: 780, co: 1.9, voc: 0.08, status: 'advisory' as const },
  { id: 'AQ-EXT', place: 'Exterior (HQ roof)', co2: 421, co: 0.1, voc: 0.02, status: 'nominal' as const },
];

export const FLOOD = [
  { id: 'FLD-HQ-01', place: 'HQ plant room', wet: false, status: 'nominal' as const, lastTrip: 'Never' },
  { id: 'FLD-LG-01', place: 'Low ground drain', wet: false, status: 'degraded' as const, lastTrip: 'Yesterday 09:53 (INC-0332)' },
  { id: 'FLD-GEN', place: 'Generator hut', wet: false, status: 'nominal' as const, lastTrip: '3 weeks ago' },
];

export const CYBER = {
  segments: [
    { id: 'OT-SEC', name: 'Security OT', hosts: 61, health: 'nominal' as const, note: 'Cameras, radar, fence controllers' },
    { id: 'OT-BMS', name: 'Building management', hosts: 24, health: 'nominal' as const, note: 'HVAC, lighting, power' },
    { id: 'IT-CORP', name: 'Corporate', hosts: 212, health: 'nominal' as const, note: 'Staff workstations' },
    { id: 'IT-GUEST', name: 'Guest and contractor', hosts: 9, health: 'advisory' as const, note: '1 unknown device' },
    { id: 'ROBO', name: 'Robotics mesh', hosts: 9, health: 'nominal' as const, note: 'Fleet control plane' },
  ],
  anomalies: [
    { id: 'CY-0412', ts: ago(min(11)), kind: 'Badge refused', detail: 'ID-2261 (contractor, J. Marsh) at DOOR-HQ-N. Outside contractor hours.', severity: 'low' as const, held: true },
    { id: 'CY-0411', ts: ago(min(19)), kind: 'Portal auth, off-camp', detail: 'Account j.marsh authenticated to the contractor portal from an address outside the camp range.', severity: 'low' as const, held: true },
    { id: 'CY-0410', ts: ago(hr(1) + min(2)), kind: 'Unknown device', detail: 'MAC 3C:71:… joined IT-GUEST, no captive portal completion. Quarantined.', severity: 'low' as const, held: false },
    { id: 'CY-0409', ts: ago(hr(3) + min(20)), kind: 'Failed logins', detail: '4 failed logins to the BMS console from a corporate workstation. User locked, unlocked by helpdesk.', severity: 'low' as const, held: false },
    { id: 'CY-0408', ts: ago(hr(7)), kind: 'Firmware drift', detail: 'CAM-P-N3 reports firmware 4.2.1; fleet baseline is 4.2.3.', severity: 'low' as const, held: false },
  ],
  devices: [
    { id: 'DEV-3C71', mac: '3C:71:BF:22:0A:91', segment: 'IT-GUEST', seen: ago(hr(1) + min(2)), state: 'quarantined' as const, vendor: 'Unknown' },
    { id: 'DEV-A4C3', mac: 'A4:C3:F0:11:8E:2D', segment: 'IT-GUEST', seen: ago(min(9)), state: 'unknown' as const, vendor: 'Consumer handset' },
  ],
  credentials: [
    { badge: 'ID-2261', holder: 'J. Marsh', org: 'Halden & Co', status: 'held', lastRead: 'DOOR-HQ-N 04:06 refused' },
    { badge: '0587', holder: 'Pte Lindqvist', org: 'Camp', status: 'replaced', lastRead: 'DOOR-AR 23:11 (no read, battery)' },
    { badge: '0412', holder: 'Cpl Osei', org: 'Camp', status: 'active', lastRead: 'DOOR-AR 23:11 accepted' },
  ],
};

export const ACCESS = {
  allowList: [
    { plate: 'SGP-4471', owner: 'Halden & Co (facilities)', kind: 'Contractor', visits: 34 },
    { plate: 'SGP-8012', owner: 'Bakery (daily delivery)', kind: 'Supplier', visits: 210 },
    { plate: 'SGP-0193', owner: 'Camp vehicle 2-08', kind: 'Camp', visits: 1180 },
    { plate: 'SGP-2277', owner: 'Delivery van (workshop)', kind: 'Supplier', visits: 12 },
    { plate: 'SGT-3390', owner: 'Taxi (30-day memory)', kind: 'Temporary', visits: 1 },
  ],
  recentReads: [
    { ts: ago(min(25)), plate: 'SGP-8012', reader: 'ANPR-G1', result: 'Allowed — bakery, daily' },
    { ts: ago(hr(1) + min(19)), plate: 'SGP-0193', reader: 'ANPR-G1', result: 'Allowed — camp vehicle 2-08' },
    { ts: ago(hr(3) + min(46)), plate: 'SGP-4471', reader: 'ANPR-G2', result: 'Allowed — contractor, exit' },
    { ts: ago(hr(3) + min(58)), plate: 'SGP-7716', reader: 'ANPR-MP', result: 'Delivery pass W-118' },
    { ts: ago(hr(4) + min(5)), plate: 'SGP-7716', reader: 'ANPR-G2', result: 'Delivery pass W-118, dwell 45m' },
    { ts: ago(hr(7) + min(30)), plate: 'SGT-3390', reader: 'ANPR-G1', result: 'Not on list — guard handled (INC-0338)' },
  ],
  visitors: [
    { name: 'Mrs A. Halden', org: 'Halden & Co', host: 'Facilities manager', arrive: 'Today 09:00', status: 'pre-registered', escort: 'Required' },
    { name: 'D. Kowalski', org: 'Comms vendor', host: 'Signals', arrive: 'Today 10:30', status: 'pre-registered', escort: 'Required' },
    { name: 'Fire inspector T. Ng', org: 'District fire', host: 'Camp safety', arrive: 'Today 14:00', status: 'pre-registered', escort: 'Not required' },
    { name: 'Bakery driver', org: 'Supplier', host: 'Mess hall', arrive: '03:52', status: 'on camp', escort: 'Not required' },
  ],
  escorts: [
    { contractor: 'Bakery driver', escort: 'None (supplier zone only)', location: 'Mess hall loading bay', since: ago(min(24)), status: 'in zone' },
  ],
  tailgating24h: 3,
};
