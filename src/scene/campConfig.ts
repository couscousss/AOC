import type { Vec3, ZoneId } from '@/lib/types';

/**
 * Camp Raven — a fictional installation. World units are metres, y is up.
 * Ground spans x ∈ [-200, 200], z ∈ [-150, 150]. North is -z.
 * Nothing here is based on a real base layout.
 */

export const GROUND = { w: 400, d: 300 };
export const FENCE = { x: 190, z: 140 };

export type Building = {
  id: string;
  name: string;
  zoneId: ZoneId | null;
  position: Vec3; // centre, y = 0
  size: [number, number, number]; // w, h, d
  color: string;
  shape?: 'box' | 'cylinder' | 'tower';
  emissive?: string;
  rotation?: number;
};

export const BUILDINGS: Building[] = [
  { id: 'hq', name: 'HQ', zoneId: 'hq', position: [0, 0, 0], size: [60, 14, 36], color: '#2a3a46', emissive: '#4fd1c5' },
  { id: 'hq-annex', name: 'HQ annex', zoneId: 'hq', position: [42, 0, 6], size: [18, 8, 20], color: '#27353f' },
  { id: 'guard', name: 'Guard house', zoneId: 'gate', position: [-52, 0, 126], size: [12, 4.5, 8], color: '#33414a', emissive: '#e0a93b' },
  { id: 'gate-canopy', name: 'Gate canopy', zoneId: 'gate', position: [-40, 5, 134], size: [18, 0.6, 10], color: '#3a4852' },
  { id: 'barracks-a', name: 'Barracks A', zoneId: 'barracks', position: [-112, 0, -42], size: [52, 8, 16], color: '#2d3b45' },
  { id: 'barracks-b', name: 'Barracks B', zoneId: 'barracks', position: [-112, 0, -12], size: [52, 8, 16], color: '#2d3b45' },
  { id: 'mess', name: 'Mess hall', zoneId: null, position: [-46, 0, 62], size: [40, 7, 22], color: '#2b3943' },
  { id: 'motor-shelter', name: 'Vehicle shelter', zoneId: 'motorpool', position: [112, 0, 76], size: [54, 6, 20], color: '#2f3d47' },
  { id: 'motor-office', name: 'Motor pool office', zoneId: 'motorpool', position: [82, 0, 46], size: [12, 4, 10], color: '#2b3943' },
  { id: 'armoury', name: 'Armoury', zoneId: 'armoury', position: [-124, 0, 72], size: [24, 6, 18], color: '#3a3d44', emissive: '#e5484d' },
  { id: 'workshop', name: 'Workshop', zoneId: null, position: [142, 0, 10], size: [30, 7, 20], color: '#2c3a44' },
  { id: 'comms', name: 'Comms tower', zoneId: 'hq', position: [62, 0, -78], size: [4, 42, 4], color: '#3c4a54', shape: 'tower', emissive: '#e5484d' },
  { id: 'comms-hut', name: 'Comms hut', zoneId: 'hq', position: [70, 0, -70], size: [10, 3.5, 8], color: '#2b3943' },
  { id: 'dronenest', name: 'Drone nest', zoneId: 'dronenest', position: [40, 0, -112], size: [16, 4, 12], color: '#2a3a46', emissive: '#4fd1c5' },
  { id: 'robotdock', name: 'Robot dock', zoneId: 'robotdock', position: [-30, 0, -102], size: [20, 4, 10], color: '#2a3a46', emissive: '#4fd1c5' },
  { id: 'water', name: 'Water tank', zoneId: null, position: [-160, 0, -104], size: [12, 12, 12], color: '#34424c', shape: 'cylinder' },
  { id: 'generator', name: 'Generator hut', zoneId: null, position: [160, 0, 112], size: [14, 5, 10], color: '#2f3d47', emissive: '#e0a93b' },
  { id: 'fuel', name: 'Fuel store', zoneId: null, position: [160, 0, 96], size: [8, 4, 8], color: '#34424c', shape: 'cylinder' },
];

export const HELIPAD = { position: [120, 0.05, -92] as Vec3, radius: 18 };

export type RoadSegment = { from: [number, number]; to: [number, number]; width: number };

