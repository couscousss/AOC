import { Suspense, lazy } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { ZONE_BY_ID, CAPABILITY_META } from '@/data/zones';
import { CapabilityView } from '@/capabilities/CapabilityView';
import { AgentRoster } from '@/agents/AgentRoster';
import { ApprovalQueue } from '@/governance/ApprovalQueue';
import { IncidentList } from '@/incidents/IncidentList';
import { IncidentCase } from '@/incidents/IncidentCase';
import { GovernanceView } from '@/governance/GovernanceView';
import { HealthView } from '@/governance/HealthView';
import { OverlayToggles } from '@/scene/OverlayToggles';
import { CameraFocus } from '@/capabilities/VideoAnalytics/CameraFocus';
import { SummaryCardView } from '@/scenario/SummaryCard';

const CampScene = lazy(() => import('@/scene/CampScene').then((m) => ({ default: m.CampScene })));

export function Stage() {
  const view = useStore((s) => s.view);
  const zoneId = useStore((s) => s.selectedZoneId);
  const cap = useStore((s) => s.activeCapability);
  const incidentId = useStore((s) => s.selectedIncidentId);
  const selectZone = useStore((s) => s.selectZone);
  const openCapability = useStore((s) => s.openCapability);
  const focusCameraId = useStore((s) => s.focusCameraId);
  const reduced = useReducedMotion();

  const zone = zoneId ? ZONE_BY_ID[zoneId] : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* The map is always mounted so WebGL context and camera state persist across views. */}
      <div className={`absolute inset-0 ${view === 'map' ? '' : 'invisible'}`} aria-hidden={view !== 'map'}>
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-text-muted text-12">Loading camp…</div>}>
          <CampScene />
        </Suspense>
        {view === 'map' && <OverlayToggles />}
        {view === 'map' && !zone && <MapHint />}
      </div>

      {/* Capability hub panel slides up over the lower 60% of the stage */}
      <AnimatePresence>
        {view === 'map' && zone && (
          <motion.div
            key={zone.id}
            initial={reduced ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduced ? undefined : { y: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : 0.5 }}
            className="absolute left-0 right-0 bottom-0 h-[62%] bg-surface-raised border-t hairline flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
            role="region"
            aria-label={`${zone.name} capability hub`}
          >
            <div className="flex items-center gap-2 px-4 h-9 border-b hairline shrink-0">
              <button type="button" className="btn btn-sm" onClick={() => selectZone(null)} title="Back to camp (Esc)">← Camp</button>
              <div className="text-14 font-medium ml-1">{zone.name}</div>
              <div className="text-12 text-text-muted hidden xl:block truncate">{zone.description}</div>
              <div className="ml-auto flex gap-1 overflow-x-auto">
                {zone.capabilities.map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={cap === c} onClick={() => openCapability(c)}>{CAPABILITY_META[c].short}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {cap && <CapabilityView capability={cap} zone={zone} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {focusCameraId && view === 'map' && <CameraFocus sensorId={focusCameraId} />}

      {view === 'agents' && <FullView><AgentRoster /></FullView>}
      {view === 'approvals' && <FullView><ApprovalQueue /></FullView>}
      {view === 'incidents' && <FullView>{incidentId ? <IncidentCase id={incidentId} /> : <IncidentList />}</FullView>}
      {view === 'governance' && <FullView><GovernanceView /></FullView>}
      {view === 'health' && <FullView><HealthView /></FullView>}
      <SummaryCardView />
    </div>
  );
}

function FullView({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 bg-surface-deep overflow-hidden">{children}</div>;
}

function MapHint() {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-11 text-text-muted panel px-3 py-1 pointer-events-none">
      Drag to orbit · scroll to zoom · click a zone to drill down · <span className="kbd">Esc</span> goes up
    </div>
  );
}
