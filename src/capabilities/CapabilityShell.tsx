import type { ReactNode } from 'react';
import type { AgentId, CapabilityId, Detection } from '@/lib/types';
import { CAPABILITY_META } from '@/data/zones';
import { AgentChip } from '@/agents/AgentChip';
import { AutonomyControl } from '@/governance/AutonomyControl';
import { useStore } from '@/store/useStore';
import { fmtTime } from '@/lib/time';
import { agentName } from '@/data/agents';
import { SENSOR_BY_ID } from '@/data/sensors';

type Props = {
  capability: CapabilityId;
  /** one line: what this capability is doing right now (machine-authored → agent colour) */
  status: string;
  agentId?: AgentId;
  primary: ReactNode;
  /** left lower panel; defaults to the agent activity feed filtered to this agent */
  activity?: ReactNode;
  /** right lower panel; defaults to recent detections for the zone */
  detections?: ReactNode;
  headerRight?: ReactNode;
  /** hide the lower row entirely (e.g. when the primary surface has its own) */
  noLower?: boolean;
  lowerHeight?: number;
};

/**
 * Every capability follows the same shell so the build is repeatable:
 * header (name, agent chip, autonomy) → status line → primary surface → agent activity | recent detections.
 */
export function CapabilityShell({ capability, status, agentId, primary, activity, detections, headerRight, noLower, lowerHeight = 200 }: Props) {
  const meta = CAPABILITY_META[capability];
  const owner = agentId ?? meta.agentId;
  return (
    <div className="h-full flex flex-col min-h-0">
      <header className="flex items-center justify-between px-4 pt-2 pb-1.5 shrink-0 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-16 font-medium">{meta.name}</h2>
            <AgentChip agentId={owner} />
          </div>
          <div className="text-12 agent-text truncate mt-0.5">{status}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {headerRight}
          <AutonomyControl agentId={owner} compact />
        </div>
      </header>
      <div className="flex-1 min-h-0 px-4 pb-3 flex flex-col gap-3">
        <div className="flex-1 min-h-0 inset overflow-hidden">{primary}</div>
        {!noLower && (
          <div className="grid grid-cols-2 gap-3 shrink-0" style={{ height: lowerHeight }}>
            <div className="inset min-h-0 flex flex-col">
              <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Agent activity</div>
              <div className="flex-1 min-h-0 overflow-auto">{activity ?? <AgentActivity agentId={owner} />}</div>
            </div>
            <div className="inset min-h-0 flex flex-col">
              <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Recent detections</div>
              <div className="flex-1 min-h-0 overflow-auto">{detections ?? <RecentDetections />}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentActivity({ agentId, limit = 40 }: { agentId?: AgentId; limit?: number }) {
  const feed = useStore((s) => s.feed);
  const lines = (agentId ? feed.filter((f) => f.agentId === agentId || f.incidentId) : feed).slice(-limit).reverse();
  if (lines.length === 0) return <div className="p-3 text-12 text-text-muted">No activity yet.</div>;
  return (
    <ul className="divide-y divide-line/50">
      {lines.map((l) => (
        <li key={l.id} className="px-3 py-1 text-12 flex gap-2">
          <span className="mono text-text-muted shrink-0">{fmtTime(l.ts)}</span>
          <span className="agent-text"><span className="font-medium">{agentName(l.agentId)}</span> — {l.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function RecentDetections({ filter, limit = 40, onSelect }: { filter?: (d: Detection) => boolean; limit?: number; onSelect?: (d: Detection) => void }) {
  const detections = useStore((s) => s.detections);
  const zone = useStore((s) => s.selectedZoneId);
  const openIncident = useStore((s) => s.openIncident);
  const list = detections
    .filter((d) => (filter ? filter(d) : zone ? SENSOR_BY_ID[d.sensorId]?.zoneId === zone : true))
    .slice(-limit)
    .reverse();
  if (list.length === 0) return <div className="p-3 text-12 text-text-muted">No detections in this zone in the last 24 hours.</div>;
  return (
    <ul className="divide-y divide-line/50">
      {list.map((d) => (
        <li
          key={d.id}
          className={`px-3 py-1 text-12 flex items-center gap-2 ${d.incidentId || onSelect ? 'cursor-pointer hover:bg-surface-raised' : ''}`}
          onClick={() => (onSelect ? onSelect(d) : d.incidentId ? openIncident(d.incidentId) : undefined)}
        >
          <DetectionThumb d={d} />
          <span className="mono text-text-muted shrink-0">{fmtTime(d.ts)}</span>
          <span className="mono shrink-0">{d.sensorId}</span>
          <span className="truncate">{d.class}</span>
          <span className="mono text-text-muted shrink-0">{Math.round(d.confidence * 100)}%</span>
          <span className={`ml-auto shrink-0 ${d.disposition === 'dismissed' ? 'text-text-muted' : 'agent-text'}`}>{d.disposition === 'merged' ? `→ ${d.incidentId}` : d.disposition}</span>
        </li>
      ))}
    </ul>
  );
}

/** A tiny deterministic thumbnail: a dark frame with a box where the detection was. */
export function DetectionThumb({ d, size = 28 }: { d: Detection; size?: number }) {
  const b = d.bbox ?? [0.4, 0.4, 0.2, 0.3];
  const scene = SENSOR_BY_ID[d.sensorId]?.scene;
  return (
    <svg width={size * 1.6} height={size} viewBox="0 0 32 20" className="shrink-0 rounded-[2px] bg-surface-inset border hairline" aria-hidden>
      <rect x="0" y="0" width="32" height="20" fill="#0c151a" />
      {scene === 'thermal' ? <rect x="0" y="0" width="32" height="20" fill="#1c1c1c" /> : null}
      <line x1="0" y1="14" x2="32" y2="13" stroke="#243440" strokeWidth="0.6" />
      <rect x={b[0] * 32} y={b[1] * 20} width={b[2] * 32} height={b[3] * 20} fill="none" stroke="var(--agent)" strokeWidth="0.7" />
    </svg>
  );
}
