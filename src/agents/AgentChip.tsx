import type { AgentId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { AGENT_STATE_LABEL, agentStateColor } from '@/ui/bits';

/** Live pill: which agent owns this, its state, click → agent drawer. */
export function AgentChip({ agentId, className = '' }: { agentId: AgentId; className?: string }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const openAgent = useStore((s) => s.openAgent);
  if (!agent) return null;
  const color = agentStateColor(agent.state);
  return (
    <button
      type="button"
      onClick={() => openAgent(agentId)}
      className={`chip hover:bg-surface-inset ${className}`}
      style={{ borderColor: 'rgba(79,209,197,0.35)' }}
      title={`${agent.name} — ${agent.role}. Open agent detail.`}
    >
      <span className="dot" style={{ background: color, boxShadow: agent.state !== 'watching' ? `0 0 6px ${color}` : undefined }} />
      <span className="agent-text font-medium">{agent.name}</span>
      <span className="text-text-muted">{AGENT_STATE_LABEL[agent.state]}</span>
    </button>
  );
}
