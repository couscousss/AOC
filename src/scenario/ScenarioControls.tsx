import { useStore } from '@/store/useStore';
import { scenario } from './ScenarioController';
import { BEATS, SCENARIO_LENGTH } from './script';
import { fmtDuration } from '@/lib/time';

/** Status bar control: Run scenario, then play/pause, step, reset, and the beat strip. */
export function ScenarioControls() {
  const sc = useStore((s) => s.scenario);
  const idle = sc.status === 'idle';
  const beat = sc.beat >= 0 ? BEATS[sc.beat] : null;

  return (
    <div className="flex items-center gap-2 pl-4 border-l hairline" role="group" aria-label="Scenario">
      {idle ? (
        <>
          <button type="button" className="btn btn-primary" onClick={() => scenario.start('play')} title="Play the four-minute scripted incident">
            ▶ Run scenario
          </button>
          <button type="button" className="btn" onClick={() => scenario.start('step')} title="Step through beat by beat">Step</button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-[190px]">
            <div className="text-11 text-text-muted narrow">{sc.beat + 1}/{BEATS.length}</div>
            <div className="relative h-1.5 flex-1 bg-surface-inset rounded overflow-hidden" aria-hidden>
              <div className="absolute inset-y-0 left-0 bg-agent/70" style={{ width: `${Math.min(100, (sc.elapsed / SCENARIO_LENGTH) * 100)}%` }} />
              {BEATS.map((b, i) => (
                <span key={i} className="absolute top-0 bottom-0 w-px bg-line" style={{ left: `${(b.t / SCENARIO_LENGTH) * 100}%` }} />
              ))}
            </div>
            <div className="mono text-11 text-text-muted w-10">{fmtDuration(sc.elapsed * 1000)}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => scenario.prev()} title="Previous beat" aria-label="Previous beat">◀</button>
          {sc.mode === 'play' ? (
            sc.status === 'running' ? (
              <button type="button" className="btn btn-sm" onClick={() => scenario.pause()} title="Pause" aria-label="Pause">❚❚</button>
            ) : sc.status === 'paused' ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => scenario.resume()} title="Resume" aria-label="Resume">▶</button>
            ) : null
          ) : null}
          <button
            type="button"
            className={`btn btn-sm ${sc.waitingFor ? 'btn-primary' : ''}`}
            onClick={() => scenario.next()}
            disabled={sc.status === 'complete'}
            title={sc.waitingFor ? 'Approve and continue' : 'Next beat'}
            aria-label="Next beat"
          >
            {sc.waitingFor ? 'Approve ▶' : '▶|'}
          </button>
          <button type="button" className="chip" aria-pressed={sc.mode === 'step'} onClick={() => scenario.setMode(sc.mode === 'step' ? 'play' : 'step')} title="Step-through mode: pause at every beat">
            step-through
          </button>
          <button type="button" className="btn btn-sm" onClick={() => scenario.reset()} title="Reset to the opening state">Reset</button>
          {beat && <BeatStrip label={beat.label} note={beat.note} waiting={sc.waitingFor ? BEATS[sc.beat].waitFor?.label : undefined} />}
        </>
      )}
    </div>
  );
}

function BeatStrip({ label, note, waiting }: { label: string; note: string; waiting?: string }) {
  return (
    <div className="fixed left-[calc(var(--nav-w)+12px)] top-[calc(var(--status-h)+12px)] z-20 panel px-3 py-2 max-w-[440px] shadow-xl pointer-events-none" role="status">
      <div className="text-12 font-medium">{label}</div>
      <div className="text-11 text-text-muted mt-0.5">{note}</div>
      {waiting && <div className="text-11 text-advisory mt-1">{waiting}</div>}
    </div>
  );
}
