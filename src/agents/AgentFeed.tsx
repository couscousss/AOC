import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { AgentId } from '@/lib/types';
import { fmtTime } from '@/lib/time';
import { agentName } from '@/data/agents';

const STICK_THRESHOLD = 32;

/**
 * The global agent activity feed. Overlay on the right of the stage; App mounts it when `feedOpen` is true.
 * Every line is machine-authored, so every line is in the agent colour.
 */
export function AgentFeed() {
  const feed = useStore((s) => s.feed);
  const agents = useStore((s) => s.agents);
  const setFeedOpen = useStore((s) => s.setFeedOpen);
  const openIncident = useStore((s) => s.openIncident);

  const [filter, setFilter] = useState<AgentId | 'all'>('all');
  const [stuck, setStuck] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stuckRef = useRef(true);

  const lines = useMemo(() => (filter === 'all' ? feed : feed.filter((l) => l.agentId === filter)), [feed, filter]);
  const lastId = lines.length ? lines[lines.length - 1].id : null;

  const jump = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stuckRef.current = true;
    setStuck(true);
    setUnseen(0);
  }, []);

  // Changing the filter always lands at the newest line.
  useLayoutEffect(() => { jump(); }, [filter, jump]);

  // New lines: follow if the reader is at the bottom, otherwise count them for the pill.
  useLayoutEffect(() => {
    if (!lastId) return;
    if (stuckRef.current) jump();
    else setUnseen((n) => n + 1);
  }, [lastId, jump]);

  useEffect(() => { jump(); }, [jump]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
    stuckRef.current = atBottom;
    setStuck(atBottom);
    if (atBottom) setUnseen(0);
  };

  return (
    <aside
      className="absolute top-0 bottom-0 right-0 w-[360px] z-20 bg-surface-raised border-l hairline shadow-2xl flex flex-col"
      role="complementary"
      aria-label="Agent activity feed"
    >
      <header className="px-3 pt-2 pb-1.5 border-b hairline shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-12 text-text-muted">
            Agent activity · <span className="mono text-text-primary">{lines.length}</span> lines
            {filter !== 'all' && <span> · {agentName(filter)} only</span>}
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setFeedOpen(false)} title="Close the feed">Close</button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5" role="group" aria-label="Filter by agent">
          <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
          {agents.map((a) => (
            <button key={a.id} type="button" className="chip" aria-pressed={filter === a.id} onClick={() => setFilter(a.id)}>
              <span className={filter === a.id ? 'agent-text' : ''}>{a.name}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          {lines.length === 0 ? (
            <div className="p-4 text-12 text-text-muted">
              {filter === 'all' ? 'No activity yet. Lines appear here as agents work.' : `${agentName(filter)} has not written to the feed yet.`}
            </div>
          ) : (
            <ul>
              {lines.map((l) => (
                <li key={l.id} className="px-3 py-1 text-12 leading-4 agent-text flex gap-2 items-baseline border-b" style={{ borderColor: 'rgba(36,52,64,0.5)' }}>
                  <span className="mono text-11 shrink-0 opacity-70">{fmtTime(l.ts)}</span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="font-semibold">{agentName(l.agentId)}</span> {l.text}
                  </span>
                  {l.incidentId && (
                    <button
                      type="button"
                      className="mono text-[10px] leading-4 px-1 rounded border shrink-0 opacity-80 hover:opacity-100"
                      style={{ borderColor: 'rgba(79,209,197,0.35)' }}
                      onClick={() => openIncident(l.incidentId!)}
                      title={`Open ${l.incidentId}`}
                    >
                      {l.incidentId}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!stuck && (
          <button
            type="button"
            onClick={jump}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 chip bg-surface-raised shadow-lg hover:bg-surface-inset"
            style={{ borderColor: 'rgba(79,209,197,0.5)', color: 'var(--text-primary)' }}
          >
            Jump to latest{unseen > 0 ? ` · ${unseen} new` : ''}
          </button>
        )}
      </div>
    </aside>
  );
}
