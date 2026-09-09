import { create } from 'zustand';
import type {
  Agent, AgentAction, AgentId, AgentState, Alert, Asset, AuditEntry, Autonomy, CapabilityId, Detection, DoorState,
  FeedLine, Incident, LightingZone, PatrolRoute, Posture, Sensor, TimelineEvent, View, Waypoint, ZoneId, Vec3,
} from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { demoNow, min, hr, sec } from '@/lib/time';
import { ZONES } from '@/data/zones';
import { SENSORS } from '@/data/sensors';
import { ASSETS, routeLength, positionOnRoute } from '@/data/assets';
import { AGENTS, agentName } from '@/data/agents';
import { DETECTIONS } from '@/data/detections';
import { HISTORICAL_INCIDENTS } from '@/data/incidents';
import { AUDIT } from '@/data/audit';
import { LIGHTING_ZONES, DOORS, PATROL_ROUTES } from '@/data/facilities';
import { VLM_IDLE, KPI_BASE } from '@/data/copy';

export type OverlayKey = 'coverage' | 'assets' | 'sensors' | 'geofences' | 'heatmap' | 'zones';

export type ScenarioStatus = 'idle' | 'running' | 'paused' | 'complete';

export type Toast = { id: string; text: string; kind: 'agent' | 'human' | 'advisory' | 'alarm'; ts: number };

export type UnknownDroneTrack = { id: string; points: Vec3[]; classification: string; active: boolean } | null;

export type Mission = { id: string; assetId: string; waypoints: Waypoint[]; dispatchedAt: number; by: string };

export type Kpi = { mttdSec: number; mttrMs: number; autoResolvedPct: number; assetsOnline: number; assetsTotal: number };

export type SummaryCard = { detectSec: number; sensors: number; humanDecisions: number; auditRows: number } | null;

type State = {
  // navigation
  view: View;
  selectedZoneId: ZoneId | null;
  activeCapability: CapabilityId | null;
  selectedIncidentId: string | null;
  agentDrawerId: AgentId | null;
  commandOpen: boolean;
  whyActionId: string | null;
  hoveredZoneId: ZoneId | null;
  overlays: Record<OverlayKey, boolean>;
  hasClickedZone: boolean;
  focusCameraId: string | null;
  focusReport: boolean;
  navOpen: boolean;
  feedOpen: boolean;

  // live data
  agents: Agent[];
  assets: Asset[];
  sensors: Sensor[];
  alerts: Alert[];
  incidents: Incident[];
  actions: AgentAction[];
  audit: AuditEntry[];
  feed: FeedLine[];
  detections: Detection[];
  lighting: LightingZone[];
  doors: DoorState[];
  patrolRoutes: PatrolRoute[];
  missions: Mission[];
  posture: Posture;
  kpi: Kpi;
  toasts: Toast[];
  autoLaunch: boolean;
  unknownDrone: UnknownDroneTrack;
  watchList: { plate: string; reason: string; ts: number }[];

  // VLM
  vlm: { cameraId: string; text: string; key: number; live: boolean };

  // time
  replayAt: number | null;

  // scenario
  scenario: { status: ScenarioStatus; beat: number; startedAt: number; elapsed: number; waitingFor: string | null; mode: 'play' | 'step' };
  summaryCard: SummaryCard;

  // actions
  setView: (v: View) => void;
  selectZone: (id: ZoneId | null) => void;
  openCapability: (id: CapabilityId | null) => void;
  openIncident: (id: string | null) => void;
  openAgent: (id: AgentId | null) => void;
  setCommandOpen: (open: boolean) => void;
  setWhy: (actionId: string | null) => void;
  setHovered: (id: ZoneId | null) => void;
  toggleOverlay: (k: OverlayKey) => void;
  setOverlay: (k: OverlayKey, on: boolean) => void;
  goUp: () => void;
  setFocusCamera: (id: string | null) => void;
  setFocusReport: (on: boolean) => void;
  setNavOpen: (open: boolean) => void;
  setFeedOpen: (open: boolean) => void;

  pushAlert: (a: Omit<Alert, 'arrivedAt'>) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  mergeAlerts: (ids: string[], merged: Omit<Alert, 'arrivedAt'>) => void;
  pushFeed: (agentId: AgentId, text: string, incidentId?: string) => void;
  pushAudit: (e: Omit<AuditEntry, 'id' | 'ts'> & { ts?: number }) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;

  setAgent: (id: AgentId, patch: Partial<Agent>) => void;
  setAgentState: (id: AgentId, state: AgentState, now?: string) => void;
  setAutonomy: (id: AgentId, level: Autonomy, by: string) => void;

  proposeAction: (a: AgentAction) => void;
  recordAction: (a: AgentAction) => void;
  approve: (id: string, by: string) => void;
  decline: (id: string, reason: string, by: string) => void;

  upsertIncident: (inc: Incident) => void;
  appendIncidentEvent: (id: string, e: Omit<TimelineEvent, 'id'>) => void;
  patchIncident: (id: string, patch: Partial<Incident>) => void;

  setPosture: (p: Posture) => void;
  setKpi: (patch: Partial<Kpi>) => void;
  setSensor: (id: string, patch: Partial<Sensor>) => void;

  setAsset: (id: string, patch: Partial<Asset>) => void;
  dispatchAsset: (id: string, route: Waypoint[], task: string, by: string, opts?: { loop?: boolean; altitude?: number; speed?: number }) => void;
  recallAsset: (id: string, by: string) => void;
  tickAssets: (dtSec: number) => void;

  setLighting: (id: string, patch: Partial<LightingZone>, by: string) => void;
  setDoor: (id: string, locked: boolean, by: string) => void;
  addPatrolRoute: (r: PatrolRoute) => void;
  setAutoLaunch: (on: boolean, by: string) => void;
  setUnknownDrone: (t: UnknownDroneTrack) => void;
  addToWatchList: (plate: string, reason: string) => void;

  setVlm: (cameraId: string, text: string, live?: boolean) => void;
  setReplay: (ts: number | null) => void;

  setScenario: (patch: Partial<State['scenario']>) => void;
  setSummaryCard: (c: SummaryCard) => void;
  resetAll: () => void;
};

