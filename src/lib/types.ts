export type Vec3 = [number, number, number];

export type CapabilityId =
  | 'video'
  | 'scene'
  | 'patrol'
  | 'robotics'
  | 'aerial'
  | 'environmental'
  | 'facilities'
  | 'cyber'
  | 'access';

export type ZoneId =
  | 'gate'
  | 'perimeter'
  | 'hq'
  | 'motorpool'
  | 'armoury'
  | 'barracks'
  | 'helipad'
  | 'dronenest'
  | 'robotdock';

export type Zone = {
  id: ZoneId;
  name: string;
  kind: 'building' | 'area' | 'perimeter';
  position: Vec3;
  footprint: [number, number];
  capabilities: CapabilityId[];
  description: string;
};

export type SensorType =
  | 'camera'
  | 'thermal'
  | 'radar'
  | 'fence'
  | 'acoustic'
  | 'rf'
  | 'gas'
  | 'flood'
  | 'door'
  | 'anpr';

export type SensorStatus = 'nominal' | 'degraded' | 'offline';

export type Sensor = {
  id: string;
  type: SensorType;
  label: string;
  zoneId: ZoneId;
  position: Vec3;
  heading?: number;
  fov?: number;
  range?: number;
  status: SensorStatus;
  uptimePct: number;
  /** For cameras: which procedural scene to render */
  scene?: SceneKind;
};

export type SceneKind =
  | 'fence'
  | 'carpark'
  | 'corridor'
  | 'gate'
  | 'road'
  | 'yard'
  | 'rooftop'
  | 'door'
  | 'helipad'
  | 'thermal';

export type AssetClass = 'robot-dog' | 'ugv' | 'humanoid' | 'cleaning' | 'service' | 'drone';
export type AssetState = 'docked' | 'charging' | 'patrolling' | 'tasked' | 'returning' | 'maintenance' | 'airborne';

export type Waypoint = { position: Vec3; action?: WaypointAction; dwell?: number };
export type WaypointAction = 'patrol' | 'hold' | 'inspect' | 'return' | 'observe';

export type Asset = {
  id: string;
  callsign: string;
  class: AssetClass;
  model: string;
  battery: number;
  state: AssetState;
  position: Vec3;
  heading: number;
  altitude?: number;
  currentTask?: string;
  route?: Waypoint[];
  routeProgress?: number;
  routeLoop?: boolean;
  speed: number;
  home: Vec3;
  payload?: string;
  connectivity: 'good' | 'fair' | 'poor' | 'lost';
  flightHours?: number;
  telemetry: Record<string, number>;
  maintenance: { lastService: string; hours: number; nextDue: string; cycles: number; flagged?: string };
  taskHistory: { ts: number; task: string; result: string }[];
};

export type DetectionClass =
  | 'person'
  | 'vehicle'
  | 'bag left unattended'
  | 'crowd forming'
  | 'loitering'
  | 'person down'
  | 'climbing fence'
  | 'tailgating'
  | 'animal'
  | 'unknown drone';

export type Disposition = 'dismissed' | 'escalated' | 'merged';

export type Detection = {
  id: string;
  ts: number;
  sensorId: string;
  class: DetectionClass;
  confidence: number;
  bbox?: [number, number, number, number];
  thumbnailUrl: string;
  disposition: Disposition;
  dispositionReason: string;
  incidentId?: string;
};

export type AgentId = 'sentry' | 'sift' | 'trace' | 'dispatch' | 'warden' | 'scribe' | 'fitter' | 'overwatch';
export type AgentState = 'watching' | 'investigating' | 'awaiting-approval' | 'acting' | 'degraded';
export type Autonomy = 0 | 1 | 2 | 3;
export const AUTONOMY_LABELS = ['Observe', 'Recommend', 'Act with approval', 'Autonomous'] as const;

