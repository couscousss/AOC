import type { SceneKind } from '@/lib/types';
import { ago, min, hr, sec } from '@/lib/time';

/** Scene understanding — rolling VLM observations for the idle state (pre-scenario). */
export const VLM_IDLE: { cameraId: string; text: string }[] = [
  { cameraId: 'CAM-G1-01', text: 'Gate 1 approach is empty. Barrier down, guard house lit, one figure visible at the window in uniform. Road surface is wet from earlier rain, no vehicles in the last nine minutes.' },
  { cameraId: 'CAM-MP-01', text: 'Motor pool hardstanding, 27 vehicles parked in the expected pattern. Ferret-4 is visible at the east end of its sweep. No people. The shelter floodlight is on its normal night cycle.' },
  { cameraId: 'CAM-BK-02', text: 'Barracks yard is quiet. Bench is empty. One window lit on Barracks B, second floor, consistent with the duty room. Nothing has moved here in twenty minutes.' },
  { cameraId: 'CAM-HQ-01', text: 'HQ main entrance. Heron-1 passed through the door two minutes ago on its walk-through. Lobby lights are on the reduced night setting. No one waiting.' },
  { cameraId: 'CAM-P-N2', text: 'North fence, centre section. Fence line intact along the visible 110 metres. A small animal, probably a fox, crossed left to right near the far post about a minute ago. Nothing else.' },
  { cameraId: 'CAM-RD-E', text: 'East access road, no traffic. The last vehicle was the bakery van at 03:52, inbound to Gate 1 via the ring road. Gate 2 barrier is down.' },
];

/** The scripted VLM descriptions for the incident. */
export const VLM_INCIDENT = {
  first:
    'Two individuals near the northeast fence line, approximately 15m apart. One is carrying a long object, roughly 1.5m, held horizontally. Neither is in uniform. Both have been stationary for over four minutes, which is unusual for this location at this hour.',
  second:
    'Drone view, 40m above the NE corner. The long object is now identifiable as a bolt cutter or similar two-handled cutting tool. The second individual has moved to within 2m of the fence and is crouched at the base of it. The first is standing with their back to the fence, looking along the access road.',
  third:
    'Both subjects have withdrawn from the fence and are moving north along the outside of the perimeter toward the access road. A dark saloon car is parked on the verge, lights off, roughly 60m from the fence. One subject is opening the rear door.',
};

export const VLM_QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Has either of them been seen on camp before?',
    a: 'I have checked both against every exterior camera for the last 30 days and against the gate cameras for 90 days. Neither matches a badge holder, a registered visitor, or a contractor escort record. Cross-camera re-identification is limited by the thermal-only view right now; once the drone is on station with an EO feed I can re-run this against the gate archive with more confidence. My current answer is no, with a caveat on the sensor.',
  },
  {
    q: 'What is the object being carried?',
    a: 'From the thermal view it is a rigid object about 1.5m long, held horizontally with two hands, with a slightly heavier mass at one end. That geometry is consistent with a bolt cutter, a pry bar, or a section of pipe. It is not consistent with a firearm silhouette at this length and grip. I would not commit to a specific identification from thermal alone; the drone EO feed should resolve it.',
  },
  {
    q: 'Compare this to normal activity at this fence section.',
    a: 'Section N-04 has had no human activity of any kind between 22:00 and 06:00 in the last 90 days. Daytime activity is limited to fence inspections on Mondays and a mower every second Thursday. Two people stationary here for four minutes at 04:16 has no precedent in the record. That absence of precedent is the strongest single signal I have.',
  },
];

export type RetroResult = { label: string; sub: string; ts: number; scene: SceneKind; plate?: string };