let seq = 1000;
export const nextId = (prefix: string) => `${prefix}-${(++seq).toString()}`;

function initialAlerts(): Alert[] {
  const now = demoNow();
  const out: Alert[] = [];
  const recent = DETECTIONS.filter((d) => d.ts > now - hr(4));
  for (const d of recent) {
    const sensor = SENSORS.find((s) => s.id === d.sensorId);
    const severity = d.disposition === 'dismissed' ? 'low' : 'elevated';
    out.push({
      id: `AL-${d.id}`,
      ts: d.ts,
      severity,
      zoneId: sensor?.zoneId ?? 'hq',
      text: `${d.class[0].toUpperCase() + d.class.slice(1)} on ${d.sensorId} (${Math.round(d.confidence * 100)}%)`,
      agentId: 'sentry',
      state: 'resolved',
      resolution: d.disposition === 'dismissed' ? `dismissed by Sift — ${d.dispositionReason.replace(/^dismissed — /, '')}` : d.disposition === 'merged' ? `merged by Sift into ${d.incidentId}` : 'escalated by Sift, closed by Trace',
      incidentId: d.incidentId,
      position: sensor?.position,
    });
  }
  for (const inc of HISTORICAL_INCIDENTS) {
    out.push({
      id: `AL-${inc.id}`,
      ts: inc.openedAt,
      severity: inc.severity,
      zoneId: inc.zoneId,
      text: `${inc.id} ${inc.title}`,
      agentId: inc.openedBy,
      state: 'resolved',
      resolution: inc.humanDecisions ? `closed — ${inc.humanDecisions} human decision${inc.humanDecisions > 1 ? 's' : ''}` : 'closed — resolved by agents, no human involvement',
      incidentId: inc.id,
      position: inc.location,
    });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out;
}

function initialFeed(): FeedLine[] {
  const now = demoNow();
  const lines: FeedLine[] = [];
  const seeds = [
    ['sift', 'Dismissed CAM-G1-02 person 0.91 — Cpl Ferreira, gate check.'],
    ['trace', 'PR-02 HQ interior patrol complete, 8 stops, no exceptions, 3m 41s.'],
    ['fitter', 'CAM-P-N3 exposure recheck: still degraded. Retry at 04:45.'],
    ['dispatch', 'Kestrel-2 passed waypoint 1 of 6, battery 72%, connectivity good.'],
    ['sentry', 'CAM-P-N2 animal 0.61, small quadruped, moving east.'],
    ['sift', 'Dismissed CAM-P-N2 animal — fox, consistent with section pattern.'],
    ['overwatch', 'Holding ID-2261 for correlation. 34 minutes without a second signal.'],
    ['scribe', '0600 handover draft: section 11 of 14 complete.'],
  ] as const;
  seeds.forEach(([agentId, text], i) => {
    lines.push({ id: nextId('FD'), ts: now - sec(90) + i * sec(11), agentId, text });
  });
  return lines;
}

function computeKpi(sensors: Sensor[], assets: Asset[]) {
  const online = sensors.filter((s) => s.status !== 'offline').length + assets.filter((a) => a.connectivity !== 'lost').length;
  return { ...KPI_BASE, assetsOnline: online, assetsTotal: sensors.length + assets.length };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function initialData() {
  const sensors = clone(SENSORS);
  const assets = clone(ASSETS);
  return {
    agents: clone(AGENTS),
    assets,
    sensors,
    alerts: initialAlerts(),
    incidents: clone(HISTORICAL_INCIDENTS),
    actions: [] as AgentAction[],
    audit: clone(AUDIT),
    feed: initialFeed(),
    detections: clone(DETECTIONS),
    lighting: clone(LIGHTING_ZONES),
    doors: clone(DOORS),
    patrolRoutes: clone(PATROL_ROUTES),
    missions: [] as Mission[],
    posture: 'normal' as Posture,
    kpi: computeKpi(sensors, assets),
    toasts: [] as Toast[],
    autoLaunch: true,
    unknownDrone: null as UnknownDroneTrack,
    watchList: [] as { plate: string; reason: string; ts: number }[],
    vlm: { cameraId: VLM_IDLE[0].cameraId, text: VLM_IDLE[0].text, key: 0, live: false },
    replayAt: null as number | null,
    scenario: { status: 'idle' as ScenarioStatus, beat: -1, startedAt: 0, elapsed: 0, waitingFor: null as string | null, mode: 'play' as 'play' | 'step' },
    summaryCard: null as SummaryCard,
    focusCameraId: null as string | null,
    focusReport: false,
  };
}

function initialNav() {
  return {
    view: 'map' as View,
    selectedZoneId: null as ZoneId | null,
    activeCapability: null as CapabilityId | null,
    selectedIncidentId: null as string | null,
    agentDrawerId: null as AgentId | null,
    commandOpen: false,
    whyActionId: null as string | null,
    hoveredZoneId: null as ZoneId | null,
    overlays: { coverage: false, assets: true, sensors: false, geofences: false, heatmap: false, zones: true } as Record<OverlayKey, boolean>,
    hasClickedZone: false,
    navOpen: false,
    feedOpen: false,
  };
}

export const useStore = create<State>((set, get) => ({
  ...initialNav(),
  ...initialData(),

  setView: (view) => set({ view, selectedIncidentId: view === 'incidents' ? get().selectedIncidentId : null, agentDrawerId: null, whyActionId: null }),
  selectZone: (id) =>
    set((s) => ({
      view: 'map',
      selectedZoneId: id,
      activeCapability: id ? (s.selectedZoneId === id ? s.activeCapability : ZONES.find((z) => z.id === id)?.capabilities[0] ?? null) : null,
      hasClickedZone: s.hasClickedZone || id !== null,
      overlays: id && !s.hasClickedZone ? { ...s.overlays, zones: false } : s.overlays,
      selectedIncidentId: null,
      focusCameraId: null,
    })),
  openCapability: (id) => set({ activeCapability: id, view: 'map' }),
  openIncident: (id) => set({ selectedIncidentId: id, view: 'incidents', agentDrawerId: null }),
  openAgent: (id) => set({ agentDrawerId: id }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setWhy: (whyActionId) => set({ whyActionId }),
  setHovered: (hoveredZoneId) => set({ hoveredZoneId }),
  toggleOverlay: (k) => set((s) => ({ overlays: { ...s.overlays, [k]: !s.overlays[k] } })),
  setOverlay: (k, on) => set((s) => ({ overlays: { ...s.overlays, [k]: on } })),
  goUp: () => {
    const s = get();
    if (s.commandOpen) return set({ commandOpen: false });
    if (s.whyActionId) return set({ whyActionId: null });
    if (s.agentDrawerId) return set({ agentDrawerId: null });
    if (s.focusCameraId) return set({ focusCameraId: null });
    if (s.view === 'incidents' && s.selectedIncidentId) return set({ selectedIncidentId: null });
    if (s.view !== 'map') return set({ view: 'map' });
    if (s.activeCapability && s.selectedZoneId) return set({ selectedZoneId: null, activeCapability: null });
    if (s.selectedZoneId) return set({ selectedZoneId: null, activeCapability: null });
  },
  setFocusCamera: (focusCameraId) => set({ focusCameraId }),
  setFocusReport: (focusReport) => set({ focusReport }),
  setNavOpen: (navOpen) => set({ navOpen }),
  setFeedOpen: (feedOpen) => set({ feedOpen }),

  pushAlert: (a) => set((s) => ({ alerts: [{ ...a, arrivedAt: Date.now() }, ...s.alerts.filter((x) => x.id !== a.id)] })),
  updateAlert: (id, patch) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  mergeAlerts: (ids, merged) =>
    set((s) => ({
      alerts: [{ ...merged, arrivedAt: Date.now() }, ...s.alerts.filter((a) => !ids.includes(a.id)).map((a) => a)],
    })),
  pushFeed: (agentId, text, incidentId) =>
    set((s) => ({ feed: [...s.feed.slice(-199), { id: nextId('FD'), ts: demoNow(), agentId, text, incidentId }] })),
  pushAudit: (e) =>
    set((s) => ({ audit: [{ ...e, id: nextId('AUD'), ts: e.ts ?? demoNow() }, ...s.audit] })),
  toast: (text, kind = 'agent') => {
    const id = nextId('TS');
    set((s) => ({ toasts: [...s.toasts, { id, text, kind, ts: Date.now() }] }));
    setTimeout(() => get().dismissToast(id), 6000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setAgent: (id, patch) => set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  setAgentState: (id, state, now) => set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, state, now: now ?? a.now } : a)) })),
  setAutonomy: (id, level, by) => {
    const a = get().agents.find((x) => x.id === id);
    if (!a || a.autonomy === level) return;
    set((s) => ({ agents: s.agents.map((x) => (x.id === id ? { ...x, autonomy: level } : x)) }));
    get().pushAudit({
      actor: by, actorKind: 'human', action: 'Changed autonomy level', target: `${a.name}`,
      record: { from: AUTONOMY_LABELS[a.autonomy], to: AUTONOMY_LABELS[level], warning: level === 3 ? 'Autonomous: acts, then notifies' : '' },
    });
    get().pushFeed('overwatch', `${a.name} autonomy changed to ${AUTONOMY_LABELS[level]} by ${by}. Recorded.`);
    if (level === 0) {
      // Observe: withdraw pending proposals from this agent
      const pending = get().actions.filter((x) => x.agentId === id && x.approvalState === 'pending');
      for (const p of pending) {
        set((s) => ({
          actions: s.actions.map((x) => (x.id === p.id ? { ...x, approvalState: 'declined', declineReason: 'Withdrawn — agent set to Observe' } : x)),
          alerts: s.alerts.map((al) => (al.actionId === p.id ? { ...al, state: 'resolved', resolution: 'proposal withdrawn — agent set to Observe' } : al)),
        }));
      }
      if (pending.length) get().pushFeed(id, `Withdrew ${pending.length} pending proposal${pending.length > 1 ? 's' : ''}. At Observe I log and do not propose.`);
    }
  },

  proposeAction: (a) => {
    const agent = get().agents.find((x) => x.id === a.agentId);
    const autonomy = agent?.autonomy ?? 2;
    if (autonomy === 0) {
      // Observe: log only
      get().recordAction({ ...a, requiresApproval: false, approvalState: undefined, action: `Logged only (agent at Observe): ${a.action}` });
      get().pushFeed(a.agentId, `At Observe. Logged, not proposed: ${a.title}.`, a.incidentId);
      return;
    }
    if (autonomy === 3 && a.requiresApproval) {
      // Autonomous: act then notify
      get().recordAction({ ...a, approvalState: 'approved', approvedBy: 'Autonomous (policy)' });
      get().pushFeed(a.agentId, `Autonomous: executed without approval — ${a.title}. Duty officer notified.`, a.incidentId);
      get().toast(`${agentName(a.agentId)} acted autonomously: ${a.title}`, 'advisory');
      get().pushAudit({ actor: agentName(a.agentId), actorKind: 'agent', action: 'Executed autonomously', target: a.title, record: { action: a.action, notified: 'Duty officer' } });
      if (a.incidentId) get().appendIncidentEvent(a.incidentId, { ts: demoNow(), actor: a.agentId, actorName: agentName(a.agentId), text: `Executed autonomously: ${a.action}`, actionId: a.id });
      return;
    }
    const action: AgentAction = { ...a, approvalState: a.requiresApproval ? 'pending' : undefined, escalateAt: a.escalateAt ?? demoNow() + min(4) };
    set((s) => ({ actions: [action, ...s.actions.filter((x) => x.id !== a.id)] }));
    if (a.requiresApproval) {
      get().setAgentState(a.agentId, 'awaiting-approval', `Awaiting approval: ${a.title}`);
      get().pushAlert({
        id: `AL-${a.id}`, ts: action.ts, severity: 'elevated', zoneId: a.zoneId ?? 'hq',
        text: `Proposal: ${a.title}`, agentId: a.agentId, state: 'awaiting approval', incidentId: a.incidentId, actionId: a.id,
      });
      get().pushFeed(a.agentId, `Proposed: ${a.title}. Awaiting approval.`, a.incidentId);
      if (a.incidentId) get().appendIncidentEvent(a.incidentId, { ts: action.ts, actor: a.agentId, actorName: agentName(a.agentId), text: `Proposed: ${a.action}`, actionId: a.id });
    } else {
      get().pushFeed(a.agentId, `${a.title}.`, a.incidentId);
    }
    get().pushAudit({ actor: agentName(a.agentId), actorKind: 'agent', action: a.requiresApproval ? 'Proposed action' : 'Agent action', target: a.title, record: { observed: a.observed, concluded: a.concluded, action: a.action } });
  },
  recordAction: (a) => {
    set((s) => ({ actions: [a, ...s.actions.filter((x) => x.id !== a.id)] }));
    get().pushAudit({ actor: agentName(a.agentId), actorKind: 'agent', action: 'Agent decision', target: a.title, record: { observed: a.observed, concluded: a.concluded, action: a.action }, ts: a.ts });
  },
  approve: (id, by) => {
    const a = get().actions.find((x) => x.id === id);
    if (!a || a.approvalState !== 'pending') return;
    const ts = demoNow();
    set((s) => ({
      actions: s.actions.map((x) => (x.id === id ? { ...x, approvalState: 'approved', approvedBy: by } : x)),
      alerts: s.alerts.map((al) => (al.actionId === id ? { ...al, state: 'resolved', resolution: `approved by ${by}` } : al)),
    }));
    get().pushAudit({ actor: by, actorKind: 'human', action: 'Approved proposal', target: a.title, record: { agent: agentName(a.agentId), action: a.action, incident: a.incidentId ?? '' }, ts });
    get().pushFeed(a.agentId, `Approved by ${by}. Executing: ${a.title}.`, a.incidentId);
    if (a.incidentId) get().appendIncidentEvent(a.incidentId, { ts, actor: 'human', actorName: by, text: `Approved: ${a.title}`, actionId: id });
    const stillPending = get().actions.some((x) => x.agentId === a.agentId && x.approvalState === 'pending');
    if (!stillPending) get().setAgentState(a.agentId, 'acting', `Executing: ${a.title}`);
  },
  decline: (id, reason, by) => {
    const a = get().actions.find((x) => x.id === id);
    if (!a || a.approvalState !== 'pending') return;
    const ts = demoNow();
    set((s) => ({
      actions: s.actions.map((x) => (x.id === id ? { ...x, approvalState: 'declined', declineReason: reason, approvedBy: by } : x)),
      alerts: s.alerts.map((al) => (al.actionId === id ? { ...al, state: 'resolved', resolution: `declined by ${by} — ${reason.toLowerCase()}` } : al)),
    }));
    get().pushAudit({ actor: by, actorKind: 'human', action: 'Declined proposal', target: a.title, record: { agent: agentName(a.agentId), reason, incident: a.incidentId ?? '' }, ts });
    get().pushFeed(a.agentId, `Declined by ${by}: "${reason}". Recorded as a preference for future proposals of this type.`, a.incidentId);
    if (a.incidentId) get().appendIncidentEvent(a.incidentId, { ts, actor: 'human', actorName: by, text: `Declined: ${a.title} — ${reason}`, actionId: id });
    const stillPending = get().actions.some((x) => x.agentId === a.agentId && x.approvalState === 'pending');
    if (!stillPending) get().setAgentState(a.agentId, 'watching', 'Proposal declined. Continuing to observe.');
  },

  upsertIncident: (inc) => set((s) => ({ incidents: [inc, ...s.incidents.filter((i) => i.id !== inc.id)] })),
  appendIncidentEvent: (id, e) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, timeline: [...i.timeline, { ...e, id: nextId('TE') }] } : i)),
    })),
  patchIncident: (id, patch) => set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

  setPosture: (posture) => set({ posture }),
  setKpi: (patch) => set((s) => ({ kpi: { ...s.kpi, ...patch } })),
  setSensor: (id, patch) => set((s) => ({ sensors: s.sensors.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

  setAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  dispatchAsset: (id, route, task, by, opts) => {
    const a = get().assets.find((x) => x.id === id);
    if (!a) return;
    const start = a.route && a.routeProgress !== undefined ? positionOnRoute(a.route, a.routeProgress).position : a.position;
    const full: Waypoint[] = [{ position: [start[0], 0, start[2]] }, ...route];
    const isDrone = a.class === 'drone';
    set((s) => ({
      assets: s.assets.map((x) =>
        x.id === id
          ? {
              ...x, route: full, routeProgress: 0, routeLoop: opts?.loop ?? false, currentTask: task,
              state: isDrone ? 'airborne' : 'tasked', altitude: isDrone ? opts?.altitude ?? 40 : undefined,
              speed: opts?.speed ?? x.speed,
              taskHistory: [{ ts: demoNow(), task, result: 'Dispatched' }, ...x.taskHistory],
            }
          : x,
      ),
      missions: [{ id: nextId('MSN'), assetId: id, waypoints: full, dispatchedAt: demoNow(), by }, ...s.missions],
    }));
    get().pushAudit({ actor: by, actorKind: by === 'Dispatch' ? 'agent' : 'human', action: 'Dispatched asset', target: a.callsign, record: { task, waypoints: route.length, distanceM: Math.round(routeLength(full)) } });
    get().pushFeed('dispatch', `${a.callsign} dispatched: ${task}. ${Math.round(routeLength(full))}m, ETA ${Math.round(routeLength(full) / (opts?.speed ?? a.speed))}s.`);
  },
  recallAsset: (id, by) => {
    const a = get().assets.find((x) => x.id === id);
    if (!a) return;
    get().dispatchAsset(id, [{ position: a.home, action: 'return' }], 'Return to dock', by, { speed: a.speed });
    set((s) => ({ assets: s.assets.map((x) => (x.id === id ? { ...x, state: 'returning' } : x)) }));
  },
  tickAssets: (dt) =>
    set((s) => {
      let changed = false;
      const assets = s.assets.map((a) => {
        if (!a.route || a.route.length < 2 || a.routeProgress === undefined) return a;
        if (a.state === 'docked' || a.state === 'charging' || a.state === 'maintenance') return a;
        const len = routeLength(a.route);
        if (len === 0) return a;
        let p = a.routeProgress + (a.speed * dt) / len;
        changed = true;
        if (p >= 1) {
          if (a.routeLoop) p = p - 1;
          else {
            const end = a.route[a.route.length - 1];
            const isReturn = end.action === 'return';
            const isDrone = a.class === 'drone';
            return {
              ...a, route: undefined, routeProgress: undefined, position: [end.position[0], 0, end.position[2]] as Vec3,
              state: isReturn ? (isDrone ? 'docked' : 'charging') : isDrone ? 'airborne' : 'tasked',
              altitude: isReturn ? 0 : a.altitude,
              currentTask: isReturn ? (isDrone ? 'Docked in nest' : 'Charging at dock') : (a.currentTask ?? '').replace(/^Dispatched: /, '') + ' — on station',
              telemetry: { ...a.telemetry, speed: 0 },
            } as Asset;
          }
        }
        const heading = positionOnRoute(a.route, p).heading;
        return { ...a, routeProgress: p, heading, telemetry: { ...a.telemetry, speed: a.speed, heading: Math.round(heading) } };
      });
      return changed ? { assets } : {};
    }),

  setLighting: (id, patch, by) => {
    set((s) => ({ lighting: s.lighting.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    const l = get().lighting.find((x) => x.id === id);
    get().pushAudit({ actor: by, actorKind: by === 'Warden' || by === 'Dispatch' ? 'agent' : 'human', action: 'Lighting override', target: l?.name ?? id, record: { state: patch.state ?? '', level: patch.level ?? '' } });
  },
  setDoor: (id, locked, by) => {
    set((s) => ({ doors: s.doors.map((d) => (d.id === id ? { ...d, locked, lastEvent: `${locked ? 'Locked' : 'Unlocked'} by ${by}`, lastTs: demoNow() } : d)) }));
    get().pushAudit({ actor: by, actorKind: by === 'Warden' ? 'agent' : 'human', action: locked ? 'Locked door' : 'Unlocked door', target: id, record: {} });
  },
  addPatrolRoute: (r) => {
    set((s) => ({ patrolRoutes: [...s.patrolRoutes, r] }));
    get().pushAudit({ actor: r.createdBy ?? 'Sgt K. Adeyemi', actorKind: 'human', action: 'Created patrol route', target: r.name, record: { cameras: r.cameraIds.join(' → '), dwellSec: r.dwellSec, frequencyMin: r.frequencyMin } });
    get().pushFeed('trace', `New route "${r.name}" accepted: ${r.cameraIds.length} cameras every ${r.frequencyMin} minutes. First run scheduled.`);
  },
  setAutoLaunch: (on, by) => {
    set({ autoLaunch: on });
    get().pushAudit({ actor: by, actorKind: 'human', action: 'Changed policy', target: 'Auto-launch on perimeter alarm', record: { enabled: on } });
  },
  setUnknownDrone: (unknownDrone) => set({ unknownDrone }),
  addToWatchList: (plate, reason) => set((s) => ({ watchList: [{ plate, reason, ts: demoNow() }, ...s.watchList] })),

  setVlm: (cameraId, text, live = false) => set((s) => ({ vlm: { cameraId, text, key: s.vlm.key + 1, live } })),
  setReplay: (replayAt) => set({ replayAt }),

  setScenario: (patch) => set((s) => ({ scenario: { ...s.scenario, ...patch } })),
  setSummaryCard: (summaryCard) => set({ summaryCard }),
  resetAll: () => {
    const nav = get();
    set({ ...initialData(), view: 'map', selectedZoneId: null, activeCapability: null, selectedIncidentId: null, agentDrawerId: null, whyActionId: null, commandOpen: false, focusCameraId: null, focusReport: false, overlays: nav.overlays, hasClickedZone: nav.hasClickedZone });
  },
}));

// Selectors
export const selectPendingApprovals = (s: State) => s.actions.filter((a) => a.approvalState === 'pending');
export const selectZone = (s: State) => (s.selectedZoneId ? ZONES.find((z) => z.id === s.selectedZoneId) ?? null : null);
export const selectLiveIncident = (s: State) => s.incidents.find((i) => i.state !== 'closed') ?? null;
export type { State as StoreState };
