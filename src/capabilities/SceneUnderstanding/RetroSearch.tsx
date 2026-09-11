import { useState, type FormEvent } from 'react';
import { useStore } from '@/store/useStore';
import { CctvFeed } from '@/ui/CctvFeed';
import { StreamText } from '@/ui/StreamText';
import { fmtDateTime } from '@/lib/time';
import { ACCESS } from '@/data/facilities';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import type { RetroResult } from '@/data/copy';
import { runRetro, cameraForScene, RETRO_EXAMPLES, type RetroOutcome } from './scene';

type Props = { picked: RetroResult | null; onPick: (r: RetroResult | null, index: number) => void };

const PLACEHOLDER = 'show me every vehicle that entered Gate 2 after 2200 and did not leave';

/** Retrospective search over 30 days of ANPR reads, person tracks and door events. Results are instant; the summary streams. */
export function RetroSearch({ picked, onPick }: Props) {
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const addToWatchList = useStore((s) => s.addToWatchList);
  const toast = useStore((s) => s.toast);
  const watchList = useStore((s) => s.watchList);

  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<(RetroOutcome & { key: number; query: string }) | null>(null);

  const run = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const o = runRetro(q);
    setOutcome({ ...o, key: (outcome?.key ?? 0) + 1, query: q });
    setQuery(q);
    onPick(null, -1);
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Retrospective search', target: 'Archive, last 30 days', record: { query: q, matched: o.matched, results: o.results.length, ms: o.ms } });
    pushFeed('trace', o.matched
      ? `Retrospective search "${q}": ${o.results.length} result${o.results.length === 1 ? '' : 's'} across ANPR, person tracks and door events in ${(o.ms / 1000).toFixed(1)}s.`
      : `Retrospective search "${q}": no index matched. Asked the duty officer to narrow it to a vehicle, gate, time window or plate.`);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); run(query); };

  const onAllowList = (plate: string) => ACCESS.allowList.some((a) => a.plate === plate);
  const onWatch = (plate: string) => watchList.some((w) => w.plate === plate);
  const watch = (r: RetroResult) => {
    if (!r.plate || !outcome) return;
    const reason = `Retrospective search by ${DUTY_OFFICER}: ${outcome.title}`;
    addToWatchList(r.plate, reason);
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Added to watch list', target: r.plate, record: { reason } });
    toast(`${r.plate} added to the watch list. Recorded under your name.`, 'human');
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-1.5 border-b hairline text-12 text-text-muted shrink-0">Retrospective search · 30 days</div>
      <form onSubmit={submit} className="px-3 pt-2 flex gap-1.5 shrink-0">
        <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={PLACEHOLDER} aria-label="Retrospective search" />
        <button type="submit" className="btn btn-sm btn-primary shrink-0">Search</button>
      </form>

      <div className="flex-1 min-h-0 overflow-auto px-3 py-2">
        {!outcome ? (
          <div className="text-12">
            <div className="agent-text">I can search the last 30 days across ANPR reads, person tracks and door events. Try a vehicle, a gate, a time window, or a plate.</div>
            <div className="text-11 text-text-muted mt-2 mb-1">Try</div>
            <div className="flex flex-col gap-1 items-start">
              {RETRO_EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="chip max-w-full" onClick={() => run(ex)}><span className="truncate">{ex}</span></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-12">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate" title={outcome.title}>{outcome.title}</div>
              <div className="mono text-11 text-text-muted shrink-0">{outcome.matched ? `${outcome.results.length} hits` : 'no index'} · {(outcome.ms / 1000).toFixed(2)}s</div>
            </div>
            <div className="agent-text mt-1">
              <StreamText text={outcome.summary} speed={18} streamKey={outcome.key} />
            </div>
            {outcome.results.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5" aria-label="Search results">
                {outcome.results.map((r, i) => {
                  const selected = picked === r;
                  return (
                    <li key={`${outcome.key}-${i}`} className="flex gap-2 items-stretch">
                      <button
                        type="button"
                        className="flex gap-2 items-start flex-1 min-w-0 text-left rounded-[3px] p-1 hover:bg-surface-raised"
                        aria-pressed={selected}
                        style={selected ? { boxShadow: '0 0 0 1px var(--agent)' } : undefined}
                        onClick={() => onPick(selected ? null : r, i)}
                        title={selected ? 'Back to the live camera' : 'Review this clip in the camera view'}
                      >
                        <CctvFeed sensorId={cameraForScene(r.scene)} scene={r.scene} compact showBoxes={false} seedOffset={i + 1} className="w-24 shrink-0 rounded-[2px]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{r.label}</div>
                          <div className="text-11 text-text-muted truncate" title={r.sub}>{r.sub}</div>
                          <div className="mono text-11 text-text-muted">{fmtDateTime(r.ts)}</div>
                        </div>
                      </button>
                      {r.plate && !onAllowList(r.plate) && (
                        onWatch(r.plate)
                          ? <span className="self-center text-11 text-advisory shrink-0">on watch list</span>
                          : <button type="button" className="btn btn-sm self-center shrink-0" onClick={() => watch(r)} title="Add this plate to the watch list, recorded under your name">Watch plate</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
