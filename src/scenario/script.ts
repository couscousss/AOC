import { useStore, type StoreState } from '@/store/useStore';
import { demoNow, sec, min } from '@/lib/time';
import { INCIDENT_LOCATION, ACCESS_ROAD_VEHICLE } from '@/scene/campConfig';
import { VLM_INCIDENT, SCRIBE_REPORT_STAGES, SOP_PB_03 } from '@/data/copy';
import { LIVE_INCIDENT_ID } from '@/data/incidents';
import type { Evidence, Incident } from '@/lib/types';

/**
 * The scripted incident: a timeline of timestamped beats dispatched to the store.
 * Re-time by editing `t`. Components never know about beats; they only read state.
 */
export type Beat = {
  t: number; // seconds from scenario start
  label: string;
  note: string; // presenter talking point
  apply: (s: StoreState) => void;
  /** If set, playback holds after this beat until the predicate is true. */
  waitFor?: { key: string; done: (s: StoreState) => boolean; label: string };
};

export const INC = LIVE_INCIDENT_ID;
export const ACTION_1 = 'ACT-WARDEN-PB03-1';
export const ACTION_2 = 'ACT-WARDEN-PB03-2';
const AL = { radar: 'AL-S1-RADAR', fence: 'AL-S2-FENCE', thermal: 'AL-S3-THERMAL', video: 'AL-S4-VIDEO', cyber: 'AL-S5-CYBER', inc: `AL-${INC}` };
const DUTY = 'Sgt K. Adeyemi';

const ev = (kind: Evidence['kind'], label: string, sensorId?: string, detail?: string, scene?: Evidence['scene']): Evidence => ({
  id: `EV-${INC}-${label.replace(/\W+/g, '-').toLowerCase()}`, kind, label, ts: demoNow(), sensorId, detail, scene,
});

const report = (n: number) => SCRIBE_REPORT_STAGES.slice(0, n).join('');

