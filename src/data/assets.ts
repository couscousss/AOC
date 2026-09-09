import type { Asset, Waypoint, Vec3 } from '@/lib/types';
import { ago, min, hr, DEMO_NOW } from '@/lib/time';

const wp = (x: number, z: number, action?: Waypoint['action']): Waypoint => ({ position: [x, 0, z], action });

/** Inner perimeter road loop, clockwise from the robot dock */
export const PERIMETER_LOOP: Waypoint[] = [
  wp(-30, -126), wp(176, -126), wp(176, 126), wp(-176, 126), wp(-176, -126), wp(-30, -126),
];

export const MOTORPOOL_LOOP: Waypoint[] = [
  wp(70, 30), wp(70, 96), wp(150, 96), wp(150, 30), wp(70, 30),
];

export const HQ_LOOP: Waypoint[] = [
  wp(-70, -62), wp(70, -62), wp(70, 30), wp(-70, 30), wp(-70, -62),
];

const DOCK: Vec3 = [-30, 0, -96];
const NEST: Vec3 = [40, 0, -112];

const svc = (daysAgo: number, hours: number, dueDays: number, cycles: number, flagged?: string) => ({
  lastService: new Date(DEMO_NOW - daysAgo * 24 * 3600 * 1000).toISOString(),
  hours,
  nextDue: new Date(DEMO_NOW + dueDays * 24 * 3600 * 1000).toISOString(),
  cycles,
  flagged,
});

export const ASSETS: Asset[] = [
  {
    id: 'A-KES2', callsign: 'Kestrel-2', class: 'robot-dog', model: 'Quadruped Mk3',
    battery: 71, state: 'patrolling', position: [60, 0, -126], heading: 90, speed: 1.6,
    currentTask: 'Inner perimeter patrol, loop 4 of 6', route: PERIMETER_LOOP, routeProgress: 0.08, routeLoop: true,
    home: DOCK, connectivity: 'good',
    telemetry: { speed: 1.6, heading: 90, temperature: 41, odometer: 1842, imu: 0.02 },
    maintenance: svc(11, 612, 19, 208),
    taskHistory: [
      { ts: ago(min(52)), task: 'Inner perimeter patrol, loop 3', result: 'Completed, nominal' },
      { ts: ago(hr(1) + min(44)), task: 'Inner perimeter patrol, loop 2', result: 'Completed, one exception logged (stray dog, south fence)' },
      { ts: ago(hr(2) + min(35)), task: 'Inner perimeter patrol, loop 1', result: 'Completed, nominal' },
      { ts: ago(hr(3) + min(10)), task: 'Charge to 100%', result: 'Completed' },
    ],
  },
  {
    id: 'A-BDG1', callsign: 'Badger-1', class: 'robot-dog', model: 'Quadruped Mk3',
    battery: 96, state: 'charging', position: [-34, 0, -96], heading: 0, speed: 1.6,
    currentTask: 'Charging at dock bay 1', home: DOCK, connectivity: 'good',
    telemetry: { speed: 0, heading: 0, temperature: 28, odometer: 2210, imu: 0 },
    maintenance: svc(4, 744, 26, 251),
    taskHistory: [
      { ts: ago(hr(1) + min(5)), task: 'Return to dock', result: 'Docked, charging' },
      { ts: ago(hr(3) + min(20)), task: 'Armoury exterior check', result: 'Completed, seals intact' },
      { ts: ago(hr(5)), task: 'Inner perimeter patrol', result: 'Completed, nominal' },
    ],
  },
  {
    id: 'A-FER4', callsign: 'Ferret-4', class: 'ugv', model: 'Tracked UGV 6x6',
    battery: 58, state: 'patrolling', position: [70, 0, 60], heading: 180, speed: 2.2,
    currentTask: 'Motor pool sweep', route: MOTORPOOL_LOOP, routeProgress: 0.2, routeLoop: true,
    home: DOCK, connectivity: 'good',
    telemetry: { speed: 2.2, heading: 180, temperature: 47, odometer: 4410, imu: 0.01 },
    maintenance: svc(31, 1290, 3, 402, 'Left track tension trending high; service brought forward'),
    taskHistory: [
      { ts: ago(min(20)), task: 'Motor pool sweep', result: 'In progress' },
      { ts: ago(hr(2)), task: 'Fuel store exterior inspect', result: 'Completed, nominal' },
      { ts: ago(hr(6)), task: 'Deliver spares to workshop', result: 'Completed' },
    ],
  },
  {
    id: 'A-HER1', callsign: 'Heron-1', class: 'humanoid', model: 'Bipedal service unit',
    battery: 82, state: 'tasked', position: [-8, 0, 26], heading: 180, speed: 1.0,
    currentTask: 'HQ interior walk-through, floor 2', home: DOCK, connectivity: 'good',
    telemetry: { speed: 0.8, heading: 180, temperature: 36, odometer: 310, imu: 0.04 },
    maintenance: svc(9, 188, 33, 77),
    taskHistory: [
      { ts: ago(min(8)), task: 'HQ interior walk-through', result: 'In progress' },
      { ts: ago(hr(1) + min(30)), task: 'Server room door check', result: 'Completed, secure' },
    ],
  },
  {
    id: 'A-MOL3', callsign: 'Mole-3', class: 'cleaning', model: 'Floor scrubber',
    battery: 44, state: 'tasked', position: [-40, 0, 62], heading: 90, speed: 0.6,
    currentTask: 'Mess hall floor, overnight cycle', home: DOCK, connectivity: 'fair',
    telemetry: { speed: 0.6, heading: 90, temperature: 31, odometer: 980, imu: 0 },
    maintenance: svc(20, 502, 10, 160),
    taskHistory: [
      { ts: ago(min(40)), task: 'Mess hall floor', result: 'In progress, 62%' },
      { ts: ago(hr(4)), task: 'HQ corridor B', result: 'Completed' },
    ],
  },
  {
    id: 'A-WRN5', callsign: 'Wren-5', class: 'service', model: 'Delivery cart',
    battery: 100, state: 'docked', position: [-26, 0, -96], heading: 0, speed: 1.2,
    currentTask: 'Idle at dock bay 3', home: DOCK, connectivity: 'good',
    telemetry: { speed: 0, heading: 0, temperature: 24, odometer: 1530, imu: 0 },
    maintenance: svc(15, 401, 45, 130),
    taskHistory: [
      { ts: ago(hr(2) + min(12)), task: 'Deliver handover pack to guard house', result: 'Completed' },
      { ts: ago(hr(7)), task: 'Collect samples from plant room', result: 'Completed' },
    ],
  },
  {
    id: 'A-OSP1', callsign: 'Osprey-1', class: 'drone', model: 'Quadcopter EO/IR',
    battery: 98, state: 'docked', position: NEST, heading: 0, altitude: 0, speed: 9,
    currentTask: 'Ready in nest bay 1', home: NEST, connectivity: 'good', payload: 'EO/IR gimbal', flightHours: 212,
    telemetry: { speed: 0, heading: 0, temperature: 22, altitude: 0, wind: 6 },
    maintenance: svc(6, 212, 24, 388),
    taskHistory: [
      { ts: ago(hr(2) + min(50)), task: 'Scheduled perimeter overflight', result: 'Completed, 11m 40s' },
      { ts: ago(hr(6) + min(30)), task: 'Scheduled perimeter overflight', result: 'Completed, 12m 05s' },
    ],
  },
  {
    id: 'A-OSP2', callsign: 'Osprey-2', class: 'drone', model: 'Quadcopter zoom',
    battery: 100, state: 'docked', position: [46, 0, -112], heading: 0, altitude: 0, speed: 9,
    currentTask: 'Ready in nest bay 2', home: NEST, connectivity: 'good', payload: '30x zoom', flightHours: 174,
    telemetry: { speed: 0, heading: 0, temperature: 22, altitude: 0, wind: 6 },
    maintenance: svc(6, 174, 24, 301),
    taskHistory: [
      { ts: ago(hr(4) + min(15)), task: 'Investigate radar track, south fence', result: 'Completed, fox' },
    ],
  },
  {
    id: 'A-KIT3', callsign: 'Kite-3', class: 'drone', model: 'Quadcopter spotlight',
    battery: 35, state: 'maintenance', position: [34, 0, -112], heading: 0, altitude: 0, speed: 8,
    currentTask: 'Held for propeller replacement', home: NEST, connectivity: 'good', payload: 'Spotlight', flightHours: 301,
    telemetry: { speed: 0, heading: 0, temperature: 22, altitude: 0, wind: 6 },
    maintenance: svc(41, 301, -2, 540, 'Motor 3 vibration above threshold on last two flights. Held by Fitter.'),
    taskHistory: [
      { ts: ago(hr(9)), task: 'Illuminate motor pool for vehicle check', result: 'Completed, vibration warning logged' },
    ],
  },
];

