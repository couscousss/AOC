import { useId } from 'react';
import type { Agent, AgentId } from '@/lib/types';
import { agentStateColor } from '@/ui/bits';

/**
 * Small SVG node diagrams of who hands work to whom.
 * Nodes are rounded boxes carrying the agent name; arrows follow `handoffTo`.
 * Everything drawn here describes machine behaviour, so it sits in the agent colour.
 */

type Pt = { x: number; y: number };

const EDGE_STROKE = 'rgba(79,209,197,0.55)';

/** Point on the boundary of an axis-aligned box (centre c, half extents hw/hh) in direction u. */
function boundary(c: Pt, u: Pt, hw: number, hh: number): Pt {
  const tx = u.x !== 0 ? hw / Math.abs(u.x) : Infinity;
  const ty = u.y !== 0 ? hh / Math.abs(u.y) : Infinity;
  const t = Math.min(tx, ty);
  return { x: c.x + u.x * t, y: c.y + u.y * t };
}

/** Straight edge, or a gentle arc when the reverse edge also exists so the pair stays readable. */
function edgePath(a: Pt, b: Pt, bidirectional: boolean, aw: number, ah: number, bw: number, bh: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x };
  const side = bidirectional ? 5 : 0;
  const start = boundary(a, u, aw, ah);
  const end = boundary(b, { x: -u.x, y: -u.y }, bw, bh);
  const s = { x: start.x + n.x * side + u.x * 1.5, y: start.y + n.y * side + u.y * 1.5 };
  const e = { x: end.x + n.x * side - u.x * 1.5, y: end.y + n.y * side - u.y * 1.5 };
  if (!bidirectional) return `M${s.x.toFixed(1)},${s.y.toFixed(1)} L${e.x.toFixed(1)},${e.y.toFixed(1)}`;
  const m = { x: (s.x + e.x) / 2 + n.x * 14, y: (s.y + e.y) / 2 + n.y * 14 };
  return `M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${m.x.toFixed(1)},${m.y.toFixed(1)} ${e.x.toFixed(1)},${e.y.toFixed(1)}`;
}

function ArrowDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="7.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M0,0.5 L8,4 L0,7.5 z" fill="var(--agent)" opacity="0.85" />
      </marker>
    </defs>
  );
}

function Node({ agent, c, w, h, focus, onSelect }: { agent: Agent; c: Pt; w: number; h: number; focus?: boolean; onSelect?: (id: AgentId) => void }) {
  const state = agentStateColor(agent.state);
  const interactive = !!onSelect && !focus;
  return (
    <g
      transform={`translate(${(c.x - w / 2).toFixed(1)}, ${(c.y - h / 2).toFixed(1)})`}
      className={interactive ? 'cursor-pointer' : undefined}
      onClick={interactive ? () => onSelect(agent.id) : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(agent.id); } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${agent.name}, ${agent.role}. Open agent detail.` : `${agent.name}, ${agent.role}`}
    >
      <title>{interactive ? `${agent.name} · ${agent.role}. Open agent detail.` : `${agent.name} · ${agent.role}`}</title>
      <rect width={w} height={h} rx={3} fill={focus ? 'rgba(79,209,197,0.10)' : 'var(--surface-inset)'} stroke={focus ? 'var(--agent)' : 'rgba(79,209,197,0.45)'} strokeWidth={focus ? 1.5 : 1} />
      <circle cx={10} cy={h / 2} r={3} fill={state} style={agent.state !== 'watching' ? { filter: `drop-shadow(0 0 3px ${state})` } : undefined} />
      <text x={18} y={h / 2 + 4} fontSize={11} fill="var(--agent)" fontFamily="inherit" fontWeight={focus ? 600 : 500}>
        {agent.name}
      </text>
    </g>
  );
}

/* ---------- Overview: all eight agents ---------- */

const NODE_W = 78;
const NODE_H = 22;
const OVERVIEW_W = 600;
const OVERVIEW_H = 214;

/** Hand-placed so the pipeline reads left to right: perception → triage → investigation/supervision → response → output. */
const OVERVIEW_POS: Record<AgentId, Pt> = {
  sentry: { x: 62, y: 108 },
  sift: { x: 177, y: 108 },
  trace: { x: 297, y: 46 },
  overwatch: { x: 297, y: 170 },
  warden: { x: 417, y: 108 },
  dispatch: { x: 417, y: 188 },
  scribe: { x: 537, y: 58 },
  fitter: { x: 537, y: 188 },
};

export function HandoffOverview({ agents, onSelect, className = '' }: { agents: Agent[]; onSelect?: (id: AgentId) => void; className?: string }) {
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const byId = new Map(agents.map((a) => [a.id, a]));
  const edges: { from: AgentId; to: AgentId }[] = [];
  for (const a of agents) for (const to of a.handoffTo) if (byId.has(to)) edges.push({ from: a.id, to });
  const has = (from: AgentId, to: AgentId) => edges.some((e) => e.from === from && e.to === to);

  return (
    <svg viewBox={`0 0 ${OVERVIEW_W} ${OVERVIEW_H}`} className={`w-full h-auto ${className}`} role="img" aria-label="Handoffs between the eight agents">
      <ArrowDefs id={markerId} />
      {edges.map((e) => (
        <path
          key={`${e.from}-${e.to}`}
          d={edgePath(OVERVIEW_POS[e.from], OVERVIEW_POS[e.to], has(e.to, e.from), NODE_W / 2, NODE_H / 2, NODE_W / 2, NODE_H / 2)}
          fill="none"
          stroke={EDGE_STROKE}
          strokeWidth={1.2}
          markerEnd={`url(#${markerId})`}
        />
      ))}
      {agents.map((a) => (
        <Node key={a.id} agent={a} c={OVERVIEW_POS[a.id]} w={NODE_W} h={NODE_H} onSelect={onSelect} />
      ))}
    </svg>
  );
}

