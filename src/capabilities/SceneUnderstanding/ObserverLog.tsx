import { StreamText } from '@/ui/StreamText';
import { fmtTime } from '@/lib/time';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import type { LogEntry } from './scene';

type Props = { entries: LogEntry[]; live: boolean; onDone: (id: string) => void };

/**
 * Reads like an observer's log: timestamped descriptions in agent colour, the duty officer's questions in
 * plain text, Trace's answers streamed in. Newest at the bottom; column-reverse keeps it pinned there.
 */
export function ObserverLog({ entries, live, onDone }: Props) {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0 flex items-center justify-between">
        <span>Observer's log · Trace</span>
        <span className="flex items-center gap-1.5 text-11">
          <span className="dot" style={{ background: live ? 'var(--agent)' : 'var(--text-muted)', boxShadow: live ? '0 0 6px var(--agent)' : undefined }} />
          {live ? 'live, incident feed' : 'rolling pass'}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-12 text-text-muted p-4 text-center">Trace is describing the scene…</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto flex flex-col-reverse px-3 py-2 gap-2" aria-live="polite">
          {entries.slice().reverse().map((e) => <Entry key={e.id} e={e} onDone={onDone} />)}
        </div>
      )}
    </div>
  );
}

function Entry({ e, onDone }: { e: LogEntry; onDone: (id: string) => void }) {
  const stamp = <span className="mono text-text-muted">{fmtTime(e.ts)}</span>;
  if (e.kind === 'question') {
    return (
      <div className="text-12 text-text-primary">
        {stamp} <span className="text-text-muted">— {DUTY_OFFICER}:</span> {e.text}
      </div>
    );
  }
  const text = e.note ? `${e.note}\n\n${e.text}` : e.text;
  return (
    <div className="text-12 agent-text">
      {stamp}
      {e.cameraId && <span className="mono text-text-muted"> · {e.cameraId}</span>}
      <span className="text-text-muted"> — </span>
      {e.stream ? (
        <StreamText text={text} speed={e.kind === 'answer' ? 30 : 22} streamKey={e.streamKey} onDone={() => onDone(e.id)} />
      ) : (
        <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
      )}
    </div>
  );
}
