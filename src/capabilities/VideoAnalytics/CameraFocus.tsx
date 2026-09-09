import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { SENSOR_BY_ID } from '@/data/sensors';
import { CctvFeed, type FeedSubjects, type FeedVariant } from '@/ui/CctvFeed';
import { StreamText } from '@/ui/StreamText';
import { AgentChip } from '@/agents/AgentChip';

/** Auto-opened camera tile on the stage (Dispatch opens it during the incident). Includes the live scene description. */
export function CameraFocus({ sensorId }: { sensorId: string }) {
  const setFocusCamera = useStore((s) => s.setFocusCamera);
  const vlm = useStore((s) => s.vlm);
  const beat = useStore((s) => s.scenario.beat);
  const openIncident = useStore((s) => s.openIncident);
  const live = useStore((s) => s.incidents.find((i) => i.state !== 'closed'));
  const zoneOpen = useStore((s) => !!s.selectedZoneId);

  const isDrone = sensorId === 'OSPREY-1';
  const sensor = isDrone ? null : SENSOR_BY_ID[sensorId];
  const variant: FeedVariant = isDrone ? 'drone' : sensor?.type === 'thermal' ? 'thermal' : 'cctv';
  const subjects: FeedSubjects = isDrone ? (beat >= 12 ? 'withdraw' : 'drone-topdown') : beat >= 12 ? 'withdraw' : beat >= 10 ? 'figures-at-fence' : 'two-figures';
  const label = isDrone ? 'Osprey-1 · EO/IR, 40m over N-04' : `${sensor?.label ?? sensorId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute z-20 panel shadow-2xl flex ${zoneOpen ? 'top-3 right-3 w-[520px]' : 'top-16 right-3 w-[620px]'}`}
      role="region"
      aria-label="Camera focus"
    >
      <div className="w-[60%] shrink-0 border-r hairline">
        <CctvFeed sensorId={isDrone ? 'OSPREY-1' : sensorId} scene={isDrone ? 'rooftop' : sensor?.scene ?? 'fence'} variant={variant} subjects={subjects} label={label} showBoxes={!isDrone} />
        <div className="px-2 py-1 text-11 text-text-muted flex items-center justify-between">
          <span>{label}</span>
          <span className="agent-text">opened by Dispatch</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="text-12 text-text-muted">Scene understanding</div>
          <AgentChip agentId="trace" />
        </div>
        <div className="agent-text text-12 flex-1 min-h-[80px]">
          {vlm.live ? <StreamText text={vlm.text} speed={22} streamKey={vlm.key} /> : <span className="text-text-muted">Trace is describing the scene…</span>}
        </div>
        <div className="flex gap-2 mt-2">
          {live && <button type="button" className="btn btn-sm btn-primary" onClick={() => openIncident(live.id)}>Open {live.id}</button>}
          <button type="button" className="btn btn-sm" onClick={() => setFocusCamera(null)}>Close</button>
        </div>
      </div>
    </motion.div>
  );
}