/* ---------- Focus: one agent, upstream on the left, downstream on the right ---------- */

const FOCUS_W = 470;
const ROW_H = 38;
const TOP_PAD = 24;
const SIDE_X = 78;
const SIDE_W = 100;
const SIDE_H = 22;
const CENTRE_W = 112;
const CENTRE_H = 26;

export function HandoffFocus({ agents, agentId, onSelect, className = '' }: { agents: Agent[]; agentId: AgentId; onSelect?: (id: AgentId) => void; className?: string }) {
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const me = agents.find((a) => a.id === agentId);
  if (!me) return null;
  const incoming = agents.filter((a) => a.id !== agentId && a.handoffTo.includes(agentId));
  const outgoing = me.handoffTo.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => !!a);
  const rows = Math.max(1, incoming.length, outgoing.length);
  const height = TOP_PAD + rows * ROW_H + 6;
  const centre: Pt = { x: FOCUS_W / 2, y: TOP_PAD + (rows * ROW_H) / 2 };
  const rowY = (i: number, count: number) => TOP_PAD + ROW_H / 2 + i * ROW_H + ((rows - count) * ROW_H) / 2;

  return (
    <svg viewBox={`0 0 ${FOCUS_W} ${height}`} className={`w-full h-auto ${className}`} role="img" aria-label={`${me.name} handoffs`}>
      <ArrowDefs id={markerId} />
      <text x={SIDE_X} y={11} fontSize={11} fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">Receives from</text>
      <text x={FOCUS_W - SIDE_X} y={11} fontSize={11} fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">Hands off to</text>

      {incoming.map((a, i) => {
        const c = { x: SIDE_X, y: rowY(i, incoming.length) };
        return (
          <path
            key={`in-${a.id}`}
            d={edgePath(c, centre, me.handoffTo.includes(a.id), SIDE_W / 2, SIDE_H / 2, CENTRE_W / 2, CENTRE_H / 2)}
            fill="none" stroke={EDGE_STROKE} strokeWidth={1.2} markerEnd={`url(#${markerId})`}
          />
        );
      })}
      {outgoing.map((a, i) => {
        const c = { x: FOCUS_W - SIDE_X, y: rowY(i, outgoing.length) };
        return (
          <path
            key={`out-${a.id}`}
            d={edgePath(centre, c, a.handoffTo.includes(agentId), CENTRE_W / 2, CENTRE_H / 2, SIDE_W / 2, SIDE_H / 2)}
            fill="none" stroke={EDGE_STROKE} strokeWidth={1.2} markerEnd={`url(#${markerId})`}
          />
        );
      })}

      {incoming.length === 0 && (
        <text x={SIDE_X} y={centre.y} fontSize={11} fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">
          <tspan x={SIDE_X} dy="-3">Nothing upstream.</tspan>
          <tspan x={SIDE_X} dy="14">The pipeline starts here.</tspan>
        </text>
      )}
      {outgoing.length === 0 && (
        <text x={FOCUS_W - SIDE_X} y={centre.y} fontSize={11} fill="var(--text-muted)" textAnchor="middle" fontFamily="inherit">
          <tspan x={FOCUS_W - SIDE_X} dy="-3">Nothing downstream.</tspan>
          <tspan x={FOCUS_W - SIDE_X} dy="14">{me.name} writes for people.</tspan>
        </text>
      )}

      {incoming.map((a, i) => (
        <Node key={`n-in-${a.id}`} agent={a} c={{ x: SIDE_X, y: rowY(i, incoming.length) }} w={SIDE_W} h={SIDE_H} onSelect={onSelect} />
      ))}
      {outgoing.map((a, i) => (
        <Node key={`n-out-${a.id}`} agent={a} c={{ x: FOCUS_W - SIDE_X, y: rowY(i, outgoing.length) }} w={SIDE_W} h={SIDE_H} onSelect={onSelect} />
      ))}
      <Node agent={me} c={centre} w={CENTRE_W} h={CENTRE_H} focus />
    </svg>
  );
}