export const BEATS: Beat[] = [
  {
    t: 0,
    label: 'Quiet camp',
    note: 'Say nothing for three seconds. Let the scale register. Posture Normal, agents doing routine work.',
    apply: (s) => {
      s.selectZone(null);
      s.setView('map');
      s.setPosture('normal');
      s.setFocusCamera(null);
      s.pushFeed('overwatch', 'Shift status: 41 sensors, 9 assets, posture Normal. Dismissal rate 94.2% over 24h.');
    },
  },
  {
    t: 12,
    label: 'Radar track',
    note: 'Ground radar returns an unclassified track at the NE fence. Sentry logs it. Nothing is alarmed yet.',
    apply: (s) => {
      const ts = demoNow();
      s.recordAction({
        id: 'ACT-SENTRY-1', ts, agentId: 'sentry', title: 'Logged unclassified radar track, section N-04',
        observed: 'RDR-P-N: slow-moving return, 0.4 m/s, bearing 058, range 118m, radar cross-section consistent with one or two people. Wind 6 knots, so this is not the known wind-clutter pattern.',
        considered: ['Animal (fox pattern is faster and on the south fence)', 'Wind clutter (excluded: wind below 20 knots)', 'Person or people'],
        concluded: 'Unclassified track worth a second sensor. Below the alert threshold on its own.',
        action: 'Logged the track and handed it to Sift for correlation.', requiresApproval: false, zoneId: 'perimeter',
      });
      s.pushAlert({ id: AL.radar, ts, severity: 'low', zoneId: 'perimeter', text: 'Unclassified radar track, fence section N-04', agentId: 'sentry', state: 'new', position: INCIDENT_LOCATION, actionId: 'ACT-SENTRY-1' });
      s.pushFeed('sentry', 'RDR-P-N: unclassified slow track, bearing 058, 118m, section N-04. Logged.');
      s.setAgentState('sift', 'investigating', 'Correlating radar track at N-04 against fence, thermal and schedule.');
    },
  },
  {
    t: 20,
    label: 'Sift correlates',
    note: 'The fence vibration sensor fired three seconds earlier in the same section. Confidence rises. The marker goes amber and the rail gets a row.',
    apply: (s) => {
      const ts = demoNow();
      s.recordAction({
        id: 'ACT-SIFT-1', ts, agentId: 'sift', title: 'Correlated radar track with fence vibration, N-04',
        observed: 'FNC-N-04 vibration, 2 pulses, amplitude medium, 3 seconds before the radar track began. Same 40m section.',
        considered: ['Coincidence (two independent low-confidence signals in the same section within 3s: prior probability under 2%)', 'Fox at N-04 (no fox history on the north fence in 90 days)', 'Person at the fence'],
        concluded: 'Two independent sensors agree on a location with no benign history at this hour. Raising to advisory and asking for eyes on.',
        action: 'Raised the track to advisory. Requested Dispatch put a camera on N-04.', requiresApproval: false, zoneId: 'perimeter',
        atHigherAutonomy: 'Same. Sift does not dispatch assets at any level.',
      });
      s.updateAlert(AL.radar, { severity: 'elevated', state: 'triaging' });
      s.pushAlert({ id: AL.fence, ts, severity: 'elevated', zoneId: 'perimeter', text: 'Fence vibration FNC-N-04, correlated with radar track', agentId: 'sift', state: 'triaging', actionId: 'ACT-SIFT-1' });
      s.pushFeed('sift', 'FNC-N-04 fired 3s before the radar track. Two sensors, one section, no benign history. Advisory.');
      s.setAgentState('dispatch', 'acting', 'Slewing PTZ-P-NE to section N-04.');
    },
  },
  {
    t: 34,
    label: 'Eyes on',
    note: 'Dispatch slews the nearest PTZ. Thermal shows two figures. The tile opens on the stage by itself.',
    apply: (s) => {
      const ts = demoNow();
      s.recordAction({
        id: 'ACT-DISPATCH-1', ts, agentId: 'dispatch', title: 'Slewed PTZ-P-NE to N-04; thermal confirms two figures',
        observed: 'THM-P-NE already covers N-04. Two human-shaped heat signatures, 15m apart, both stationary. PTZ-P-NE slewed to the same bearing in 2.1s.',
        considered: ['Fixed thermal first (no slew time), PTZ second', 'Kestrel-2 is 3m 40s away on the perimeter loop; not sent yet'],
        concluded: 'Two people at the fence, confirmed on a third sensor.',
        action: 'Opened THM-P-NE and PTZ-P-NE on the operator stage. Handed the scene to Trace.', requiresApproval: false, zoneId: 'perimeter',
      });
      s.pushAlert({ id: AL.thermal, ts, severity: 'elevated', zoneId: 'perimeter', text: 'THM-P-NE: two heat signatures at fence N-04', agentId: 'dispatch', state: 'triaging', actionId: 'ACT-DISPATCH-1' });
      s.pushFeed('dispatch', 'PTZ-P-NE on N-04. THM-P-NE: two human signatures, stationary. Opening on stage.');
      s.setFocusCamera('THM-P-NE');
      s.setAgentState('dispatch', 'watching', 'PTZ-P-NE holding on N-04.');
      s.setAgentState('trace', 'investigating', 'Describing the scene at N-04 and checking history.');
    },
  },
  {
    t: 48,
    label: 'Scene description',
    note: 'Trace asks the vision-language model what it sees. The text streams in. This is the part a video wall cannot do.',
    apply: (s) => {
      const ts = demoNow();
      s.setVlm('PTZ-P-NE', VLM_INCIDENT.first, true);
      s.recordAction({
        id: 'ACT-TRACE-1', ts, agentId: 'trace', title: 'Scene description, N-04',
        observed: VLM_INCIDENT.first,
        considered: ['Maintenance crew (none scheduled, no vehicle, no uniform)', 'Lost walkers (no path outside the fence here; 04:16)', 'Reconnaissance or breach preparation'],
        concluded: 'The scene is anomalous on four counts: location, hour, duration and the object.',
        action: 'Published the description and started a roster, schedule and gate cross-reference.', requiresApproval: false, zoneId: 'perimeter',
      });
      s.pushAlert({ id: AL.video, ts, severity: 'elevated', zoneId: 'perimeter', text: 'PTZ-P-NE: two persons, one long object, stationary 4 min', agentId: 'trace', state: 'triaging', actionId: 'ACT-TRACE-1' });
      s.pushFeed('trace', 'VLM: two individuals, one carrying a long object ~1.5m, neither in uniform, stationary over four minutes.');
    },
  },
  {
    t: 65,
    label: 'Cross-reference',
    note: 'No matching personnel, no contractor, no vehicle at any gate in two hours. Posture goes Elevated. The page border changes.',
    apply: (s) => {
      const ts = demoNow();
      s.recordAction({
        id: 'ACT-TRACE-2', ts, agentId: 'trace', title: 'Cross-reference: no roster, schedule or gate match',
        observed: 'Roster: 288 on camp, all accounted for at the 22:00 muster, none tasked outside the fence. Contractors: none scheduled tonight. Gates: no vehicle in or out at any gate since the bakery van at 03:52.',
        considered: ['Personnel exercise (none authorised)', 'Contractor early arrival (first is 09:00)', 'Unknown persons who arrived on foot or by a vehicle outside camera coverage'],
        concluded: 'No legitimate explanation is available from any camp record. Recommending Elevated.',
        action: 'Raised posture to Elevated. Handed the correlated signals to Sift for incident creation.', requiresApproval: false, zoneId: 'perimeter',
      });
      s.pushFeed('trace', 'Roster: no match. Contractors: none tonight. Gates: no vehicle in 2h. Recommending Elevated.');
      s.setPosture('elevated');
      s.pushAudit({ actor: 'Trace', actorKind: 'agent', action: 'Raised posture', target: 'Camp Raven', record: { from: 'Normal', to: 'Elevated', reason: 'Unexplained persons at N-04' } });
    },
  },
  {
    t: 80,
    label: 'Four alerts become one',
    note: 'Stop talking here. Sift merges radar, fence, thermal and video into INC-0342. The four rows collapse into one. That collapse is the product.',
    apply: (s) => {
      const ts = demoNow();
      const inc: Incident = {
        id: INC, title: 'Perimeter breach attempt, northeast fence', zoneId: 'perimeter', severity: 'elevated', state: 'open', openedAt: ts, openedBy: 'sift',
        sensorIds: ['RDR-P-N', 'FNC-N-04', 'THM-P-NE', 'PTZ-P-NE'], assetIds: [], location: INCIDENT_LOCATION,
        summary: 'Two unidentified persons at fence section N-04, one carrying a long object, correlated across radar, fence vibration, thermal and video.',
        humanDecisions: 0, detectSeconds: 8,
        timeline: [
          { id: 'TE-L1', ts: ts - sec(68), actor: 'sentry', actorName: 'Sentry', text: 'RDR-P-N: unclassified slow track, section N-04.', actionId: 'ACT-SENTRY-1' },
          { id: 'TE-L2', ts: ts - sec(60), actor: 'sift', actorName: 'Sift', text: 'Correlated with FNC-N-04 vibration 3s earlier. Raised to advisory.', actionId: 'ACT-SIFT-1' },
          { id: 'TE-L3', ts: ts - sec(46), actor: 'dispatch', actorName: 'Dispatch', text: 'PTZ-P-NE slewed. THM-P-NE confirms two heat signatures.', actionId: 'ACT-DISPATCH-1' },
          { id: 'TE-L4', ts: ts - sec(32), actor: 'trace', actorName: 'Trace', text: 'Scene description: two individuals, one long object, stationary four minutes, not in uniform.', actionId: 'ACT-TRACE-1' },
          { id: 'TE-L5', ts: ts - sec(15), actor: 'trace', actorName: 'Trace', text: 'No roster, contractor or gate match. Posture Elevated.', actionId: 'ACT-TRACE-2' },
          { id: 'TE-L6', ts, actor: 'sift', actorName: 'Sift', text: 'Merged four signals into one incident. INC-0342 opened.', actionId: 'ACT-SIFT-2' },
        ],
        evidence: [
          ev('radar', 'RDR-P-N track plot', 'RDR-P-N', 'Slow track, bearing 058'),
          ev('fence', 'FNC-N-04 vibration trace', 'FNC-N-04', '2 pulses, medium amplitude'),
          ev('thermal', 'THM-P-NE frame', 'THM-P-NE', 'Two signatures, 15m apart', 'thermal'),
          ev('still', 'PTZ-P-NE still', 'PTZ-P-NE', 'Long object visible', 'fence'),
        ],
        report: report(2),
      };
      s.recordAction({
        id: 'ACT-SIFT-2', ts, agentId: 'sift', title: 'Merged four signals into INC-0342',
        observed: 'Radar, fence vibration, thermal and video all describe the same 40m of fence within 70 seconds. Trace finds no benign explanation.',
        considered: ['Keep four separate alerts (the operator would triage the same event four times)', 'One incident with four sensors attached'],
        concluded: 'One event, one incident. Severity elevated, not high: no one has touched the fence yet.',
        action: 'Opened INC-0342 and merged the four alerts into it. Handed to Warden for the SOP.', requiresApproval: false, zoneId: 'perimeter', incidentId: INC,
      });
      s.upsertIncident(inc);
      s.mergeAlerts([AL.radar, AL.fence, AL.thermal, AL.video], {
        id: AL.inc, ts, severity: 'elevated', zoneId: 'perimeter', text: `${INC} Perimeter breach attempt, NE fence — 4 signals merged`, agentId: 'sift', state: 'triaging', incidentId: INC, position: INCIDENT_LOCATION, actionId: 'ACT-SIFT-2',
      });
      s.pushFeed('sift', 'Merged radar, fence, thermal and video into INC-0342. One incident, four sensors.', INC);
      s.setAgentState('sift', 'watching', 'INC-0342 open. Continuing to triage other traffic.');
      s.setAgentState('warden', 'investigating', 'Loading SOP-PB-03 for INC-0342.');
      s.setAgentState('scribe', 'acting', 'Drafting INC-0342 report as events resolve.');
      s.pushAudit({ actor: 'Scribe', actorKind: 'agent', action: 'Started incident report', target: INC, record: {} });
    },
  },
  {
    t: 95,
    label: 'Warden proposes',
    note: 'Warden loads the perimeter breach SOP and proposes four actions. Nothing happens until a person approves. Point at the badge on Approvals.',
    apply: (s) => {
      const ts = demoNow();
      s.proposeAction({
        id: ACTION_1, ts, agentId: 'warden', title: 'Observe and illuminate N-04: launch Osprey-1, send Kestrel-2, light sector NE, notify duty officer',
        observed: `INC-0342: two unidentified persons at N-04 with a long object, four sensors agree, no benign explanation. ${SOP_PB_03.id} applies.`,
        considered: SOP_PB_03.steps,
        concluded: 'The SOP calls for observation, illumination and notification. No contact is proposed; none is available to this system.',
        action: 'Launch Osprey-1 to N-04 at 40m for observation. Dispatch Kestrel-2 to the inner fence at N-04. Set lighting sector NE to full. Notify the duty officer.',
        atHigherAutonomy: 'At Autonomous, Warden would have launched Osprey-1 and lit the sector 8 seconds ago and notified you afterwards. Kestrel-2 would still have waited: the policy requires a named approver for ground assets.',
        requiresApproval: true, incidentId: INC, zoneId: 'perimeter',
        evidence: [ev('thermal', 'THM-P-NE frame', 'THM-P-NE', 'Two signatures', 'thermal'), ev('radar', 'RDR-P-N track', 'RDR-P-N'), ev('fence', 'FNC-N-04 vibration', 'FNC-N-04')],
        ifApproved: 'Osprey-1 on station in 58s with an EO/IR view. Kestrel-2 at the inner fence in 3m 40s. Sector lit in 1.5s, which alone usually ends this. Duty officer paged.',
        ifDeclined: 'Warden keeps PTZ-P-NE and THM-P-NE on the subjects, escalates to the duty officer by phone after 4 minutes, and records your reason for next time.',
        escalateAt: ts + min(4),
      });
      s.toast('Warden proposes: observe and illuminate N-04. Approval required.', 'advisory');
    },
    waitFor: { key: ACTION_1, done: (s) => s.actions.some((a) => a.id === ACTION_1 && a.approvalState !== 'pending'), label: 'Waiting for the duty officer to approve or decline' },
  },
  {
    t: 105,
    label: 'Decision',
    note: 'The presenter clicks Approve. That is the only touch in the whole scenario.',
    apply: (s) => {
      const a = s.actions.find((x) => x.id === ACTION_1);
      if (a?.approvalState === 'approved') {
        s.patchIncident(INC, { humanDecisions: 1, report: report(4) });
      } else if (a?.approvalState === 'declined') {
        s.pushFeed('warden', 'Proposal declined. Holding PTZ-P-NE and THM-P-NE on the subjects. Will escalate by phone in 4 minutes.', INC);
        s.patchIncident(INC, { humanDecisions: 1 });
      }
    },
  },
  {
    t: 110,
    label: 'Assets move',
    note: 'Drone launches from the nest and climbs. Robot dog moves. Sector NE lighting goes to full in the facilities panel.',
    apply: (s) => {
      const a = s.actions.find((x) => x.id === ACTION_1);
      if (a?.approvalState !== 'approved') return;
      s.dispatchAsset('A-OSP1', [{ position: [40, 0, -140], action: 'patrol' }, { position: [INCIDENT_LOCATION[0] - 12, 0, INCIDENT_LOCATION[2] + 10], action: 'observe' }], 'INC-0342: observe N-04 from 40m', 'Dispatch', { altitude: 40, speed: 9 });
      s.dispatchAsset('A-KES2', [{ position: [176, 0, -126], action: 'patrol' }, { position: [170, 0, -130], action: 'hold' }], 'INC-0342: hold at inner fence N-04', 'Dispatch', { speed: 2.4 });
      s.setLighting('LZ-NE', { state: 'on', level: 100, override: 'Warden — INC-0342 (approved by Sgt K. Adeyemi)' }, 'Warden');
      s.patchIncident(INC, { assetIds: ['A-OSP1', 'A-KES2'], sensorIds: ['RDR-P-N', 'FNC-N-04', 'THM-P-NE', 'PTZ-P-NE'] });
      s.appendIncidentEvent(INC, { ts: demoNow(), actor: 'dispatch', actorName: 'Dispatch', text: 'Osprey-1 launched, ETA 58s. Kestrel-2 re-tasked to inner fence N-04. Sector NE lighting to full. Duty officer paged.' });
      s.pushFeed('dispatch', 'Osprey-1 airborne. Kestrel-2 re-tasked. Sector NE lit.', INC);
      s.pushFeed('warden', 'Duty officer notified by pager and desk display.', INC);
      s.setAgentState('warden', 'acting', 'Executing SOP-PB-03 steps 4–5 for INC-0342.');
      s.setAgentState('dispatch', 'acting', 'Tracking Osprey-1 and Kestrel-2 to N-04.');
    },
  },
  {
    t: 140,
    label: 'Drone on station',
    note: 'Downward feed opens. The long object is identified as a cutting tool. One subject is now at the fence.',
    apply: (s) => {
      const a = s.actions.find((x) => x.id === ACTION_1);
      if (a?.approvalState === 'approved') {
        s.setFocusCamera('OSPREY-1');
        s.setAsset('A-OSP1', { currentTask: 'INC-0342: on station over N-04, 40m' });
      }
      s.setVlm(a?.approvalState === 'approved' ? 'OSPREY-1' : 'PTZ-P-NE', VLM_INCIDENT.second, true);
      s.recordAction({
        id: 'ACT-TRACE-3', ts: demoNow(), agentId: 'trace', title: 'Object identified as a two-handled cutting tool',
        observed: VLM_INCIDENT.second,
        considered: ['Bolt cutter', 'Pry bar', 'Pipe or pole'],
        concluded: 'Geometry and the two-handed grip at the fence base fit a bolt cutter. Intent is now clearer: this is preparation to cut, not observation.',
        action: 'Updated the scene description. Recommended Warden hold the sector lit and keep the drone on station.', requiresApproval: false, incidentId: INC, zoneId: 'perimeter',
      });
      s.appendIncidentEvent(INC, { ts: demoNow(), actor: 'trace', actorName: 'Trace', text: 'Drone EO: long object identified as a bolt cutter. One subject crouched at the fence base.', actionId: 'ACT-TRACE-3' });
      s.patchIncident(INC, { evidence: [...(s.incidents.find((i) => i.id === INC)?.evidence ?? []), ev('drone', 'Osprey-1 EO frame, 40m', undefined, 'Cutting tool visible', 'rooftop')] });
      s.pushFeed('trace', 'Drone EO: the object is a bolt cutter. One subject at the fence base.', INC);
      s.setAgentState('trace', 'investigating', 'Tracking two subjects on Osprey-1 EO.');
    },
  },
  {
    t: 155,
    label: 'Cyber correlation',
    note: 'Overwatch links a refused contractor credential at the north door, eleven minutes before the radar track, from a device not on the network. Same incident.',
    apply: (s) => {
      const ts = demoNow();
      s.recordAction({
        id: 'ACT-OVERWATCH-1', ts, agentId: 'overwatch', title: 'Correlated credential ID-2261 with INC-0342',
        observed: 'Contractor badge ID-2261 (J. Marsh, Halden & Co) was refused at DOOR-HQ-N at 04:06, eleven minutes before the radar track. At 03:58 the same account authenticated to the contractor portal from an off-camp address, on a device not on the network. Neither event met a threshold on its own.',
        considered: ['Unrelated (a contractor working late remotely: but the badge was physically presented at the door)', 'Lost or cloned credential being tested before a physical approach', 'Insider'],
        concluded: 'A credential test at a door followed by a fence approach eleven minutes later is one pattern, not two events. Physical and cyber systems each saw half of it.',
        action: 'Attached ID-2261 to INC-0342. Recommended suspending the credential and notifying the security manager.', requiresApproval: false, incidentId: INC, zoneId: 'hq',
      });
      s.pushAlert({ id: AL.cyber, ts, severity: 'elevated', zoneId: 'hq', text: 'Credential ID-2261 refused at DOOR-HQ-N 04:06, off-camp portal login 03:58 — correlated to INC-0342', agentId: 'overwatch', state: 'resolved', resolution: 'merged into INC-0342 by Overwatch', incidentId: INC, actionId: 'ACT-OVERWATCH-1' });
      s.appendIncidentEvent(INC, { ts, actor: 'overwatch', actorName: 'Overwatch', text: 'Cyber correlation: badge ID-2261 refused at HQ north door at 04:06 from a device not on the network. Attached to this incident.', actionId: 'ACT-OVERWATCH-1' });
      s.patchIncident(INC, { sensorIds: ['RDR-P-N', 'FNC-N-04', 'THM-P-NE', 'PTZ-P-NE', 'DOOR-HQ-N'], report: report(5), evidence: [...(s.incidents.find((i) => i.id === INC)?.evidence ?? []), ev('log', 'DOOR-HQ-N read log', 'DOOR-HQ-N', 'ID-2261 refused 04:06:12'), ev('log', 'Contractor portal auth', undefined, 'j.marsh 03:58 from off-camp address')] });
      s.pushFeed('overwatch', 'ID-2261 refused at DOOR-HQ-N at 04:06; portal login from off camp at 03:58. Attached to INC-0342.', INC);
      s.toast('Overwatch: a cyber signal and a physical signal are the same incident.', 'agent');
    },
  },
  {
    t: 170,
    label: 'Withdrawal and plate',
    note: 'Subjects withdraw when the sector lights. The drone tracks them to a car on the access road. The road camera returns a plate.',
    apply: (s) => {
      const ts = demoNow();
      const approved = s.actions.find((x) => x.id === ACTION_1)?.approvalState === 'approved';
      s.setVlm(approved ? 'OSPREY-1' : 'CAM-RD-E', VLM_INCIDENT.third, true);
      if (approved) {
        s.dispatchAsset('A-OSP1', [{ position: [ACCESS_ROAD_VEHICLE[0] - 10, 0, ACCESS_ROAD_VEHICLE[2] + 8], action: 'observe' }], 'INC-0342: track subjects to access road', 'Dispatch', { altitude: 45, speed: 7 });
      }
      s.recordAction({
        id: 'ACT-SENTRY-2', ts, agentId: 'sentry', title: 'ANPR read on east access road: SGP-6120',
        observed: 'CAM-RD-E: dark saloon on the verge 60m north of Gate 2, lights off. Plate SGP-6120 read at 0.93. Two persons approaching it from the fence side.',
        considered: ['Plate on the allow-list (no)', 'Plate seen at any gate in 30 days (no)', 'Plate on the watch list (no)'],
        concluded: 'Unknown vehicle, associated with the subjects by position and timing.',
        action: 'Logged the plate and attached the read to INC-0342.', requiresApproval: false, incidentId: INC, zoneId: 'perimeter',
      });
      s.appendIncidentEvent(INC, { ts, actor: 'trace', actorName: 'Trace', text: 'Subjects withdrew from the fence when sector NE lit. Osprey-1 tracked them to a dark saloon on the east access road.' });
      s.appendIncidentEvent(INC, { ts: ts + 2000, actor: 'sentry', actorName: 'Sentry', text: 'CAM-RD-E ANPR: SGP-6120, not on any camp list.', actionId: 'ACT-SENTRY-2' });
      s.patchIncident(INC, { sensorIds: ['RDR-P-N', 'FNC-N-04', 'THM-P-NE', 'PTZ-P-NE', 'DOOR-HQ-N', 'CAM-RD-E'], evidence: [...(s.incidents.find((i) => i.id === INC)?.evidence ?? []), ev('anpr', 'CAM-RD-E ANPR read SGP-6120', 'CAM-RD-E', '0.93, dark saloon', 'road')] });
      s.pushFeed('trace', 'Subjects withdrawing. Osprey-1 tracking to a vehicle on the access road.', INC);
      s.pushFeed('sentry', 'CAM-RD-E ANPR: SGP-6120. Not on any list.', INC);
      s.setKpi({ assetsOnline: s.kpi.assetsOnline });
    },
  },
  {
    t: 185,
    label: 'Second proposal',
    note: 'Warden proposes logging the plate, notifying the local response unit, and holding the drone until they arrive. Approve it or leave it; the countdown escalates to the duty officer either way.',
    apply: (s) => {
      const ts = demoNow();
      s.proposeAction({
        id: ACTION_2, ts, agentId: 'warden', title: 'Log SGP-6120 to the watch list, notify the local response unit, hold Osprey-1 on station',
        observed: 'Subjects have withdrawn to a vehicle with an unknown plate. The fence was approached but not cut. The drone has battery for 14 more minutes on station.',
        considered: ['Recall the drone now (loses the vehicle)', 'Follow the vehicle beyond the geofence (not permitted)', 'Hold on station and hand over to the local unit'],
        concluded: 'The remaining useful actions are all notifications and logging. Hold the drone at the geofence edge until the local unit arrives.',
        action: 'Add SGP-6120 to the watch list with the incident reference. Notify the local response unit with the plate, position and drone feed link. Hold Osprey-1 on station at the geofence edge.',
        atHigherAutonomy: 'At Autonomous, Warden would have logged the plate and notified the local unit immediately; holding the drone is within its current authority either way.',
        requiresApproval: true, incidentId: INC, zoneId: 'perimeter',
        ifApproved: 'Plate on the watch list within a second. Local unit notified with a live feed link. Drone holds until handover or 30% battery.',
        ifDeclined: 'Drone returns to nest at 30% battery. Plate is logged to the incident only. The local unit is not contacted.',
        escalateAt: ts + min(4),
      });
    },
  },
  {
    t: 200,
    label: 'Report completes',
    note: 'Scribe finishes the report. The view moves to the incident case; the export button is there. This is what it saves your people.',
    apply: (s) => {
      const a2 = s.actions.find((x) => x.id === ACTION_2);
      const tail = a2?.approvalState === 'approved'
        ? ''
        : a2?.approvalState === 'declined'
          ? '\n\nNote: the second proposal was declined by the duty officer. The plate is logged to this incident only.'
          : '\n\nNote: the second proposal is awaiting the duty officer\'s decision.';
      s.patchIncident(INC, { report: report(6) + tail, state: 'contained' });
      if (a2?.approvalState === 'approved') s.addToWatchList('SGP-6120', `${INC} — vehicle used by subjects at N-04`);
      s.pushFeed('scribe', 'INC-0342 report complete: summary, correlation, decisions, development, outcome, follow-up. Ready for signature.', INC);
      s.pushAudit({ actor: 'Scribe', actorKind: 'agent', action: 'Completed incident report', target: INC, record: { words: 480, sections: 6 } });
      s.setAgentState('scribe', 'watching', 'INC-0342 report awaiting signature. Back to the 0600 handover.');
      s.setFocusCamera(null);
      s.openIncident(INC);
      s.setFocusReport(true);
    },
  },
  {
    t: 220,
    label: 'Back to Normal',
    note: 'Posture returns to Normal. Detected in 8 seconds, correlated across 6 sensors, one human decision, full audit trail. Close on the approval queue and the audit log.',
    apply: (s) => {
      s.setPosture('normal');
      s.setAgentState('warden', 'watching', 'INC-0342 contained. No active SOP.');
      s.setAgentState('dispatch', 'watching', 'Osprey-1 holding at geofence edge. Kestrel-2 at inner fence.');
      s.setAgentState('trace', 'watching', 'INC-0342 timeline complete.');
      s.setAgentState('sift', 'watching', 'Holding 0 open tracks. INC-0342 contained.');
      s.setAgentState('overwatch', 'watching', 'All agents within expected behaviour bands. ID-2261 suspended pending contractor call.');
      s.updateAlert(AL.inc, { state: 'resolved', resolution: 'contained — 1 human decision, handed to local unit' });
      const auditRows = s.audit.filter((a) => a.record?.incident === INC || a.target === INC || (a.ts >= s.scenario.startedAt)).length;
      s.setSummaryCard({ detectSec: 8, sensors: 6, humanDecisions: 1, auditRows: Math.max(24, auditRows) });
      s.setKpi({ mttdSec: 8, mttrMs: min(1) + sec(58), autoResolvedPct: 94.1 });
      s.pushAudit({ actor: 'Trace', actorKind: 'agent', action: 'Lowered posture', target: 'Camp Raven', record: { from: 'Elevated', to: 'Normal', reason: 'INC-0342 contained' } });
    },
  },
];

export const SCENARIO_LENGTH = BEATS[BEATS.length - 1].t;

/** Re-apply beats 0..n synchronously (used for step-back and jump). Waits are auto-resolved. */
export function replayTo(n: number) {
  const s = useStore.getState();
  s.resetAll();
  for (let i = 0; i <= n && i < BEATS.length; i++) {
    const b = BEATS[i];
    b.apply(useStore.getState());
    if (b.waitFor && i < n) {
      const st = useStore.getState();
      if (!b.waitFor.done(st)) st.approve(b.waitFor.key, DUTY);
    }
  }
}
