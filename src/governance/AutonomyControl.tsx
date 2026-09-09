import { useState } from 'react';
import type { AgentId, Autonomy } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { useStore } from '@/store/useStore';

export const DUTY_OFFICER = 'Sgt K. Adeyemi';

const DESCRIPTIONS = [
  'Detects and logs only. Nothing is proposed.',
  'Surfaces a proposed action but takes none.',
  'Prepares the action, executes on a human click.',
  'Acts, then notifies. Recorded with a named approver.',
];

/** Four-position segmented control. Changing it visibly changes behaviour. */
export function AutonomyControl({ agentId, compact, className = '' }: { agentId: AgentId; compact?: boolean; className?: string }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const setAutonomy = useStore((s) => s.setAutonomy);
  const [confirm, setConfirm] = useState<Autonomy | null>(null);
  if (!agent) return null;

  const choose = (level: Autonomy) => {
    if (level === agent.autonomy) return;
    if (level === 3) { setConfirm(level); return; }
    setAutonomy(agentId, level, DUTY_OFFICER);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="seg" role="radiogroup" aria-label={`${agent.name} autonomy level`}>
        {AUTONOMY_LABELS.map((l, i) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={agent.autonomy === i}
            aria-pressed={agent.autonomy === i}
            onClick={() => choose(i as Autonomy)}
            title={DESCRIPTIONS[i]}
            style={agent.autonomy === i && i === 3 ? { background: 'rgba(224,169,59,0.16)' } : undefined}
          >
            {compact ? ['Obs', 'Rec', 'Appr', 'Auto'][i] : l}
          </button>
        ))}
      </div>
      {confirm !== null && (
        <div className="absolute z-30 right-0 top-full mt-1 w-72 panel p-3 shadow-xl" role="alertdialog" aria-label="Confirm autonomous">
          <div className="text-12 font-medium text-advisory mb-1">Set {agent.name} to Autonomous?</div>
          <div className="text-12 text-text-muted mb-2">
            {agent.name} will act without waiting for approval and notify afterwards. The change is recorded in the audit log under your name ({DUTY_OFFICER}).
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: 'rgba(224,169,59,0.6)' }}
              onClick={() => { setAutonomy(agentId, 3, DUTY_OFFICER); setConfirm(null); }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
