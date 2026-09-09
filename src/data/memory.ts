import type { AgentId, MemoryEntry } from '@/lib/types';
import { ago, hr } from '@/lib/time';

const d = (days: number) => ago(hr(24 * days));

export const MEMORY: Record<AgentId, MemoryEntry[]> = {
  sentry: [
    { id: 'M-S-01', subject: 'CAM-P-N3', fact: 'Exposure drifts after midnight when the north floodlight cycles. Detections from this camera between 0000 and 0500 carry a 0.08 confidence penalty.', learnedAt: d(12), confidence: 0.91 },
    { id: 'M-S-02', subject: 'RDR-P-N', fact: 'Returns a spurious slow track along the north fence in wind above 20 knots. Cross-checked against 41 events, all cleared by thermal.', learnedAt: d(60), confidence: 0.97 },
    { id: 'M-S-03', subject: 'CAM-MP-01', fact: 'Headlight glare from the vehicle shelter produces a false "person" class at 0.4–0.5 confidence. Suppressed below 0.55 on this camera.', learnedAt: d(23), confidence: 0.88 },
  ],
  sift: [
    { id: 'M-F-01', subject: 'Vehicle SGP-4471', fact: 'Routine contractor vehicle (facilities, Halden & Co). Arrives Tuesdays around 0700, 34 prior visits, always via Gate 1, always departs by 1600.', learnedAt: d(240), confidence: 0.99 },
    { id: 'M-F-02', subject: 'South fence, section S-01', fact: 'A fox crosses at the drainage culvert most nights between 0200 and 0400. 19 thermal confirmations. Fence vibration on S-01 without radar is almost always this.', learnedAt: d(45), confidence: 0.94 },
    { id: 'M-F-03', subject: 'Barracks yard', fact: 'Smokers gather at the yard bench between 2230 and 2300. "Loitering" and "crowd forming" in this window are expected and dismissed.', learnedAt: d(90), confidence: 0.96 },
    { id: 'M-F-04', subject: 'Mess hall deliveries', fact: 'Bakery van (plate SGP-8012) arrives 0350–0420 daily. Driver leaves the van door open for roughly six minutes. Not a tailgating event.', learnedAt: d(30), confidence: 0.98 },
    { id: 'M-F-05', subject: 'NE fence corner', fact: 'No routine activity of any kind at this location between 2200 and 0600 in the last 90 days. Anything seen here at night is anomalous by definition.', learnedAt: d(90), confidence: 0.99 },
  ],
  trace: [
    { id: 'M-T-01', subject: 'Personnel roster', fact: '412 assigned personnel, 288 on camp tonight per the 2200 muster. 9 contractors pre-registered for tomorrow, none for tonight.', learnedAt: hr(-6), confidence: 1 },
    { id: 'M-T-02', subject: 'Re-identification', fact: 'Cross-camera re-ID is reliable between CAM-G1-01, CAM-G1-02 and CAM-HQ-01 (shared lighting). It is unreliable between exterior thermal and interior colour cameras; I say so when it matters.', learnedAt: d(15), confidence: 0.9 },
    { id: 'M-T-03', subject: 'East access road', fact: 'Civilian traffic on the east access road stops almost completely after 2300. A vehicle there after midnight has been camp-related in 11 of 12 cases; the twelfth was INC-0318.', learnedAt: d(8), confidence: 0.92 },
  ],
  dispatch: [
    { id: 'M-D-01', subject: 'PTZ-P-NE', fact: 'Slew to the NE fence corner takes 2.1s from any preset. The thermal (THM-P-NE) is fixed and already covers it, so I check thermal first and slew PTZ second.', learnedAt: d(20), confidence: 0.99 },
    { id: 'M-D-02', subject: 'Kestrel-2', fact: 'Reaches any point on the inner perimeter road within 3m 40s from its patrol loop. Prefer it over Badger-1 when Badger is below 40% charge.', learnedAt: d(14), confidence: 0.95 },
    { id: 'M-D-03', subject: 'Osprey-1', fact: 'Nest to NE corner: 58s at cruise. Return-home reserve at 30%. In wind above 18 knots, add 20% to every leg.', learnedAt: d(35), confidence: 0.97 },
  ],
  warden: [
    { id: 'M-W-01', subject: 'SOP-PB-03 Perimeter breach', fact: 'Confirm with a second sensor, put eyes on with the nearest camera, then propose: illuminate, dispatch an observer, notify the duty officer. Never propose contact. Escalate to the duty officer after 4 minutes without a decision.', learnedAt: d(120), confidence: 1 },
    { id: 'M-W-02', subject: 'Duty officer preferences', fact: 'Sgt Adeyemi declined two drone launches in February as "asset not needed"; both were single-sensor events. She approves when a second sensor confirms. I lead with the correlation now.', learnedAt: d(28), confidence: 0.86 },
    { id: 'M-W-03', subject: 'Lighting sector NE', fact: 'Illuminating sector NE takes 1.5s to full brightness and has never been declined. It is the lowest-cost action in the SOP.', learnedAt: d(50), confidence: 0.98 },
  ],
  scribe: [
    { id: 'M-R-01', subject: 'Report format', fact: 'Camp Raven uses the six-section incident format: summary, timeline, sensors, assets, decisions, follow-up. The duty officer reads the summary and the decisions; the rest is for the record.', learnedAt: d(200), confidence: 1 },
    { id: 'M-R-02', subject: 'Handover', fact: 'The 0600 handover is read aloud in under four minutes. Anything over 600 words gets skimmed.', learnedAt: d(70), confidence: 0.93 },
  ],
  fitter: [
    { id: 'M-M-01', subject: 'Quadruped Mk3 batteries', fact: 'Capacity drops below 80% around cycle 320. Kestrel-2 is at 208, Badger-1 at 251. Badger-1 will need a pack in roughly 5 weeks at current usage.', learnedAt: d(3), confidence: 0.89 },
    { id: 'M-M-02', subject: 'CAM-P-W1', fact: 'Offline since 2140. Power at the pole is present; the failure is the media converter. Ticket FM-1187 raised, spares in the workshop. Coverage gap is 40m either side, partly covered by THM-P-SW.', learnedAt: hr(-6.5), confidence: 0.95 },
    { id: 'M-M-03', subject: 'Generator 1', fact: 'Burns 3.1 L/h under night load. Reserve threshold is 400 L. At the current fill rate the reserve is reached in 6 days.', learnedAt: d(1), confidence: 0.92 },
  ],
  overwatch: [
    { id: 'M-O-01', subject: 'Sift and Trace disagreement', fact: 'When Sift dismisses and Trace escalates within 30s of each other on the same track, the human is shown both and the track is held open. Happened 4 times in 90 days; 3 were Trace correct.', learnedAt: d(40), confidence: 0.9 },
    { id: 'M-O-02', subject: 'Credential ID-2261', fact: 'Contractor badge (Halden & Co, J. Marsh). Badge tapped the HQ north door at 04:06 tonight and was refused. The same account authenticated to the contractor portal from an off-camp address at 03:58. Neither event alone met the alert threshold.', learnedAt: hr(-0.18), confidence: 0.84 },
    { id: 'M-O-03', subject: 'Autonomy policy', fact: 'No agent may be set to Autonomous for any action that dispatches a physical asset without the change being recorded with a named approver. Enforced in the audit log, not just the UI.', learnedAt: d(100), confidence: 1 },
  ],
};
