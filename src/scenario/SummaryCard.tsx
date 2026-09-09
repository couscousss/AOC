import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { scenario } from './ScenarioController';

/** The closing beat: one card, four numbers, and a pointer to the approval queue and audit log. */
export function SummaryCardView() {
  const card = useStore((s) => s.summaryCard);
  const setSummaryCard = useStore((s) => s.setSummaryCard);
  const setView = useStore((s) => s.setView);
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 top-16 -translate-x-1/2 z-30 panel shadow-2xl w-[560px] p-5"
          role="dialog"
          aria-label="Scenario summary"
        >
          <div className="text-12 text-text-muted">INC-0342 · Perimeter breach attempt, northeast fence</div>
          <div className="text-20 font-medium mt-0.5">Contained. One person stayed in charge.</div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            <Num v={`${card.detectSec}s`} l="to detect" />
            <Num v={`${card.sensors}`} l="sensors correlated" />
            <Num v={`${card.humanDecisions}`} l="human decision required" />
            <Num v={`${card.auditRows}`} l="audit rows written" />
          </div>
          <div className="text-12 text-text-muted mt-4">
            The agents watched, correlated, proposed. A person approved. Every step is in the audit log with who did it and why.
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button type="button" className="btn btn-sm" onClick={() => { setSummaryCard(null); setView('approvals'); }}>Approval queue</button>
            <button type="button" className="btn btn-sm" onClick={() => { setSummaryCard(null); setView('governance'); }}>Audit log</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { setSummaryCard(null); }}>Close</button>
            <button type="button" className="btn btn-sm" onClick={() => scenario.reset()}>Reset scenario</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Num({ v, l }: { v: string; l: string }) {
  return (
    <div className="inset p-3">
      <div className="text-28 font-medium mono agent-text leading-8">{v}</div>
      <div className="text-11 text-text-muted mt-0.5">{l}</div>
    </div>
  );
}
