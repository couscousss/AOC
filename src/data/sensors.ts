import type { Sensor } from '@/lib/types';

/**
 * ~40 sensors. Camera headings are degrees clockwise from north (-z).
 * Sensor IDs are what appear in mono type throughout the UI.
 */
export const SENSORS: Sensor[] = [
  // Main gate
  { id: 'CAM-G1-01', type: 'camera', label: 'Gate 1 approach', zoneId: 'gate', position: [-40, 6, 138], heading: 180, fov: 60, range: 70, status: 'nominal', uptimePct: 99.8, scene: 'gate' },
  { id: 'CAM-G1-02', type: 'camera', label: 'Gate 1 inner lane', zoneId: 'gate', position: [-46, 5, 118], heading: 0, fov: 70, range: 50, status: 'nominal', uptimePct: 99.9, scene: 'road' },
  { id: 'ANPR-G1', type: 'anpr', label: 'Gate 1 plate reader', zoneId: 'gate', position: [-34, 2.5, 136], heading: 180, fov: 30, range: 25, status: 'nominal', uptimePct: 99.6 },
  { id: 'DOOR-G1', type: 'door', label: 'Guard house door', zoneId: 'gate', position: [-52, 1, 122], status: 'nominal', uptimePct: 100 },
  { id: 'CAM-G1-03', type: 'camera', label: 'Visitor check-in', zoneId: 'gate', position: [-58, 3.5, 126], heading: 90, fov: 80, range: 15, status: 'nominal', uptimePct: 99.7, scene: 'corridor' },

  // Perimeter — cameras every ~90m, thermal at corners, radar N & E, fence segments
  { id: 'CAM-P-N1', type: 'camera', label: 'North fence west', zoneId: 'perimeter', position: [-120, 7, -136], heading: 90, fov: 55, range: 110, status: 'nominal', uptimePct: 99.4, scene: 'fence' },
  { id: 'CAM-P-N2', type: 'camera', label: 'North fence centre', zoneId: 'perimeter', position: [0, 7, -136], heading: 90, fov: 55, range: 110, status: 'nominal', uptimePct: 99.2, scene: 'fence' },
  { id: 'CAM-P-N3', type: 'camera', label: 'North fence east', zoneId: 'perimeter', position: [110, 7, -136], heading: 90, fov: 55, range: 110, status: 'degraded', uptimePct: 96.1, scene: 'fence' },
  { id: 'PTZ-P-NE', type: 'camera', label: 'NE corner PTZ', zoneId: 'perimeter', position: [180, 9, -132], heading: 225, fov: 40, range: 150, status: 'nominal', uptimePct: 99.9, scene: 'fence' },
  { id: 'THM-P-NE', type: 'thermal', label: 'NE corner thermal', zoneId: 'perimeter', position: [182, 8, -134], heading: 240, fov: 45, range: 160, status: 'nominal', uptimePct: 99.5, scene: 'thermal' },
  { id: 'CAM-P-E1', type: 'camera', label: 'East fence north', zoneId: 'perimeter', position: [186, 7, -80], heading: 180, fov: 55, range: 110, status: 'nominal', uptimePct: 99.6, scene: 'fence' },
  { id: 'CAM-P-E2', type: 'camera', label: 'East fence south', zoneId: 'perimeter', position: [186, 7, 60], heading: 180, fov: 55, range: 110, status: 'nominal', uptimePct: 99.7, scene: 'fence' },
  { id: 'CAM-P-S1', type: 'camera', label: 'South fence east', zoneId: 'perimeter', position: [110, 7, 136], heading: 270, fov: 55, range: 110, status: 'nominal', uptimePct: 99.5, scene: 'fence' },
  { id: 'CAM-P-S2', type: 'camera', label: 'South fence west', zoneId: 'perimeter', position: [-130, 7, 136], heading: 270, fov: 55, range: 110, status: 'nominal', uptimePct: 99.8, scene: 'fence' },
  { id: 'CAM-P-W1', type: 'camera', label: 'West fence', zoneId: 'perimeter', position: [-186, 7, 0], heading: 0, fov: 55, range: 120, status: 'offline', uptimePct: 91.3, scene: 'fence' },
  { id: 'THM-P-SW', type: 'thermal', label: 'SW corner thermal', zoneId: 'perimeter', position: [-182, 8, 134], heading: 315, fov: 45, range: 160, status: 'nominal', uptimePct: 99.1, scene: 'thermal' },
  { id: 'RDR-P-N', type: 'radar', label: 'North ground radar', zoneId: 'perimeter', position: [60, 10, -138], heading: 0, fov: 120, range: 250, status: 'nominal', uptimePct: 99.9 },
  { id: 'RDR-P-E', type: 'radar', label: 'East ground radar', zoneId: 'perimeter', position: [188, 10, -20], heading: 90, fov: 120, range: 250, status: 'nominal', uptimePct: 99.9 },
  { id: 'FNC-N-01', type: 'fence', label: 'Fence section N-01', zoneId: 'perimeter', position: [-140, 1.5, -140], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-N-02', type: 'fence', label: 'Fence section N-02', zoneId: 'perimeter', position: [-40, 1.5, -140], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-N-03', type: 'fence', label: 'Fence section N-03', zoneId: 'perimeter', position: [60, 1.5, -140], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-N-04', type: 'fence', label: 'Fence section N-04', zoneId: 'perimeter', position: [150, 1.5, -140], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-E-01', type: 'fence', label: 'Fence section E-01', zoneId: 'perimeter', position: [190, 1.5, -90], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-E-02', type: 'fence', label: 'Fence section E-02', zoneId: 'perimeter', position: [190, 1.5, 30], status: 'nominal', uptimePct: 100 },
  { id: 'FNC-S-01', type: 'fence', label: 'Fence section S-01', zoneId: 'perimeter', position: [60, 1.5, 140], status: 'degraded', uptimePct: 97.4 },
  { id: 'FNC-W-01', type: 'fence', label: 'Fence section W-01', zoneId: 'perimeter', position: [-190, 1.5, -40], status: 'nominal', uptimePct: 100 },
  { id: 'ACU-P-NE', type: 'acoustic', label: 'NE acoustic array', zoneId: 'perimeter', position: [170, 4, -128], status: 'nominal', uptimePct: 99.3 },
  { id: 'RF-P-01', type: 'rf', label: 'RF spectrum monitor', zoneId: 'perimeter', position: [62, 40, -78], status: 'nominal', uptimePct: 99.9 },
  { id: 'CAM-RD-E', type: 'camera', label: 'East access road', zoneId: 'perimeter', position: [194, 7, -60], heading: 0, fov: 45, range: 120, status: 'nominal', uptimePct: 99.4, scene: 'road' },
  { id: 'ANPR-G2', type: 'anpr', label: 'Gate 2 plate reader', zoneId: 'perimeter', position: [188, 2.5, -44], heading: 90, fov: 30, range: 25, status: 'nominal', uptimePct: 99.5 },

  // HQ
  { id: 'CAM-HQ-01', type: 'camera', label: 'HQ main entrance', zoneId: 'hq', position: [0, 5, 20], heading: 180, fov: 75, range: 40, status: 'nominal', uptimePct: 99.9, scene: 'door' },
  { id: 'CAM-HQ-02', type: 'camera', label: 'HQ north door', zoneId: 'hq', position: [0, 5, -20], heading: 0, fov: 75, range: 40, status: 'nominal', uptimePct: 99.9, scene: 'door' },
  { id: 'CAM-HQ-03', type: 'camera', label: 'HQ corridor B', zoneId: 'hq', position: [-10, 3, 0], heading: 90, fov: 80, range: 25, status: 'nominal', uptimePct: 100, scene: 'corridor' },
  { id: 'CAM-HQ-04', type: 'camera', label: 'HQ roof', zoneId: 'hq', position: [-28, 15, -16], heading: 135, fov: 90, range: 120, status: 'nominal', uptimePct: 99.6, scene: 'rooftop' },
  { id: 'CAM-HQ-05', type: 'camera', label: 'Server room', zoneId: 'hq', position: [20, 3, -8], heading: 270, fov: 80, range: 15, status: 'nominal', uptimePct: 100, scene: 'corridor' },
  { id: 'DOOR-HQ-N', type: 'door', label: 'HQ north door', zoneId: 'hq', position: [0, 1, -18], status: 'nominal', uptimePct: 100 },
  { id: 'DOOR-HQ-S', type: 'door', label: 'HQ main entrance', zoneId: 'hq', position: [0, 1, 18], status: 'nominal', uptimePct: 100 },
  { id: 'DOOR-HQ-SRV', type: 'door', label: 'Server room door', zoneId: 'hq', position: [22, 1, -8], status: 'nominal', uptimePct: 100 },
  { id: 'GAS-HQ-01', type: 'gas', label: 'HQ plant room gas', zoneId: 'hq', position: [46, 1, 6], status: 'nominal', uptimePct: 99.8 },
  { id: 'FLD-HQ-01', type: 'flood', label: 'HQ plant room flood', zoneId: 'hq', position: [46, 0.2, 10], status: 'nominal', uptimePct: 100 },

  // Motor pool
  { id: 'CAM-MP-01', type: 'camera', label: 'Motor pool hardstanding', zoneId: 'motorpool', position: [80, 7, 40], heading: 135, fov: 80, range: 80, status: 'nominal', uptimePct: 99.5, scene: 'carpark' },
  { id: 'CAM-MP-02', type: 'camera', label: 'Vehicle shelter', zoneId: 'motorpool', position: [140, 6, 88], heading: 315, fov: 70, range: 60, status: 'nominal', uptimePct: 99.2, scene: 'carpark' },
  { id: 'ANPR-MP', type: 'anpr', label: 'Motor pool plate reader', zoneId: 'motorpool', position: [74, 2.5, 34], heading: 90, fov: 30, range: 25, status: 'nominal', uptimePct: 99.6 },

  // Armoury
  { id: 'CAM-AR-01', type: 'camera', label: 'Armoury door', zoneId: 'armoury', position: [-124, 4, 84], heading: 0, fov: 70, range: 30, status: 'nominal', uptimePct: 100, scene: 'door' },
  { id: 'CAM-AR-02', type: 'camera', label: 'Armoury interior', zoneId: 'armoury', position: [-118, 3, 70], heading: 270, fov: 90, range: 20, status: 'nominal', uptimePct: 100, scene: 'corridor' },
  { id: 'DOOR-AR', type: 'door', label: 'Armoury door', zoneId: 'armoury', position: [-124, 1, 81], status: 'nominal', uptimePct: 100 },

  // Barracks
  { id: 'CAM-BK-01', type: 'camera', label: 'Barracks A entrance', zoneId: 'barracks', position: [-86, 4, -42], heading: 270, fov: 70, range: 40, status: 'nominal', uptimePct: 99.7, scene: 'door' },
  { id: 'CAM-BK-02', type: 'camera', label: 'Barracks yard', zoneId: 'barracks', position: [-112, 6, -27], heading: 0, fov: 100, range: 50, status: 'nominal', uptimePct: 99.3, scene: 'yard' },
  { id: 'GAS-BK-01', type: 'gas', label: 'Barracks B boiler', zoneId: 'barracks', position: [-136, 1, -12], status: 'nominal', uptimePct: 99.9 },

  // Helipad
  { id: 'CAM-HP-01', type: 'camera', label: 'Helipad', zoneId: 'helipad', position: [98, 7, -92], heading: 90, fov: 80, range: 60, status: 'nominal', uptimePct: 99.4, scene: 'helipad' },

  // Drone nest and robot dock
  { id: 'CAM-DN-01', type: 'camera', label: 'Drone nest', zoneId: 'dronenest', position: [40, 5, -98], heading: 0, fov: 80, range: 40, status: 'nominal', uptimePct: 99.8, scene: 'yard' },
  { id: 'CAM-RD-01', type: 'camera', label: 'Robot dock', zoneId: 'robotdock', position: [-30, 5, -92], heading: 0, fov: 80, range: 30, status: 'nominal', uptimePct: 99.8, scene: 'yard' },
  { id: 'FLD-LG-01', type: 'flood', label: 'Low ground drain', zoneId: 'perimeter', position: [-150, 0.2, 110], status: 'degraded', uptimePct: 94.0 },
];

export const SENSOR_BY_ID = Object.fromEntries(SENSORS.map((s) => [s.id, s])) as Record<string, Sensor>;
export const CAMERAS = SENSORS.filter((s) => s.type === 'camera' || s.type === 'thermal');