export const ROADS: RoadSegment[] = [
  // perimeter road
  { from: [-176, -126], to: [176, -126], width: 7 },
  { from: [-176, 126], to: [176, 126], width: 7 },
  { from: [-176, -126], to: [-176, 126], width: 7 },
  { from: [176, -126], to: [176, 126], width: 7 },
  // entry road from main gate to HQ
  { from: [-40, 140], to: [-40, 30], width: 8 },
  // internal grid
  { from: [-176, 30], to: [176, 30], width: 6 },
  { from: [-176, -62], to: [176, -62], width: 6 },
  { from: [-70, -126], to: [-70, 126], width: 6 },
  { from: [70, -126], to: [70, 126], width: 6 },
  // east gate spur
  { from: [176, -40], to: [200, -40], width: 6 },
  // north service gate spur
  { from: [60, -126], to: [60, -150], width: 5 },
  // main gate to fence
  { from: [-40, 140], to: [-40, 150], width: 8 },
];

/** External access road beyond the east fence — used in the scripted incident */
export const ACCESS_ROAD: RoadSegment = { from: [200, -40], to: [200, -150], width: 5 };

export type Gate = { id: string; name: string; position: Vec3; heading: number };
export const GATES: Gate[] = [
  { id: 'gate-1', name: 'Main gate (Gate 1)', position: [-40, 0, 140], heading: 0 },
  { id: 'gate-2', name: 'East gate (Gate 2)', position: [190, 0, -40], heading: 90 },
  { id: 'gate-3', name: 'North service gate (Gate 3)', position: [60, 0, -140], heading: 0 },
];

export type StreetLight = { position: Vec3; color: string; intensity: number };
export const LIGHTS: StreetLight[] = [
  { position: [-40, 7, 136], color: '#ffb347', intensity: 60 },
  { position: [-56, 6, 120], color: '#ffb347', intensity: 25 },
  { position: [-40, 6, 90], color: '#ffb347', intensity: 25 },
  { position: [-40, 6, 45], color: '#ffb347', intensity: 25 },
  { position: [190, 6, -40], color: '#ffb347', intensity: 40 },
  { position: [60, 6, -140], color: '#ffb347', intensity: 30 },
  { position: [112, 6, 60], color: '#ffb347', intensity: 25 },
  { position: [0, 8, 26], color: '#c9e5ff', intensity: 20 },
  { position: [-112, 6, -27], color: '#ffb347', intensity: 18 },
];

export type ZoneGeom = { id: ZoneId; center: [number, number]; size: [number, number]; ring?: boolean };
export const ZONE_GEOMS: ZoneGeom[] = [
  { id: 'gate', center: [-40, 126], size: [64, 34] },
  { id: 'perimeter', center: [0, 0], size: [FENCE.x * 2, FENCE.z * 2], ring: true },
  { id: 'hq', center: [8, 0], size: [82, 44] },
  { id: 'motorpool', center: [108, 62], size: [76, 56] },
  { id: 'armoury', center: [-124, 72], size: [44, 34] },
  { id: 'barracks', center: [-112, -27], size: [64, 54] },
  { id: 'helipad', center: [120, -92], size: [46, 46] },
  { id: 'dronenest', center: [40, -112], size: [32, 26] },
  { id: 'robotdock', center: [-30, -102], size: [34, 22] },
];

/** Camera target for zone fly-in */
export const ZONE_CAMERA: Record<ZoneId, { target: Vec3; distance: number }> = {
  gate: { target: [-40, 2, 126], distance: 170 },
  perimeter: { target: [150, 2, -110], distance: 210 },
  hq: { target: [8, 6, 0], distance: 210 },
  motorpool: { target: [108, 2, 62], distance: 190 },
  armoury: { target: [-124, 2, 72], distance: 150 },
  barracks: { target: [-112, 3, -27], distance: 180 },
  helipad: { target: [120, 1, -92], distance: 160 },
  dronenest: { target: [40, 2, -112], distance: 140 },
  robotdock: { target: [-30, 2, -102], distance: 140 },
};

export const INCIDENT_LOCATION: Vec3 = [166, 0, -122];
export const ACCESS_ROAD_VEHICLE: Vec3 = [204, 0, -118];

export const DEFAULT_CAMERA = { position: [0, 220, 260] as Vec3, target: [0, 0, 0] as Vec3 };