export const RETRO_QUERIES: { match: RegExp; title: string; summary: string; results: RetroResult[] }[] = [
  {
    match: /gate\s*2.*(after|since)\s*22|vehicle.*gate\s*2|enter.*gate\s*2|did not leave|not leave/i,
    title: 'Vehicles through Gate 2 after 22:00 that have not left',
    summary: '4 vehicles entered Gate 2 after 22:00. 3 have since exited via Gate 1 or Gate 2. 1 has not been seen leaving and was last observed at the workshop loading bay.',
    results: [
      { label: 'SGP-2277 · Delivery van', sub: 'In 22:14, out 22:41 via Gate 2', ts: ago(hr(6) + min(3)), scene: 'road', plate: 'SGP-2277' },
      { label: 'SGP-0193 · Camp vehicle 2-08', sub: 'In 23:05, out 23:52 via Gate 1', ts: ago(hr(5) + min(12)), scene: 'gate', plate: 'SGP-0193' },
      { label: 'SGP-4471 · Halden & Co', sub: 'In 23:48, out 00:31 via Gate 2', ts: ago(hr(4) + min(29)), scene: 'road', plate: 'SGP-4471' },
      { label: 'SGP-7716 · Unknown white van', sub: 'In 00:12, no exit read. Last seen ANPR-MP 00:19, workshop loading bay', ts: ago(hr(4) + min(5)), scene: 'carpark', plate: 'SGP-7716' },
    ],
  },
  {
    match: /person|people|anyone|individual/i,
    title: 'People on exterior cameras in the last two hours',
    summary: '11 individual tracks on exterior cameras since 02:17. 9 re-identified to badge holders. 2 are the current NE fence subjects.',
    results: [
      { label: 'Duty cook · CAM-G1-02', sub: '02:31, mess hall to guard house', ts: ago(hr(1) + min(46)), scene: 'road' },
      { label: 'Cpl D. Ferreira · CAM-G1-01', sub: '02:58, gate check', ts: ago(hr(1) + min(19)), scene: 'gate' },
      { label: 'Bakery driver · CAM-G1-01', sub: '03:52, van door open 6m', ts: ago(min(25)), scene: 'gate' },
      { label: 'Unidentified ×2 · THM-P-NE', sub: '04:12 to now, NE fence', ts: ago(min(5)), scene: 'thermal' },
    ],
  },
  {
    match: /white van|SGP-7716|7716/i,
    title: 'Vehicle SGP-7716',
    summary: 'Unregistered white van, entered Gate 2 at 00:12 on a delivery pass issued by the workshop. Last plate read at the motor pool at 00:19. Not seen leaving.',
    results: [
      { label: 'ANPR-G2 read', sub: '00:12:40, delivery pass W-118', ts: ago(hr(4) + min(5)), scene: 'road', plate: 'SGP-7716' },
      { label: 'ANPR-MP read', sub: '00:19:03, workshop loading bay', ts: ago(hr(3) + min(58)), scene: 'carpark', plate: 'SGP-7716' },
    ],
  },
];

export const RETRO_FALLBACK = {
  title: 'Retrospective search',
  summary: 'I can search the last 30 days across ANPR reads, person tracks and door events. Try a vehicle, a gate, a time window, or a plate. For example: "every vehicle that entered Gate 2 after 2200 and did not leave".',
};

/** Command bar: suggestions and scripted responses. */
export const COMMAND_SUGGESTIONS = [
  'go to motor pool',
  'show me the drone fleet',
  'vehicles through Gate 2 after 2200 yesterday',
  'what is Kestrel-2 doing',
  'any open approvals',
  'summarise the last four hours',
];

export const SUMMARY_LAST_4H = `Since 00:17 the camp has been quiet by its own standards. Sentry produced 38 detections; Sift dismissed 36 of them without a person seeing them, most as known vehicles and rostered personnel. Two were escalated: INC-0341, a fence vibration on S-01 that thermal resolved as a fox within eleven seconds, and INC-0340, an unattended bag at HQ that Trace resolved by re-identifying the owner at a vehicle. Neither needed a human decision.

Three assets are on task: Kestrel-2 on the inner perimeter loop, Ferret-4 sweeping the motor pool, Heron-1 walking HQ floor 2. Mole-3 is 62% through the mess hall floor. Kite-3 remains held for a propeller replacement.

One sensor is offline: CAM-P-W1, media converter fault, ticket FM-1187, with compensating thermal coverage and a robot pass every 20 minutes. Two are degraded: CAM-P-N3 exposure and FLD-LG-01.

Overwatch is holding one unresolved item for correlation: contractor credential ID-2261, refused at the HQ north door at 04:06, with a portal login from off camp eight minutes earlier. No action proposed yet.`;

/** Scribe's report for INC-0342, assembled in stages as the scenario progresses. */
export const SCRIBE_REPORT_STAGES: string[] = [
  `# INC-0342 — Perimeter breach attempt, northeast fence

## Summary
At 04:16:32 ground radar RDR-P-N returned an unclassified slow track at fence section N-04. Sentry logged it. Eight seconds later Sift correlated it with a fence vibration on the same section three seconds earlier and raised an advisory alert.`,
  `

Dispatch slewed PTZ-P-NE and confirmed two figures on thermal. Trace ran a scene description: two individuals, one carrying a long object roughly 1.5 metres, both stationary for over four minutes, neither in uniform. Trace found no matching personnel, no scheduled contractor, and no vehicle at any gate in the preceding two hours. Camp posture was raised to Elevated.`,
  `

## Correlation
Sift merged four separate signals — radar, fence vibration, thermal and video — into a single incident. Warden loaded SOP-PB-03 (perimeter breach) and proposed four actions: launch Osprey-1 for observation, dispatch Kestrel-2 to the inner fence, illuminate sector NE, and notify the duty officer. No contact or interception was proposed; none is available to this system.`,
  `

## Decisions
The duty officer approved Warden's proposal. Osprey-1 launched and was on station in 58 seconds. Kestrel-2 arrived at the inner fence. Sector NE lighting went to full.`,
  `

## Development
On the drone EO feed the long object was identified as a two-handled cutting tool. One subject moved to the base of the fence. Overwatch surfaced a cyber correlation: contractor credential ID-2261 had been refused at the HQ north door eleven minutes before the radar track, from a device not on the network. Both events are now part of this incident.`,
  `

## Outcome
Both subjects withdrew from the fence when the sector lit and moved to a dark saloon on the east access road. The road camera returned plate SGP-6120, not on any camp list. Warden proposed logging the plate to the watch list, notifying the local response unit, and holding the drone on station until they arrived. The duty officer approved.

## Follow-up
Fence section N-04 to be inspected at first light for tool marks. Contractor credential ID-2261 suspended pending a call to Halden & Co. Osprey-1 to return to nest on handover to the local unit.

Detected in 8 seconds. Correlated across 6 sensors. One human decision required to act. Full audit trail written.`,
];

