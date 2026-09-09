import type { Agent, AgentId } from '@/lib/types';
import { MEMORY } from './memory';
import { makeRng } from '@/lib/rng';

const rng = makeRng(1104);
const spark = (base: number, spread: number) => Array.from({ length: 24 }, () => Math.max(0, Math.round(base + rng.float(-spread, spread))));

export const AGENTS: Agent[] = [
  {
    id: 'sentry', name: 'Sentry', role: 'Perception',
    description: 'One instance per sensor class. Turns raw frames, radar returns and fence vibration into detections with a class and a confidence. Never decides anything; it only sees.',
    state: 'watching', autonomy: 3, actions24h: 2917, activity: spark(120, 40),
    memory: MEMORY.sentry, handoffTo: ['sift'], instances: 6,
    now: 'Processing 41 sensor streams. 3 detections in the last minute, all below escalation threshold.',
  },
  {
    id: 'sift', name: 'Sift', role: 'Triage',
    description: 'Deduplicates, correlates across sensors, scores severity and decides what a human should ever see. Most of what Sentry produces stops here.',
    state: 'watching', autonomy: 3, actions24h: 1184, activity: spark(48, 20),
    memory: MEMORY.sift, handoffTo: ['trace', 'warden'],
    now: 'Holding 2 open tracks below threshold. Last dismissal 41s ago: CAM-MP-01 vehicle, matched to motor pool inventory.',
  },
  {
    id: 'trace', name: 'Trace', role: 'Investigation',
    description: 'Pulls history, runs cross-camera re-identification, asks the vision-language model what is actually happening, and builds the incident timeline.',
    state: 'watching', autonomy: 2, actions24h: 63, activity: spark(3, 3),
    memory: MEMORY.trace, handoffTo: ['sift', 'scribe', 'warden'],
    now: 'Idle. Last investigation closed 1h 12m ago (stray dog, south fence, dismissed).',
  },
  {
    id: 'dispatch', name: 'Dispatch', role: 'Tasking',
    description: 'Selects and sends the nearest appropriate asset — a PTZ slew, a robot, a drone — and tracks it until the task is done.',
    state: 'watching', autonomy: 2, actions24h: 212, activity: spark(9, 5),
    memory: MEMORY.dispatch, handoffTo: ['warden', 'fitter'],
    now: 'Tracking 3 assets on task. Kestrel-2 on perimeter loop 4, Ferret-4 on motor pool sweep, Heron-1 on HQ walk-through.',
  },
  {
    id: 'warden', name: 'Warden', role: 'Response',
    description: 'Runs the standard operating procedure for an incident type. Every step is gated by the autonomy level. Proposes; a person approves.',
    state: 'watching', autonomy: 2, actions24h: 14, activity: spark(0.6, 0.8),
    memory: MEMORY.warden, handoffTo: ['dispatch', 'scribe'],
    now: 'No active SOP. Duty officer on shift: Sgt K. Adeyemi. Auto-escalation window: 4 minutes.',
  },
  {
    id: 'scribe', name: 'Scribe', role: 'Reporting',
    description: 'Writes incident reports as events resolve, the shift handover at 0600, and the daily summary. A person signs; Scribe drafts.',
    state: 'watching', autonomy: 3, actions24h: 41, activity: spark(1.7, 1.5),
    memory: MEMORY.scribe, handoffTo: [],
    now: 'Drafting the 0600 shift handover. 11 of 14 sections complete.',
  },
  {
    id: 'fitter', name: 'Fitter', role: 'Maintenance',
    description: 'Watches asset and sensor health, predicts failures from cycle counts and vibration, schedules service and flags degradation before it becomes an outage.',
    state: 'watching', autonomy: 2, actions24h: 96, activity: spark(4, 2),
    memory: MEMORY.fitter, handoffTo: ['dispatch'],
    now: 'Kite-3 held for propeller replacement. Recalibrated CAM-P-N3 exposure 22 minutes ago; still reporting degraded.',
  },
  {
    id: 'overwatch', name: 'Overwatch', role: 'Supervisor',
    description: 'Monitors the other agents, catches conflicts and disagreements, correlates physical and cyber signals, and escalates when the system is uncertain about itself.',
    state: 'watching', autonomy: 2, actions24h: 38, activity: spark(1.6, 1),
    memory: MEMORY.overwatch, handoffTo: ['warden', 'sift'],
    now: 'All agents within expected behaviour bands. One unresolved credential anomaly held for correlation (ID-2261).',
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, Agent>;
export const agentName = (id: AgentId | string) => (AGENT_BY_ID as Record<string, Agent>)[id]?.name ?? id;
