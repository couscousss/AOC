import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { runCommand, applyGo } from './commands';
import type { CommandResult } from '@/lib/types';
import { COMMAND_SUGGESTIONS } from '@/data/copy';
import { StreamText } from '@/ui/StreamText';
import { CctvFeed } from '@/ui/CctvFeed';
import { fmtTime } from '@/lib/time';

/** Persistent input strip at the bottom + the ⌘K modal. */
export function CommandBar() {
  const open = useStore((s) => s.commandOpen);
  const setOpen = useStore((s) => s.setCommandOpen);
  return (
    <>
      <div className="h-[var(--command-h)] shrink-0 border-t hairline bg-surface-raised flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 h-8 inset flex items-center gap-3 px-3 text-left text-14 text-text-muted hover:border-agent/40"
          aria-label="Open command bar"
        >
          <span className="kbd">⌘K</span>
          <span>Ask anything about the camp…</span>
        </button>
      </div>
      {open && <CommandModal onClose={() => setOpen(false)} />}
    </>
  );
}

function CommandModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [key, setKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pushAudit = useStore((s) => s.pushAudit);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (text: string) => {
    const r = runCommand(text);
    setResult(r);
    setKey((k) => k + 1);
    setQ(text);
    pushAudit({ actor: 'Sgt K. Adeyemi', actorKind: 'human', action: 'Command bar query', target: text, record: { kind: r.kind } });
    if (r.kind === 'nav' && r.go) {
      setTimeout(() => { applyGo(r.go!); onClose(); }, 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose} role="dialog" aria-label="Command bar">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative panel w-[720px] max-w-[92vw] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => { e.preventDefault(); submit(q); }}
          className="flex items-center gap-3 px-4 h-14 border-b hairline"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="go to motor pool · what is Kestrel-2 doing · vehicles through Gate 2 after 2200"
            className="flex-1 bg-transparent outline-none text-16 placeholder:text-text-muted"
            aria-label="Command"
          />
          <span className="kbd">Esc</span>
        </form>
        {!result ? (
          <div className="p-3">
            <div className="text-12 text-text-muted px-1 pb-1">Suggested</div>
            <ul>
              {COMMAND_SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => submit(s)} className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-inset text-14">{s}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 max-h-[60vh] overflow-auto">
            <div className="text-12 text-text-muted mb-1">{result.kind === 'nav' ? 'Navigating' : result.kind === 'search' ? 'Retrospective search' : result.kind === 'report' ? 'Scribe' : result.kind === 'status' ? 'Status' : 'Response'}</div>
            <div className="text-16 font-medium mb-2">{result.title}</div>
            {result.body && (
              <div className="agent-text text-14 mb-3">
                <StreamText text={result.body} speed={result.body.length > 300 ? 6 : 14} streamKey={key} />
              </div>
            )}
            {result.items && result.items.length > 0 && (
              result.kind === 'search' ? (
                <div className="grid grid-cols-2 gap-3">
                  {result.items.map((it, i) => (
                    <div key={i} className="inset overflow-hidden">
                      {it.scene && <CctvFeed sensorId={it.label.split(' · ')[0]} scene={it.scene} showBoxes={false} compact seedOffset={i} />}
                      <div className="px-2 py-1.5">
                        <div className="text-12">{it.label}</div>
                        <div className="text-11 text-text-muted">{it.ts ? <span className="mono">{fmtTime(it.ts)} · </span> : null}{it.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {result.items.map((it, i) => (
                    <li key={i}>
                      <button type="button" className="w-full text-left px-2 py-1 rounded hover:bg-surface-inset" onClick={() => (result.kind === 'fallback' ? submit(it.label) : result.go && (applyGo(result.go), onClose()))}>
                        <div className="text-14">{it.label}</div>
                        {it.sub && <div className="text-11 text-text-muted">{it.sub}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
            {result.go && result.kind !== 'nav' && (
              <div className="mt-3">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { applyGo(result.go!); onClose(); }}>Open</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
