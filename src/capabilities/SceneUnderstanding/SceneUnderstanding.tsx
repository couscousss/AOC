import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import type { SceneKind } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { CctvFeed, type FeedVariant } from '@/ui/CctvFeed';
import { ZONE_BY_ID } from '@/data/zones';
import { VLM_IDLE, VLM_QUESTIONS, type RetroResult } from '@/data/copy';
import { demoNow, fmtTime, fmtDateTime } from '@/lib/time';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { subjectsFor, boxesFor } from '@/capabilities/VideoAnalytics/subjects';
import { ObserverLog } from './ObserverLog';
import { RetroSearch } from './RetroSearch';
import { matchQuestion, nearestNote, firstSentence, cameraForScene, type LogEntry } from './scene';

const LOG_LIMIT = 14;

/** One large camera view, an observer's log beside it, a question box, and retrospective search. Not another video grid. */
export function SceneUnderstanding({ zone }: CapabilityProps) {
  const vlm = useStore((s) => s.vlm);
  const beat = useStore((s) => s.scenario.beat);
  const replayAt = useStore((s) => s.replayAt);
  const incidents = useStore((s) => s.incidents);
  const sensors = useStore((s) => s.sensors);
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const setVlm = useStore((s) => s.setVlm);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [question, setQuestion] = useState('');
  const [archive, setArchive] = useState<{ r: RetroResult; i: number } | null>(null);
  const seq = useRef(0);

  // Every new description becomes a log line. Guarded by id so StrictMode's double effect does not duplicate it.
  useEffect(() => {
    const id = `obs-${vlm.key}`;
    const entry: LogEntry = { id, kind: 'observation', ts: demoNow(), text: vlm.text, cameraId: vlm.cameraId, stream: true, streamKey: vlm.key };
    setEntries((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, entry].slice(-LOG_LIMIT)));
  }, [vlm.key, vlm.text, vlm.cameraId]);

  const isDrone = vlm.cameraId === 'OSPREY-1';
  const sensor = isDrone ? null : sensors.find((s) => s.id === vlm.cameraId) ?? null;
  const variant: FeedVariant = isDrone ? 'drone' : sensor?.type === 'thermal' ? 'thermal' : 'cctv';
  const scene: SceneKind = isDrone ? 'rooftop' : sensor?.scene ?? 'fence';
  const label = isDrone ? 'Osprey-1 · EO/IR, 40m over N-04' : sensor?.label ?? vlm.cameraId;
  const camZone = sensor ? ZONE_BY_ID[sensor.zoneId].name : 'Perimeter';
  const live = incidents.find((i) => i.state !== 'closed');

  const ask = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const m = matchQuestion(text);
    const ts = demoNow();
    const n = ++seq.current;
    const q: LogEntry = { id: `q-${n}`, kind: 'question', ts, text, stream: false, streamKey: `q-${n}` };
    const a: LogEntry = { id: `a-${n}`, kind: 'answer', ts: ts + 700, text: m.a, note: m.direct ? undefined : nearestNote(m.q), stream: true, streamKey: `a-${n}` };
    setEntries((prev) => [...prev, q, a].slice(-LOG_LIMIT));
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Asked scene question', target: vlm.cameraId, record: { question: text, answered: m.q, direct: m.direct } });
    setQuestion('');
  };

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onDone = (id: string) => {
    const e = entriesRef.current.find((x) => x.id === id);
    if (!e || !e.stream) return;
    if (e.kind === 'answer') pushFeed('trace', `Answered: ${firstSentence(e.text)}`);
    setEntries((prev) => prev.map((x) => (x.id === id ? { ...x, stream: false } : x)));
  };

  const submit = (e: FormEvent) => { e.preventDefault(); ask(question); };

  const status = replayAt
    ? `Replay at ${fmtTime(replayAt)}. Descriptions shown as they were logged; questions are answered against the live model.`
    : vlm.live
      ? `Describing ${label} live for ${live?.id ?? 'the open incident'}. Re-identification against 30 days of gate footage is running.`
      : `Describing ${label}. Rolling pass over ${VLM_IDLE.length} cameras every ten seconds; nothing needs a person right now.`;

  return (
    <CapabilityShell
      capability="scene"
      status={status}
      headerRight={
        <button type="button" className="btn btn-sm" onClick={() => setVlm(vlm.cameraId, vlm.text, vlm.live)} title="Ask the model to describe the current frame again">
          Describe again
        </button>
      }
      noLower
      primary={
        <div className="h-full min-h-0 flex">
          {/* Camera and question box */}
          <div className="w-[38%] min-w-[360px] shrink-0 border-r hairline flex flex-col min-h-0 overflow-auto p-2 gap-2">
            <div className="relative shrink-0">
              {archive ? (
                <>
                  <CctvFeed sensorId={cameraForScene(archive.r.scene)} scene={archive.r.scene} showBoxes={false} seedOffset={archive.i + 1} label={archive.r.label} />
                  <div className="absolute right-1.5 top-1 mono text-11 text-advisory pointer-events-none" style={{ textShadow: '0 0 3px #000' }}>ARCHIVE {fmtDateTime(archive.r.ts)}</div>
                </>
              ) : (
                <CctvFeed sensorId={vlm.cameraId} scene={scene} variant={variant} subjects={subjectsFor(vlm.cameraId, beat)} boxes={isDrone ? undefined : boxesFor(vlm.cameraId, beat)} showBoxes={!isDrone} label={label} />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-11 shrink-0">
              {archive ? (
                <>
                  <span className="text-text-muted truncate">Archive clip · {archive.r.sub}</span>
                  <button type="button" className="btn btn-sm shrink-0" onClick={() => setArchive(null)}>Back to live</button>
                </>
              ) : (
                <>
                  <span className="truncate"><span className="mono">{vlm.cameraId}</span> <span className="text-text-muted">· {label} · {camZone}{sensor && sensor.zoneId !== zone.id ? ` (outside ${zone.name})` : ''}</span></span>
                  <span className="text-text-muted shrink-0">{vlm.live ? 'held by Trace' : 'rolling'}</span>
                </>
              )}
            </div>

            <div className="text-12 text-text-muted shrink-0">Ask about this scene</div>
            <div className="flex flex-col gap-1 items-start shrink-0">
              {VLM_QUESTIONS.map((x) => (
                <button key={x.q} type="button" className="chip max-w-full" onClick={() => ask(x.q)} title="Ask Trace">
                  <span className="truncate">{x.q}</span>
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-1.5 shrink-0">
              <input className="field" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about what the camera sees" aria-label="Ask about this scene" />
              <button type="submit" className="btn btn-sm btn-primary shrink-0">Ask</button>
            </form>
          </div>

          {/* Observer's log */}
          <div className="flex-1 min-w-0 min-h-0 border-r hairline">
            <ObserverLog entries={entries} live={vlm.live} onDone={onDone} />
          </div>

          {/* Retrospective search */}
          <div className="w-[32%] min-w-[320px] shrink-0 min-h-0">
            <RetroSearch picked={archive?.r ?? null} onPick={(r, i) => setArchive(r ? { r, i } : null)} />
          </div>
        </div>
      }
    />
  );
}
