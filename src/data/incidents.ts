import type { Incident, TimelineEvent, Evidence, AgentId, ZoneId, Severity, Vec3 } from '@/lib/types';
import { ago, hr, min, sec } from '@/lib/time';

let evSeq = 0;
const ev = (ts: number, actor: AgentId | 'human' | 'system', actorName: string, text: string): TimelineEvent => ({
  id: `TE-${(++evSeq).toString().padStart(4, '0')}`,
  ts, actor, actorName, text,
});
const A = (id: AgentId) => ({ sentry: 'Sentry', sift: 'Sift', trace: 'Trace', dispatch: 'Dispatch', warden: 'Warden', scribe: 'Scribe', fitter: 'Fitter', overwatch: 'Overwatch' }[id]);
const ag = (ts: number, id: AgentId, text: string) => ev(ts, id, A(id), text);
const hu = (ts: number, name: string, text: string) => ev(ts, 'human', name, text);

let evdSeq = 0;
const evd = (kind: Evidence['kind'], label: string, ts: number, sensorId?: string, detail?: string): Evidence => ({
  id: `EV-${(++evdSeq).toString().padStart(3, '0')}`,
  kind, label, ts, sensorId, detail,
  scene: kind === 'thermal' ? 'thermal' : kind === 'drone' ? 'rooftop' : undefined,
});

function make(
  id: string, title: string, zoneId: ZoneId, severity: Severity, openedAt: number, durationMs: number,
  openedBy: AgentId, sensorIds: string[], assetIds: string[], location: Vec3, summary: string,
  timeline: TimelineEvent[], evidence: Evidence[], humanDecisions: number, detectSeconds: number, report: string,
): Incident {
  return {
    id, title, zoneId, severity, state: 'closed', openedAt, closedAt: openedAt + durationMs, openedBy,
    sensorIds, assetIds, location, summary, timeline, evidence, humanDecisions, detectSeconds, report,
  };
}

const t1 = ago(hr(1) + min(12));
const t2 = ago(hr(3) + min(48));
const t3 = ago(hr(5) + min(6));
const t4 = ago(hr(7) + min(30));
const t5 = ago(hr(9) + min(41));
const t6 = ago(hr(11) + min(18));
const t7 = ago(hr(13) + min(2));
const t8 = ago(hr(14) + min(55));
const t9 = ago(hr(16) + min(30));
const t10 = ago(hr(18) + min(24));
const t11 = ago(hr(20) + min(9));
const t12 = ago(hr(22) + min(47));

