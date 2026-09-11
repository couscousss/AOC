import { useEffect, useMemo, useRef, useState } from 'react';
import type { Incident } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { StreamText } from '@/ui/StreamText';
import { AgentChip } from '@/agents/AgentChip';
import { EmptyState } from '@/ui/bits';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { demoNow, fmtDateTime } from '@/lib/time';

type Block = { kind: 'h1' | 'h2' | 'p'; text: string; start: number; end: number };

/** Markdown-ish: `# ` title, `## ` section headings, blank-line separated paragraphs. Offsets index into the source string. */
export function parseReport(report: string): Block[] {
  const blocks: Block[] = [];
  const lines = report.split('\n');
  let offset = 0;
  let para: { start: number; parts: string[] } | null = null;
  const flush = () => {
    if (para) {
      const text = para.parts.join('\n');
      blocks.push({ kind: 'p', text, start: para.start, end: para.start + text.length });
      para = null;
    }
  };
  for (const line of lines) {
    if (line.trim() === '') flush();
    else if (line.startsWith('## ')) { flush(); blocks.push({ kind: 'h2', text: line.slice(3), start: offset + 3, end: offset + line.length }); }
    else if (line.startsWith('# ')) { flush(); blocks.push({ kind: 'h1', text: line.slice(2), start: offset + 2, end: offset + line.length }); }
    else {
      if (!para) para = { start: offset, parts: [] };
      para.parts.push(line);
    }
    offset += line.length + 1;
  }
  flush();
  return blocks;
}

const lastSectionStart = (report: string) => {
  const i = report.lastIndexOf('\n## ');
  return i === -1 ? 0 : i + 1;
};

type Stream = { settled: number; idx: number };
type Last = { id: string; report: string };

/**
 * Decide what to keep and what to stream.
 * New incident or rewritten report: closed incidents render instantly, a live one streams its last section.
 * Report grew: keep everything already rendered, stream only the appended diff.
 */
function nextStream(prev: Last, incident: Incident, report: string): Stream {
  const fresh = prev.id !== incident.id || !report.startsWith(prev.report);
  const settled = fresh
    ? incident.state === 'closed' ? report.length : lastSectionStart(report)
    : report.length > prev.report.length ? prev.report.length : report.length;
  const blocks = parseReport(report);
  const first = blocks.findIndex((b) => b.end > settled);
  return { settled, idx: first === -1 ? blocks.length : first };
}

const STREAM_SPEED = 12;

/** Scribe's report. Machine-authored, so the body is in --agent; it writes itself as the incident develops. */
export function IncidentReport({ incident }: { incident: Incident }) {
  const pushAudit = useStore((s) => s.pushAudit);
  const toast = useStore((s) => s.toast);
  const report = incident.report ?? '';
  const blocks = useMemo(() => parseReport(report), [report]);

  const lastRef = useRef<Last>({ id: '', report: '' });
  const [st, setSt] = useState<Stream & { key: number }>(() => {
    const s = nextStream(lastRef.current, incident, report);
    lastRef.current = { id: incident.id, report };
    return { ...s, key: 0 };
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const prev = lastRef.current;
    if (prev.id === incident.id && prev.report === report) return;
    const s = nextStream(prev, incident, report);
    lastRef.current = { id: incident.id, report };
    stickRef.current = true;
    setSt((old) => ({ ...s, key: old.key + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident.id, report]);

  const streaming = st.idx < blocks.length;

  // Keep the newest words in view while Scribe is writing, unless the reader has scrolled up.
  useEffect(() => {
    if (!streaming) return;
    const id = window.setInterval(() => {
      const el = scrollRef.current;
      if (el && stickRef.current) el.scrollTop = el.scrollHeight;
    }, 120);
    return () => window.clearInterval(id);
  }, [streaming]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
  };

  const onBlockDone = () =>
    setSt((s) => {
      const idx = s.idx + 1;
      return { ...s, idx, settled: idx >= blocks.length ? report.length : s.settled };
    });

  const words = useMemo(() => (report ? report.split(/\s+/).filter(Boolean).length : 0), [report]);
  const sections = useMemo(() => blocks.filter((b) => b.kind === 'h2').length, [blocks]);

  const note = !report
    ? 'nothing written yet'
    : incident.state === 'open'
      ? 'draft, streaming in as events resolve'
      : streaming
        ? 'finishing the final sections'
        : incident.state === 'contained'
          ? 'complete · awaiting signature'
          : 'complete';

  const exportReport = () => {
    if (!report) return;
    const file = `${incident.id}-report.md`;
    const footer = `\n\n---\nExported ${fmtDateTime(demoNow())} by ${DUTY_OFFICER}. Drafted by Scribe; unsigned.\n`;
    const blob = new Blob([report + footer], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Exported incident report', target: incident.id, record: { file, words, sections, state: incident.state } });
    toast(`${file} exported. Recorded in the audit log.`, 'human');
  };

  return (
    <section className="panel h-full flex flex-col min-h-0" aria-label="Scribe's report">
      <header className="flex items-center justify-between px-4 py-1.5 border-b hairline shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-12 text-text-muted shrink-0">Scribe's report</div>
          <AgentChip agentId="scribe" />
          <div className="text-11 text-text-muted truncate">{note}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {report && (
            <span className="mono text-11 text-text-muted">
              {words} words · {sections} section{sections === 1 ? '' : 's'}
            </span>
          )}
          <button type="button" className="btn btn-sm" onClick={exportReport} disabled={!report} title={report ? `Download ${incident.id}-report.md and record the export` : 'Nothing to export yet'}>
            Export .md
          </button>
        </div>
      </header>
      {report ? (
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-auto px-5 py-3">
          <div className="max-w-[92ch] space-y-2">
            {blocks.map((b, i) => {
              if (i > st.idx) return null;
              const settledChars = Math.max(0, Math.min(b.text.length, st.settled - b.start));
              const isStreaming = i === st.idx && settledChars < b.text.length;
              const head = b.text.slice(0, settledChars);
              const tail = b.text.slice(settledChars);
              const Tag = (b.kind === 'h1' ? 'h3' : b.kind === 'h2' ? 'h4' : 'p') as 'h3' | 'h4' | 'p';
              const cls = b.kind === 'h1' ? 'text-16 font-medium text-text-primary' : b.kind === 'h2' ? 'text-14 font-medium text-text-primary pt-2' : 'text-14 leading-5 agent-text';
              return (
                <Tag key={`${b.kind}-${b.start}`} className={cls} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {head}
                  {isStreaming ? <StreamText text={tail} speed={STREAM_SPEED} streamKey={`${st.key}-${i}`} onDone={onBlockDone} /> : tail}
                </Tag>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState title="Nothing written yet" body="Scribe starts writing when Sift opens the incident. Sections arrive as events resolve, and the finished report is ready to export and sign." />
      )}
    </section>
  );
}
