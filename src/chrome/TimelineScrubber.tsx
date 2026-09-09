import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { demoNow, DAY_MS, fmtClock, fmtTime } from '@/lib/time';

const BINS = 96; // 15-minute bins over 24h

export function TimelineScrubber() {
  const detections = useStore((s) => s.detections);
  const alerts = useStore((s) => s.alerts);
  const incidents = useStore((s) => s.incidents);
  const replayAt = useStore((s) => s.replayAt);
  const setReplay = useStore((s) => s.setReplay);
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const [now, setNow] = useState(demoNow());

  useEffect(() => {
    const t = setInterval(() => setNow(demoNow()), 5000);
    return () => clearInterval(t);
  }, []);

  const start = now - DAY_MS;

  const bins = useMemo(() => {
    const b = new Array(BINS).fill(0);
    const add = (ts: number, w = 1) => {
      const i = Math.floor(((ts - start) / DAY_MS) * BINS);
      if (i >= 0 && i < BINS) b[i] += w;
    };
    detections.forEach((d) => add(d.ts));
    alerts.forEach((a) => add(a.ts, 0.5));
    return b;
  }, [detections, alerts, start]);
  const max = Math.max(1, ...bins);

  const posToTs = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return start + f * DAY_MS;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => { const t = posToTs(e.clientX); if (t !== null) setReplay(t >= now - 2000 ? null : t); };
    const up = () => setDrag(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, now]);

  const handleTs = replayAt ?? now;
  const handleX = ((handleTs - start) / DAY_MS) * 100;

  const incidentMarks = incidents.map((i) => ({ id: i.id, x: ((i.openedAt - start) / DAY_MS) * 100, sev: i.severity }));

  return (
    <div className="h-[var(--timeline-h)] shrink-0 border-t hairline bg-surface-raised flex items-center gap-3 px-4" role="group" aria-label="Timeline, last 24 hours">
      <div className="text-11 text-text-muted narrow w-10 shrink-0">24h</div>
      <div className="mono text-11 text-text-muted w-12 shrink-0">{fmtClock(start)}</div>
      <div
        ref={trackRef}
        className="relative flex-1 h-8 cursor-ew-resize select-none"
        onPointerDown={(e) => { setDrag(true); const t = posToTs(e.clientX); if (t !== null) setReplay(t >= now - 2000 ? null : t); }}
        onKeyDown={(e) => {
          const step = 15 * 60 * 1000;
          if (e.key === 'ArrowLeft') setReplay(Math.max(start, handleTs - step));
          if (e.key === 'ArrowRight') { const t = handleTs + step; setReplay(t >= now ? null : t); }
          if (e.key === 'Home') setReplay(start);
          if (e.key === 'End') setReplay(null);
        }}
        tabIndex={0}
        role="slider"
        aria-valuemin={start}
        aria-valuemax={now}
        aria-valuenow={handleTs}
        aria-valuetext={fmtTime(handleTs)}
      >
        {/* histogram */}
        <div className="absolute inset-x-0 bottom-1 top-1 flex items-end gap-px pointer-events-none">
          {bins.map((v, i) => (
            <div key={i} className="flex-1" style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: 'rgba(122,143,156,0.22)' }} />
          ))}
        </div>
        {/* incident marks */}
        {incidentMarks.map((m) => (
          <div key={m.id} className="absolute top-0 w-[2px] h-2 pointer-events-none" style={{ left: `${m.x}%`, background: m.sev === 'high' ? 'var(--alarm)' : m.sev === 'elevated' ? 'var(--advisory)' : 'var(--text-muted)' }} title={m.id} />
        ))}
        {/* track line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-line pointer-events-none" />
        {/* replay shading */}
        {replayAt && <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${handleX}%`, right: 0, background: 'repeating-linear-gradient(90deg, rgba(224,169,59,0.06) 0 4px, transparent 4px 8px)' }} />}
        {/* handle */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${handleX}%` }}>
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: replayAt ? 'var(--advisory)' : 'var(--agent)', background: 'var(--surface-deep)' }} />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 mono text-11 whitespace-nowrap" style={{ color: replayAt ? 'var(--advisory)' : 'var(--text-muted)' }}>{fmtTime(handleTs)}</div>
        </div>
      </div>
      <div className="mono text-11 text-text-muted w-12 shrink-0 text-right">{fmtClock(now)}</div>
      <button
        type="button"
        className={`btn btn-sm ${replayAt ? 'btn-primary' : ''}`}
        onClick={() => setReplay(null)}
        aria-pressed={!replayAt}
        title="Return to now"
      >
        <span className="dot" style={{ background: replayAt ? 'var(--advisory)' : 'var(--nominal)' }} />
        {replayAt ? 'Return to live' : 'Live'}
      </button>
    </div>
  );
}