export const HISTORICAL_INCIDENTS: Incident[] = [
  make('INC-0341', 'Fence vibration, south section S-01', 'perimeter', 'low', t1, min(6), 'sift',
    ['FNC-S-01', 'THM-P-SW', 'CAM-P-S1'], ['A-KES2'], [60, 0, 138],
    'Fence vibration on S-01 with no radar track. Thermal confirmed a fox at the drainage culvert. Dismissed without human involvement.',
    [
      ag(t1, 'sentry', 'FNC-S-01 vibration, 3 pulses over 4s, amplitude low.'),
      ag(t1 + sec(2), 'sift', 'No radar track on RDR-P-E within 60m. Section S-01 has 19 prior fox confirmations at this hour. Checking thermal before dismissing.'),
      ag(t1 + sec(5), 'dispatch', 'THM-P-SW already covers the culvert. No slew needed.'),
      ag(t1 + sec(9), 'sentry', 'THM-P-SW: one small quadruped heat signature, 40cm, moving west along the drain.'),
      ag(t1 + sec(11), 'sift', 'Consistent with prior pattern. Dismissed. Kestrel-2 will pass the section in 4 minutes on loop 3; no re-task.'),
      ag(t1 + min(6), 'scribe', 'Logged. No report required for a dismissed single-sensor event.'),
    ],
    [evd('fence', 'FNC-S-01 vibration trace', t1, 'FNC-S-01'), evd('thermal', 'THM-P-SW frame', t1 + sec(9), 'THM-P-SW', 'Small quadruped, 40cm')],
    0, 2, 'Dismissed by Sift at 03:05:11. Fox at the S-01 culvert, consistent with 19 prior confirmations. No human involvement.'),

  make('INC-0340', 'Unattended bag, HQ main entrance', 'hq', 'low', t2, min(4), 'sift',
    ['CAM-HQ-01'], [], [0, 0, 22],
    'A holdall left at the HQ entrance for 3 minutes. Trace re-identified the owner leaving to move a vehicle and returning. Dismissed.',
    [
      ag(t2, 'sentry', 'CAM-HQ-01: bag left unattended, 0.78. Owner walked out of frame toward the car park.'),
      ag(t2 + sec(20), 'sift', 'Holding. Bag events at this door are usually vehicle moves. Asking Trace to follow the owner.'),
      ag(t2 + sec(45), 'trace', 'Re-identified the owner on CAM-MP-01 opening vehicle 2-14. Uniformed. Badge last read at HQ main 6 minutes ago.'),
      ag(t2 + min(3) + sec(10), 'sentry', 'CAM-HQ-01: person returned to bag, picked it up, entered building.'),
      ag(t2 + min(3) + sec(12), 'sift', 'Dismissed — owner returned. Duration 3m 10s, under the 5m threshold for human notification.'),
    ],
    [evd('still', 'CAM-HQ-01 still, bag at entrance', t2, 'CAM-HQ-01'), evd('still', 'CAM-MP-01 still, owner at vehicle 2-14', t2 + sec(45), 'CAM-MP-01')],
    0, 3, 'Dismissed by Sift. Owner re-identified by Trace within 45 seconds. Bag recovered by owner at 00:32.'),

  make('INC-0339', 'Tailgating, armoury door', 'armoury', 'elevated', t3, min(14), 'sift',
    ['CAM-AR-01', 'DOOR-AR'], ['A-BDG1'], [-124, 0, 84],
    'Two people entered the armoury on one badge read. Warden proposed a lock-and-verify; the duty officer approved. Both individuals confirmed on the roster; second badge had a dead battery.',
    [
      ag(t3, 'sentry', 'CAM-AR-01: tailgating, 0.89. Two persons through DOOR-AR on one read (badge 0412, Cpl Osei).'),
      ag(t3 + sec(3), 'sift', 'Escalated. Armoury door tailgating is always escalated regardless of roster match.'),
      ag(t3 + sec(8), 'warden', 'SOP-AC-07 loaded. Proposing: lock DOOR-AR (inward), notify duty officer, hold Badger-1 at the door. Awaiting approval.'),
      hu(t3 + sec(51), 'Sgt K. Adeyemi', 'Approved.'),
      ag(t3 + sec(53), 'dispatch', 'DOOR-AR locked. Badger-1 re-tasked from dock, ETA 2m 10s.'),
      ag(t3 + min(2), 'trace', 'Second individual re-identified as Pte Lindqvist, on the armoury duty roster tonight. Badge 0587 last read at 1900; likely dead battery.'),
      hu(t3 + min(9), 'Sgt K. Adeyemi', 'Confirmed by phone. Badge 0587 battery flat. Unlock and close.'),
      ag(t3 + min(9) + sec(4), 'dispatch', 'DOOR-AR unlocked. Badger-1 returning to dock.'),
      ag(t3 + min(14), 'scribe', 'Report drafted and sent to the duty officer for signature.'),
    ],
    [evd('still', 'CAM-AR-01 still, two persons at door', t3, 'CAM-AR-01'), evd('log', 'DOOR-AR read log', t3, 'DOOR-AR', '0412 accepted 23:11:02; no second read')],
    2, 3, 'Tailgating at the armoury door at 23:11. Locked and verified within one minute of approval. Both individuals authorised; badge 0587 replaced. Two human decisions.'),

  make('INC-0338', 'Unregistered vehicle, Gate 1', 'gate', 'low', t4, min(11), 'sift',
    ['ANPR-G1', 'CAM-G1-01'], [], [-40, 0, 138],
    'Plate not on any list at Gate 1 at 20:47. Driver was a taxi collecting a departing visitor. Guard handled it at the barrier; no action proposed.',
    [
      ag(t4, 'sentry', 'ANPR-G1: plate SGT-3390, not on allow-list, not on visitor list.'),
      ag(t4 + sec(4), 'sift', 'Low severity. Vehicle stopped at barrier; guard present. Surfacing to guard house display only.'),
      hu(t4 + min(3), 'Cpl D. Ferreira', 'Taxi for visitor Mrs Halden. Turned around at the barrier.'),
      ag(t4 + min(3) + sec(5), 'sift', 'Closed. Plate SGT-3390 added to the taxi memory list for 30 days.'),
    ],
    [evd('anpr', 'ANPR-G1 read SGT-3390', t4, 'ANPR-G1'), evd('still', 'CAM-G1-01 still', t4, 'CAM-G1-01')],
    1, 1, 'Unregistered taxi at Gate 1. Handled at the barrier by the gate guard. Closed 20:58.'),

  make('INC-0337', 'Sensor outage, CAM-P-W1', 'perimeter', 'elevated', t5, hr(6) + min(20), 'fitter',
    ['CAM-P-W1', 'THM-P-SW', 'FNC-W-01'], ['A-KES2'], [-186, 0, 0],
    'West fence camera went offline at 21:40. Fitter diagnosed the media converter, raised a ticket and changed the patrol pattern so the gap is covered by thermal and a robot pass every 20 minutes.',
    [
      ag(t5, 'sentry', 'CAM-P-W1 stream lost.'),
      ag(t5 + sec(30), 'fitter', 'Power at pole present. Stream negotiation fails at the media converter. Ticket FM-1187 raised. Spares confirmed in the workshop.'),
      ag(t5 + sec(40), 'sift', 'Coverage gap: 40m either side of the pole, partly covered by THM-P-SW. Elevated until covered.'),
      ag(t5 + sec(55), 'dispatch', 'Kestrel-2 patrol loop modified to include a west fence pass every 20 minutes. Duty officer notified.'),
      hu(t5 + min(4), 'Sgt K. Adeyemi', 'Acknowledged. Repair at first light.'),
      ag(t5 + hr(6) + min(20), 'fitter', 'Compensating coverage in place for 6h 20m. Closing the incident; ticket stays open.'),
    ],
    [evd('log', 'CAM-P-W1 stream log', t5, 'CAM-P-W1', 'RTSP negotiation timeout ×4')],
    1, 1, 'CAM-P-W1 offline since 21:40, media converter fault. Coverage compensated by thermal and robot pass. Repair ticket FM-1187 open.'),

  make('INC-0336', 'Loitering, motor pool', 'motorpool', 'low', t6, min(8), 'sift',
    ['CAM-MP-01'], ['A-FER4'], [90, 0, 50],
    'Person stationary by the vehicle shelter for 7 minutes at 19:59. Ferret-4 diverted to observe. Individual was a driver waiting for a tasking; confirmed against the transport log.',
    [
      ag(t6, 'sentry', 'CAM-MP-01: loitering, 0.72, 6m 40s stationary.'),
      ag(t6 + sec(5), 'sift', 'Uniformed. No badge read nearby in the last 10 minutes. Asking Dispatch for a closer look.'),
      ag(t6 + sec(10), 'dispatch', 'Ferret-4 is 60m away on the motor pool sweep. Diverting to observe.'),
      ag(t6 + min(2), 'trace', 'Transport log shows a driver assigned to vehicle 2-31 at 2000. Consistent.'),
      ag(t6 + min(2) + sec(5), 'sift', 'Dismissed — matches transport log.'),
    ],
    [evd('still', 'CAM-MP-01 still', t6, 'CAM-MP-01'), evd('still', 'Ferret-4 forward camera', t6 + min(1), undefined, 'Individual seated on kerb, in uniform')],
    0, 2, 'Loitering dismissed after a robot observation and a transport log match. No human involvement.'),

  make('INC-0335', 'Smoke detection, workshop', 'hq', 'elevated', t7, min(19), 'sentry',
    ['CAM-HQ-04', 'GAS-HQ-01'], ['A-FER4', 'A-OSP2'], [142, 0, 10],
    'Smoke visible from the workshop roof camera at 15:15. Osprey-2 launched with approval; source was a welding job with the extractor off. Ventilation restored, no fire.',
    [
      ag(t7, 'sentry', 'CAM-HQ-04: smoke plume, workshop east side, 0.81.'),
      ag(t7 + sec(4), 'sift', 'Escalated. Smoke on any building is escalated.'),
      ag(t7 + sec(9), 'warden', 'SOP-FS-01 loaded. Proposing: launch Osprey-2 for an overhead look, notify the fire picket, hold Ferret-4 clear. Awaiting approval.'),
      hu(t7 + sec(38), 'Sgt M. Okafor', 'Approved.'),
      ag(t7 + min(1) + sec(30), 'dispatch', 'Osprey-2 on station over the workshop. Plume from the extractor stack, not the roof.'),
      hu(t7 + min(5), 'Fire picket', 'Welding bay, extractor was switched off. No fire. Ventilating.'),
      ag(t7 + min(19), 'scribe', 'Report complete. Recommendation: interlock the welding bay to the extractor.'),
    ],
    [evd('still', 'CAM-HQ-04 still, plume', t7, 'CAM-HQ-04'), evd('drone', 'Osprey-2 overhead', t7 + min(1) + sec(30), undefined, 'Plume source: extractor stack')],
    1, 2, 'Smoke at the workshop at 15:15 was a welding extractor left off. Drone confirmed within 90 seconds of approval. No fire.'),

  make('INC-0334', 'Unknown drone track, helipad approach', 'helipad', 'elevated', t8, min(9), 'sentry',
    ['RF-P-01', 'PTZ-P-NE', 'CAM-HP-01'], [], [160, 60, -120],
    'A small UAS was detected on RF and confirmed by PTZ at 13:22, 400m north-east of the helipad approach. Warden proposed notify and observe. It left the area after 6 minutes. No interception was proposed; this system does not do that.',
    [
      ag(t8, 'sentry', 'RF-P-01: 2.4 GHz control link consistent with a consumer UAS, bearing 040, estimated 400m.'),
      ag(t8 + sec(6), 'dispatch', 'PTZ-P-NE slewed to bearing 040. Small multirotor visible, estimated 60m AGL.'),
      ag(t8 + sec(10), 'sift', 'Escalated. Track is outside the fence but inside the helipad approach corridor.'),
      ag(t8 + sec(15), 'warden', 'SOP-AS-02 loaded. Proposing: notify the duty officer and the helipad controller, hold our own drones on the ground, keep the PTZ tracking. No interception is available or proposed.'),
      hu(t8 + sec(50), 'Sgt M. Okafor', 'Approved. Note the bearing for the local police report.'),
      ag(t8 + min(6), 'sentry', 'RF link lost, bearing 020, receding.'),
      ag(t8 + min(9), 'scribe', 'Report complete with track plot attached.'),
    ],
    [evd('radar', 'RF-P-01 spectrum capture', t8, 'RF-P-01'), evd('still', 'PTZ-P-NE still, multirotor', t8 + sec(6), 'PTZ-P-NE')],
    1, 6, 'Unknown UAS near the helipad approach for 6 minutes. Observed and reported. No interception.'),

  make('INC-0333', 'Person down, barracks yard', 'barracks', 'high', t9, min(22), 'sentry',
    ['CAM-BK-02'], ['A-HER1'], [-112, 0, -27],
    'Fall detected in the barracks yard at 11:47. Warden notified the medic and dispatched Heron-1 to observe. Individual had fainted in the heat; medic on scene in 3 minutes.',
    [
      ag(t9, 'sentry', 'CAM-BK-02: person down, 0.84. Fell from standing, no movement for 8s.'),
      ag(t9 + sec(3), 'sift', 'Escalated. Person down is always escalated to high.'),
      ag(t9 + sec(6), 'warden', 'SOP-MD-01. At Autonomous for medical notifications: medic paged, duty officer notified. Proposing: send Heron-1 to observe and relay. Awaiting approval.'),
      hu(t9 + sec(20), 'Sgt M. Okafor', 'Approved. Medic already moving.'),
      ag(t9 + min(3), 'dispatch', 'Medic on scene. Heron-1 holding 5m clear.'),
      hu(t9 + min(12), 'Medic Cpl Yusuf', 'Heat syncope. Conscious, hydrating. No further action.'),
      ag(t9 + min(22), 'scribe', 'Report complete. Follow-up: shade at the yard bench.'),
    ],
    [evd('still', 'CAM-BK-02 still', t9, 'CAM-BK-02')],
    1, 1, 'Fall in the barracks yard at 11:47. Medic paged automatically, on scene in 3 minutes. Heat syncope, recovered.'),

  make('INC-0332', 'Flood sensor, low ground drain', 'perimeter', 'low', t10, hr(1) + min(4), 'sentry',
    ['FLD-LG-01'], ['A-FER4'], [-150, 0, 110],
    'Flood sensor at the low ground drain triggered after heavy rain at 09:53. Fitter flagged the sensor as intermittent; Ferret-4 confirmed standing water below the fence line. Cleared after the drain was rodded.',
    [
      ag(t10, 'sentry', 'FLD-LG-01: water present.'),
      ag(t10 + sec(10), 'fitter', 'This sensor has tripped 3 times in 30 days with rain. Treating as real until verified.'),
      ag(t10 + sec(20), 'dispatch', 'Ferret-4 to the drain for a look. ETA 4 minutes.'),
      ag(t10 + min(5), 'sentry', 'Ferret-4 forward camera: standing water, 5cm, over the drain grate.'),
      hu(t10 + min(30), 'Facilities', 'Drain rodded. Clear.'),
      ag(t10 + hr(1) + min(4), 'fitter', 'FLD-LG-01 reset. Marking degraded pending a sensor swap.'),
    ],
    [evd('still', 'Ferret-4 forward camera', t10 + min(5), undefined, 'Standing water over the grate')],
    0, 1, 'Standing water at the low ground drain after rain. Verified by robot, cleared by facilities. Sensor marked degraded.'),

  make('INC-0331', 'Credential anomaly, contractor portal', 'hq', 'elevated', t11, min(31), 'overwatch',
    ['DOOR-HQ-N'], [], [0, 0, -20],
    'A contractor account authenticated from two locations 20 minutes apart at 07:57. Overwatch correlated it with a badge read at the HQ north door. Account was suspended pending a call to the contractor; it was a shared laptop.',
    [
      ag(t11, 'overwatch', 'Contractor account j.marsh authenticated from an off-camp address at 07:37 and from the HQ guest network at 07:57. Badge ID-2261 read at DOOR-HQ-N at 07:55.'),
      ag(t11 + sec(15), 'warden', 'SOP-CY-04. Proposing: suspend the account, keep the door policy unchanged, notify the security manager. Awaiting approval.'),
      hu(t11 + min(3), 'Security manager R. Bell', 'Approved.'),
      hu(t11 + min(28), 'Security manager R. Bell', 'Halden & Co confirm a shared laptop left logged in at their office. Account reissued.'),
      ag(t11 + min(31), 'scribe', 'Report complete. Recommendation: enforce single-session on contractor accounts.'),
    ],
    [evd('log', 'Portal auth log', t11, undefined, 'j.marsh: 07:37 off-camp, 07:57 HQ guest'), evd('log', 'DOOR-HQ-N read log', t11, 'DOOR-HQ-N', 'ID-2261 accepted 07:55:41')],
    1, 20, 'Contractor credential used from two locations. Correlated with a physical door read. Account suspended and reissued. Cause: shared laptop.'),

  make('INC-0330', 'Vehicle overstay, Gate 2', 'perimeter', 'low', t12, min(15), 'sift',
    ['ANPR-G2', 'CAM-RD-E'], [], [190, 0, -40],
    'A delivery vehicle entered via Gate 2 at 05:30 and had not left by 05:45 against a 15-minute expected dwell. Trace found it at the workshop loading bay. Dismissed.',
    [
      ag(t12, 'sift', 'Vehicle SGP-2277 entered Gate 2 at 05:30, expected dwell 15m, not seen leaving.'),
      ag(t12 + sec(10), 'trace', 'Retrospective search across ANPR-MP and CAM-MP-01: vehicle at the workshop loading bay since 05:34.'),
      ag(t12 + sec(12), 'sift', 'Dismissed — delivery in progress. Dwell exception extended to 45m.'),
    ],
    [evd('anpr', 'ANPR-G2 read SGP-2277', t12, 'ANPR-G2')],
    0, 1, 'Delivery vehicle overstay at Gate 2 resolved by retrospective search. No human involvement.'),
];

export const INCIDENT_BY_ID = Object.fromEntries(HISTORICAL_INCIDENTS.map((i) => [i.id, i])) as Record<string, Incident>;
export const LIVE_INCIDENT_ID = 'INC-0342';