export type MemoryEntry = { id: string; subject: string; fact: string; learnedAt: number; confidence: number };

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  state: AgentState;
  autonomy: Autonomy;
  actions24h: number;
  activity: number[];
  memory: MemoryEntry[];
  handoffTo: AgentId[];
  now: string;
  instances?: number;
};

export type AgentAction = {
  id: string;
  ts: number;
  agentId: AgentId;
  title: string;
  observed: string;
  considered: string[];
  concluded: string;
  action: string;
  atHigherAutonomy?: string;
  requiresApproval: boolean;
  approvalState?: 'pending' | 'approved' | 'declined';
  approvedBy?: string;
  declineReason?: string;
  incidentId?: string;
  evidence?: Evidence[];
  ifApproved?: string;
  ifDeclined?: string;
  escalateAt?: number;
  zoneId?: ZoneId;
  onApprove?: string; // store hook key
};

export type Severity = 'low' | 'elevated' | 'high';
export type IncidentState = 'open' | 'contained' | 'closed';

export type TimelineEvent = {
  id: string;
  ts: number;
  actor: AgentId | 'human' | 'system';
  actorName: string;
  text: string;
  actionId?: string;
};

export type Evidence = {
  id: string;
  kind: 'still' | 'thermal' | 'radar' | 'drone' | 'anpr' | 'log' | 'fence';
  label: string;
  ts: number;
  sensorId?: string;
  scene?: SceneKind;
  detail?: string;
};

export type Incident = {
  id: string;
  title: string;
  zoneId: ZoneId;
  severity: Severity;
  state: IncidentState;
  openedAt: number;
  closedAt?: number;
  openedBy: AgentId;
  sensorIds: string[];
  assetIds: string[];
  location: Vec3;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  report?: string;
  summary: string;
  humanDecisions: number;
  detectSeconds: number;
};

export type AlertState = 'new' | 'triaging' | 'awaiting approval' | 'resolved';

export type Alert = {
  id: string;
  ts: number;
  severity: Severity;
  zoneId: ZoneId;
  text: string;
  agentId: AgentId;
  state: AlertState;
  resolution?: string;
  incidentId?: string;
  position?: Vec3;
  actionId?: string;
  arrivedAt?: number;
  mergedInto?: string;
};

export type AuditEntry = {
  id: string;
  ts: number;
  actor: string;
  actorKind: 'agent' | 'human' | 'system';
  action: string;
  target: string;
  record: Record<string, string | number | boolean>;
};

export type FeedLine = { id: string; ts: number; agentId: AgentId; text: string; incidentId?: string };

export type Posture = 'normal' | 'elevated' | 'alarm';

export type PatrolRoute = {
  id: string;
  name: string;
  cameraIds: string[];
  dwellSec: number;
  frequencyMin: number;
  lastCompleted: number;
  nextDue: number;
  agentId: AgentId;
  runsPerNight: number;
  createdBy?: string;
};

export type PatrolLogEntry = {
  id: string;
  routeId: string;
  ts: number;
  cameraId: string;
  observation: string;
  flag: 'nominal' | 'exception';
};

export type Geofence = {
  id: string;
  name: string;
  kind: 'nofly' | 'geofence' | 'corridor';
  polygon: [number, number][];
  minAlt: number;
  maxAlt: number;
};

export type LightingZone = { id: string; name: string; state: 'auto' | 'on' | 'off'; level: number; override?: string };
export type DoorState = { id: string; name: string; zoneId: ZoneId; locked: boolean; lastEvent: string; lastTs: number };

export type CommandResult = {
  kind: 'nav' | 'search' | 'status' | 'report' | 'fallback';
  title: string;
  body?: string;
  items?: { label: string; sub?: string; ts?: number; scene?: SceneKind }[];
  go?: { view?: View; zone?: ZoneId; capability?: CapabilityId; incidentId?: string };
};

export type View = 'map' | 'agents' | 'approvals' | 'incidents' | 'governance' | 'health';
