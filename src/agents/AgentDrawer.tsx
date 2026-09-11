import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import type { AgentAction, AgentId, Incident, TimelineEvent } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { AGENT_STATE_LABEL, agentStateColor } from '@/ui/bits';
import { StreamText } from '@/ui/StreamText';
import { ReasoningChain } from '@/agents/ReasoningChain';
import { AutonomyControl } from '@/governance/AutonomyControl';
import { DEMO_NOW, fmtTime, relTime, DAY_MS, demoNow } from '@/lib/time';
import { HandoffFocus } from './HandoffDiagram';

/**
 * Memory entries are dated either as epoch timestamps or as small offsets from the demo clock
 * (negative hours). Normalise so both read as "learned N days ago".
 */
function learnedAgo(ts: number) {
  const t = Math.abs(ts) < DAY_MS * 400 ? DEMO_NOW + ts : ts;
  const d = demoNow() - t;
  if (d >= DAY_MS) {
    const days = Math.round(d / DAY_MS);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  return relTime(t);
}

type HistoricalDecision = { event: TimelineEvent; incident: Incident };

/** Global drawer, rendered once in App. Reads the selected agent from the store. */
export function AgentDrawer() {
  const agent = useStore((s) => (s.agentDrawerId ? s.agents.find((a) => a.id === s.agentDrawerId) : undefined));
  const agents = useStore((s) => s.agents);
  const actions = useStore((s) => s.actions);
  const incidents = useStore((s) => s.incidents);
  const openAgent = useStore((s) => s.openAgent);
  const openIncident = useStore((s) => s.openIncident);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const mine = useMemo(
    () => (agent ? actions.filter((a) => a.agentId === agent.id).slice().sort((a, b) => b.ts - a.ts) : []),
    [actions, agent],
  );

  // Decisions from the incident record, for agents that have not acted in the store yet (or as the "earlier" tail).
  const historical = useMemo<HistoricalDecision[]>(() => {
    if (!agent) return [];
    const known = new Set(actions.map((a) => a.id));
    const out: HistoricalDecision[] = [];
    for (const inc of incidents) {
      for (const e of inc.timeline) {
        if (e.actor === agent.id && !(e.actionId && known.has(e.actionId))) out.push({ event: e, incident: inc });
      }
    }
    out.sort((a, b) => b.event.ts - a.event.ts);
    return out.slice(0, 3);
  }, [agent, actions, incidents]);

  // Newest decision opens by default when the drawer switches agent.
  useEffect(() => {
    setExpanded(new Set(mine.length ? [mine[0].id] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  if (!agent) return null;
  const stateColor = agentStateColor(agent.state);
  const close = () => openAgent(null);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="fixed left-0 right-0 bottom-0 z-30" style={{ top: 'var(--status-h)' }} onClick={close}>
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <aside
        className="absolute top-0 bottom-0 right-0 w-[520px] bg-surface-raised border-l hairline shadow-2xl flex flex-col"
        role="dialog"
        aria-label={`${agent.name} agent detail`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b hairline shrink-0 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-20 font-medium agent-text leading-6">{agent.name}</h2>
              <span className="text-14 text-text-muted">{agent.role}</span>
              {agent.instances && (
                <span className="chip"><span className="mono">{agent.instances}</span> instances, shown as a group</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-12">
              <span className="dot" style={{ background: stateColor, boxShadow: agent.state !== 'watching' ? `0 0 6px ${stateColor}` : undefined }} />
              <span style={{ color: agent.state === 'watching' ? undefined : stateColor }}>{AGENT_STATE_LABEL[agent.state]}</span>
              <span className="text-text-muted">· <span className="mono">{(agent.actions24h + mine.length).toLocaleString('en-GB')}</span> actions in the last 24h</span>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <AutonomyControl agentId={agent.id} />
              <span className="text-11 text-text-muted">Changes are recorded in the audit log.</span>
            </div>
          </div>
          <button type="button" className="btn btn-sm shrink-0" onClick={close} autoFocus>
            Close <span className="kbd">Esc</span>
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-auto">
          <Section title="Now">
            <div className="inset px-3 py-2 text-14 leading-5">
              <StreamText text={agent.now} streamKey={agent.now} speed={18} className="agent-text" />
            </div>
          </Section>

          <Section title="Recent decisions" right={<span className="text-11 text-text-muted">{mine.length ? `${mine.length} this session` : 'From the incident record'}</span>}>
            {mine.length > 0 && (
              <ul className="inset overflow-hidden">
                {mine.map((a) => (
                  <DecisionRow key={a.id} action={a} open={expanded.has(a.id)} onToggle={() => toggle(a.id)} />
                ))}
              </ul>
            )}
            {historical.length > 0 && (
              <div className={mine.length ? 'mt-3' : ''}>
                {mine.length > 0 && <div className="text-11 text-text-muted mb-1">Earlier tonight, from the incident record</div>}
                <ul className="inset overflow-hidden">
                  {historical.map(({ event, incident }) => (
                    <li key={event.id} className="px-3 py-1.5 text-12 flex gap-2 items-baseline border-b hairline last:border-b-0">
                      <span className="mono text-text-muted shrink-0">{fmtTime(event.ts)}</span>
                      <span className="agent-text flex-1 min-w-0">{event.text}</span>
                      <button
                        type="button"
                        className="mono text-11 text-text-muted hover:text-text-primary shrink-0 underline-offset-2 hover:underline"
                        onClick={() => openIncident(incident.id)}
                        title={`Open ${incident.id}: ${incident.title}`}
                      >
                        {incident.id}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="text-11 text-text-muted mt-1.5">Full reasoning chains are kept for 90 days.</div>
              </div>
            )}
            {mine.length === 0 && historical.length === 0 && (
              <div className="inset px-3 py-3 text-12 text-text-muted">
                No decisions on record for {agent.name} in the last 24 hours. Routine work is logged in the activity feed and the audit log.
              </div>
            )}
          </Section>

          <Section title="Memory" right={<span className="text-11 text-text-muted">What {agent.name} knows about the camp</span>}>
            {agent.memory.length === 0 ? (
              <div className="inset px-3 py-3 text-12 text-text-muted">Nothing learned yet. Memory builds from confirmed outcomes.</div>
            ) : (
              <ul className="inset overflow-hidden">
                {agent.memory.map((m) => (
                  <li key={m.id} className="px-3 py-2 border-b hairline last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-14 text-text-primary">{m.subject}</div>
                      <div className="mono text-11 text-text-muted shrink-0" title="Confidence">{Math.round(m.confidence * 100)}%</div>
                    </div>
                    <div className="text-12 agent-text mt-0.5 leading-4">{m.fact}</div>
                    <div className="text-11 text-text-muted mt-1">Learned {learnedAgo(m.learnedAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Handoffs" right={<span className="text-11 text-text-muted">Click a node to switch</span>}>
            <div className="inset px-2 py-2">
              <HandoffFocus agents={agents} agentId={agent.id} onSelect={(id: AgentId) => openAgent(id)} />
            </div>
          </Section>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-12 text-text-muted">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ApprovalChip({ action }: { action: AgentAction }) {
  if (!action.approvalState) return null;
  const s = action.approvalState;
  const tone = s === 'pending' ? 'text-advisory' : 'text-text-primary';
  const label = s === 'pending' ? 'awaiting approval' : s === 'approved' ? 'approved' : action.declineReason?.startsWith('Withdrawn') ? 'withdrawn' : 'declined';
  return (
    <span className={`chip shrink-0 ${tone}`} style={s === 'pending' ? { borderColor: 'rgba(224,169,59,0.5)' } : undefined}>
      {label}
    </span>
  );
}

function DecisionRow({ action, open, onToggle }: { action: AgentAction; open: boolean; onToggle: () => void }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === action.agentId));
  return (
    <li className="border-b hairline last:border-b-0">
      <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-raised" onClick={onToggle} aria-expanded={open}>
        <span className="text-text-muted text-11 w-3 shrink-0" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="mono text-11 text-text-muted shrink-0">{fmtTime(action.ts)}</span>
        <span className="text-12 flex-1 min-w-0 truncate">{action.title}</span>
        <ApprovalChip action={action} />
      </button>
      {open && (
        <div className="px-3 pb-3 pl-8">
          <ReasoningChain action={action} compact />
          {agent && !action.atHigherAutonomy && (
            <div className="grid grid-cols-[110px_1fr] gap-2 text-12 mt-2">
              <div className="text-text-muted">At a higher autonomy level</div>
              <div className="agent-text">
                {agent.autonomy >= 3
                  ? 'No change. This agent already acts and notifies.'
                  : action.requiresApproval
                    ? `At ${AUTONOMY_LABELS[3]}, the same action would have run immediately and you would have been notified afterwards.`
                    : 'No change. This decision did not need a person at any level.'}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