export const ASSET_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a])) as Record<string, Asset>;

/** Interpolate a position along a waypoint route for progress in [0,1]. */
export function positionOnRoute(route: Waypoint[], progress: number): { position: Vec3; heading: number } {
  if (route.length === 0) return { position: [0, 0, 0], heading: 0 };
  if (route.length === 1) return { position: route[0].position, heading: 0 };
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i].position, b = route[i + 1].position;
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    segs.push(d);
    total += d;
  }
  let dist = Math.min(1, Math.max(0, progress)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const a = route[i].position, b = route[i + 1].position;
      const t = segs[i] === 0 ? 0 : Math.min(1, dist / segs[i]);
      const heading = (Math.atan2(b[0] - a[0], -(b[2] - a[2])) * 180) / Math.PI;
      return {
        position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        heading: (heading + 360) % 360,
      };
    }
    dist -= segs[i];
  }
  return { position: route[route.length - 1].position, heading: 0 };
}

export function routeLength(route: Waypoint[]) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i].position, b = route[i + 1].position;
    total += Math.hypot(b[0] - a[0], b[2] - a[2]);
  }
  return total;
}

export function currentPosition(a: Asset): { position: Vec3; heading: number } {
  if (a.route && a.route.length > 1 && a.routeProgress !== undefined) {
    const p = positionOnRoute(a.route, a.routeProgress);
    return { position: [p.position[0], a.altitude ?? 0, p.position[2]], heading: p.heading };
  }
  return { position: [a.position[0], a.altitude ?? 0, a.position[2]], heading: a.heading };
}

export const ASSET_CLASS_LABEL: Record<Asset['class'], string> = {
  'robot-dog': 'Robotic dog',
  ugv: 'UGV',
  humanoid: 'Humanoid',
  cleaning: 'Cleaning robot',
  service: 'Service robot',
  drone: 'Drone',
};
