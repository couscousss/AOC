import type { AgentAction } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { agentName } from '@/data/agents';
import { fmtTime } from '@/lib/time';
import { AUTONOMY_LABELS } from '@/lib/types';

/** The reasoning chain behind a decision. Everything here is machine-authored → --agent. */
export function ReasoningChain({ action, compact }: { action: AgentAction; compact?: boolean }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === action.agentId));
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: 'Observed', v: action.observed },
    { k: 'Considered', v: <ul className="list-disc pl-4 space-y-0.5">{action.considered.map((c, i) => <li key={i}>{c}</li>)}</ul> },
    { k: 'Concluded', v: action.concluded },
    { k: 'Did', v: action.action },
  ];
  if (action.atHigherAutonomy) rows.push({ k: 'At a higher autonomy level', v: action.atHigherAutonomy });
  return (
    <div className={`${compact ? 'text-12' : 'text-14'} space-y-2`}>
      <div className="flex items-center gap-2 text-12 text-text-muted">
        <span className="agent-text font-medium">{agentName(action.agentId)}</span>
        <span className="mono">{fmtTime(action.ts)}</span>
        {agent && <span>· {AUTONOMY_LABELS[agent.autonomy]}</span>}
        {action.approvalState && (
          <span className={action.approvalState === 'pending' ? 'text-advisory' : ''}>· {action.approvalState}{action.approvedBy ? ` by ${action.approvedBy}` : ''}</span>
        )}
      </div>
      {rows.map((r) => (
        <div key={r.k} className="grid grid-cols-[110px_1fr] gap-2">
          <div className="text-12 text-text-muted pt-0.5">{r.k}</div>
          <div className="agent-text">{r.v}</div>
        </div>
      ))}
      {action.declineReason && (
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <div className="text-12 text-text-muted">Declined because</div>
          <div className="text-text-primary">{action.declineReason}</div>
        </div>
      )}
    </div>
  );
}

/** The consistent `why` affordance. Anywhere an agent decided something. */
export function WhyButton({ actionId, className = '', label = 'why' }: { actionId: string; className?: string; label?: string }) {
  const setWhy = useStore((s) => s.setWhy);
  const exists = useStore((s) => s.actions.some((a) => a.id === actionId));
  if (!exists) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setWhy(actionId); }}
      className={`inline-flex items-center gap-1 text-11 px-1.5 rounded border hover:bg-surface-inset ${className}`}
      style={{ color: 'var(--agent)', borderColor: 'rgba(79,209,197,0.35)' }}
      title="Show the reasoning chain"
    >
      <span aria-hidden>?</span> {label}
    </button>
  );
}

/** Global explainability panel, rendered once in App. */
export function WhyPanel() {
  const id = useStore((s) => s.whyActionId);
  const action = useStore((s) => s.actions.find((a) => a.id === s.whyActionId));
  const setWhy = useStore((s) => s.setWhy);
  if (!id || !action) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end" onClick={() => setWhy(null)}>
      <div className="absolute inset-0 bg-black/40" />
      <aside
        className="relative panel m-3 w-[520px] max-h-[calc(100%-24px)] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Why this decision"
        style={{ marginTop: 'calc(var(--status-h) + 12px)' }}
      >
        <header className="flex items-center justify-between px-4 py-2 border-b hairline">
          <div>
            <div className="text-12 text-text-muted">Why</div>
            <div className="text-16 font-medium">{action.title}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setWhy(null)} autoFocus>Close <span className="kbd">Esc</span></button>
        </header>
        <div className="p-4">
          <ReasoningChain action={action} />
          {action.evidence && action.evidence.length > 0 && (
            <div className="mt-4">
              <div className="text-12 text-text-muted mb-1">Evidence</div>
              <ul className="space-y-1">
                {action.evidence.map((e) => (
                  <li key={e.id} className="text-12 flex gap-2"><span className="mono text-text-muted">{fmtTime(e.ts)}</span><span>{e.label}{e.detail ? ` — ${e.detail}` : ''}</span></li>
                ))}
              </ul>
            </div>
          )}
          {(action.ifApproved || action.ifDeclined) && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-12">
              <div className="inset p-2"><div className="text-text-muted mb-0.5">If approved</div><div>{action.ifApproved}</div></div>
              <div className="inset p-2"><div className="text-text-muted mb-0.5">If declined</div><div>{action.ifDeclined}</div></div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
