import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Agent, AgentId } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { AGENT_STATE_LABEL, agentStateColor, Sparkline, Stat } from '@/ui/bits';
import { HandoffOverview } from './HandoffDiagram';

const EXPLAINER =
  'Eight agents. Sentry sees, Sift decides what you see, Trace investigates, Dispatch tasks, Warden responds within its autonomy level, Scribe writes, Fitter maintains, Overwatch supervises.';

const fmtCount = (n: number) => n.toLocaleString('en-GB');

/** Global view: the roster grid, the handoff map, and the numbers that say how much of the night the agents carried. */
export function AgentRoster() {
  const agents = useStore((s) => s.agents);
  const actions = useStore((s) => s.actions);
  const kpi = useStore((s) => s.kpi);
  const openAgent = useStore((s) => s.openAgent);

  const liveByAgent = useMemo(() => {
    const m: Partial<Record<AgentId, number>> = {};
    for (const a of actions) m[a.agentId] = (m[a.agentId] ?? 0) + 1;
    return m;
  }, [actions]);
  const pending = useMemo(() => actions.filter((a) => a.approvalState === 'pending').length, [actions]);
  const total24h = agents.reduce((n, a) => n + a.actions24h, 0) + actions.length;
  const busy = agents.filter((a) => a.state !== 'watching');

  return (
    <div className="h-full min-h-0 flex flex-col p-4 gap-3">
      <header className="shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-20 font-medium">Agents</h1>
          <div className="text-12 text-text-muted">
            {busy.length === 0
              ? 'All eight watching. Nothing is waiting on a person.'
              : `${busy.length} of 8 active: ${busy.map((a) => `${a.name} ${AGENT_STATE_LABEL[a.state]}`).join(', ')}.`}
          </div>
        </div>
        <p className="text-12 text-text-muted mt-0.5 max-w-[1100px]">{EXPLAINER}</p>
      </header>

      <div className="shrink-0 grid grid-cols-[1fr_300px] gap-3">
        <section className="panel flex flex-col min-h-0" aria-label="Handoff overview">
          <header className="flex items-center justify-between px-3 py-1.5 border-b hairline">
            <div className="text-12 text-text-muted">Handoffs</div>
            <div className="text-11 text-text-muted">Arrows show who passes work to whom. Click a node to open the agent.</div>
          </header>
          <div className="px-3 py-1.5">
            <HandoffOverview agents={agents} onSelect={openAgent} className="max-h-[196px]" />
          </div>
        </section>
        <section className="panel p-3 grid grid-cols-2 gap-x-3 gap-y-3 content-start" aria-label="Agent layer summary">
          <Stat label="Actions in the last 24h" value={<span className="mono">{fmtCount(total24h)}</span>} sub="Across all eight agents" />
          <Stat label="Resolved without a person" value={<span className="mono">{kpi.autoResolvedPct.toFixed(1)}%</span>} sub="Sift's dismissal rate, 24h" tone="agent" />
          <Stat label="Awaiting your decision" value={<span className="mono">{pending}</span>} sub={pending ? 'Open the approval queue' : 'Nothing pending'} tone={pending ? 'advisory' : undefined} />
          <Stat label="Autonomous agents" value={<span className="mono">{agents.filter((a) => a.autonomy === 3).length} of 8</span>} sub="Set per agent in Governance" />
        </section>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-4 gap-3 auto-rows-fr">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} live={liveByAgent[a.id] ?? 0} onOpen={() => openAgent(a.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent: a, live, onOpen }: { agent: Agent; live: number; onOpen: () => void }) {
  const stateColor = agentStateColor(a.state);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel text-left flex flex-col min-h-0 p-3 gap-2 hover:bg-[#1a2731]"
      style={{ borderColor: a.state !== 'watching' ? 'rgba(79,209,197,0.35)' : undefined }}
      aria-label={`${a.name}, ${a.role}. Open agent detail.`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-16 font-medium agent-text leading-5">{a.name}</div>
          <div className="text-12 text-text-muted">{a.role}</div>
        </div>
        {a.instances && (
          <span className="chip shrink-0" title="Sentry runs one instance per sensor class. The roster shows them as one agent.">
            <span className="mono">{a.instances}</span> instances, shown as a group
          </span>
        )}
      </div>

      <p className="text-12 text-text-muted leading-4" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {a.description}
      </p>

      <div className="inset px-2 py-1.5 text-12 agent-text leading-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={a.now}>
        {a.now}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 text-12">
        <div>
          <div className="label">State</div>
          <div className="flex items-center gap-1.5">
            <span className="dot" style={{ background: stateColor, boxShadow: a.state !== 'watching' ? `0 0 6px ${stateColor}` : undefined }} />
            <span style={{ color: a.state === 'watching' ? undefined : stateColor }}>{AGENT_STATE_LABEL[a.state]}</span>
          </div>
        </div>
        <div>
          <div className="label">Autonomy</div>
          <div className={a.autonomy === 3 ? 'text-advisory' : ''}>{AUTONOMY_LABELS[a.autonomy]}</div>
        </div>
        <div>
          <div className="label">Actions, 24h</div>
          <div className="mono text-16 leading-5">{(a.actions24h + live).toLocaleString('en-GB')}</div>
        </div>
        <div>
          <div className="label">Activity, hourly</div>
          <Sparkline data={a.activity} width={110} height={22} className="block" />
        </div>
      </div>
    </button>
  );
}