export const SOP_PB_03 = {
  id: 'SOP-PB-03',
  name: 'Perimeter breach',
  steps: [
    'Confirm with a second, independent sensor.',
    'Put eyes on with the nearest camera. Prefer fixed thermal, then PTZ.',
    'Describe the scene and check against roster, schedule and gate records.',
    'Propose: illuminate the sector, dispatch an unmanned observer, notify the duty officer.',
    'Never propose contact, interception, or engagement. Observation only.',
    'Auto-escalate to the duty officer after 4 minutes without a decision.',
  ],
};

export const DECLINE_REASONS = [
  'Known activity, not a threat',
  'Asset not needed for this',
  'Wrong asset selected',
  'Human will handle it directly',
  'Insufficient evidence',
  'Other',
];

/** Idle agent feed lines, cycled deterministically. `{ts}` gets replaced. */
export const FEED_SEEDS: { agentId: 'sentry' | 'sift' | 'trace' | 'dispatch' | 'warden' | 'scribe' | 'fitter' | 'overwatch'; text: string }[] = [
  { agentId: 'sift', text: 'Dismissed CAM-MP-01 vehicle 0.94 — motor pool inventory 2-19.' },
  { agentId: 'trace', text: 'PR-02 HQ interior patrol complete, 8 stops, no exceptions, 3m 41s.' },
  { agentId: 'fitter', text: 'Sensor health sweep: 41 checked, 2 degraded, 1 offline. No change.' },
  { agentId: 'sentry', text: 'CAM-P-N2 animal 0.61, small quadruped, moving east.' },
  { agentId: 'sift', text: 'Dismissed CAM-P-N2 animal — fox, consistent with section pattern.' },
  { agentId: 'dispatch', text: 'Kestrel-2 passed waypoint 2 of 6, battery 71%, connectivity good.' },
  { agentId: 'sentry', text: 'CAM-HQ-03 person 0.92, corridor B, moving south.' },
  { agentId: 'sift', text: 'Dismissed CAM-HQ-03 person — Heron-1 on walk-through, position matches.' },
  { agentId: 'scribe', text: '0600 handover draft: section 12 of 14 complete.' },
  { agentId: 'overwatch', text: 'Agent behaviour bands nominal. Sift dismissal rate 94.2% (24h).' },
  { agentId: 'sentry', text: 'ANPR-G1 no reads in 25 minutes. Barrier down.' },
  { agentId: 'fitter', text: 'Badger-1 charge 96%, pack temperature 28°C. Ready in 6 minutes.' },
  { agentId: 'trace', text: 'PR-03 Motor pool and fuel patrol started. 9 stops scheduled.' },
  { agentId: 'sift', text: 'Dismissed CAM-BK-02 person 0.86 — duty room, roster confirmed.' },
  { agentId: 'dispatch', text: 'Ferret-4 passed waypoint 3 of 5, motor pool sweep 60%.' },
  { agentId: 'fitter', text: 'CAM-P-N3 exposure recheck: still degraded. Retry at 04:45.' },
  { agentId: 'sentry', text: 'RDR-P-E: no tracks. Wind 6 knots, clutter low.' },
  { agentId: 'overwatch', text: 'Holding ID-2261 for correlation. 34 minutes without a second signal.' },
  { agentId: 'sift', text: 'Dismissed CAM-G1-02 person 0.91 — Cpl Ferreira, gate check.' },
  { agentId: 'trace', text: 'PR-03 stop 4/9 CAM-MP-02: shelter doors closed, vehicles as inventoried.' },
  { agentId: 'scribe', text: 'Daily summary for 13 Mar published to the duty officer inbox.' },
  { agentId: 'dispatch', text: 'Heron-1 HQ walk-through: floor 2 complete, moving to floor 1.' },
  { agentId: 'fitter', text: 'Generator 1 fuel 1,480 L, 3.1 L/h. Reserve threshold in 6 days.' },
  { agentId: 'sentry', text: 'FNC-S-01 vibration, 1 pulse, amplitude very low. Below threshold.' },
  { agentId: 'sift', text: 'Held FNC-S-01 single pulse for 30s. No second signal. Dropped.' },
];

export const BEST_VIEWED = 'Best viewed on a desktop display at 1280px or wider.';

export const KPI_BASE = { mttdSec: 8, mttrMs: min(2) + sec(14), autoResolvedPct: 94.2, assetsOnline: 47, assetsTotal: 49 };
