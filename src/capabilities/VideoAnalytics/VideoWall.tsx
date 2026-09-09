import { useLayoutEffect, useRef, useState } from 'react';
import type { Sensor } from '@/lib/types';
import { CctvFeed } from '@/ui/CctvFeed';
import { subjectsFor, boxesFor } from './subjects';

export type WallCamera = { sensor: Sensor; /** zone name when the camera was borrowed from another zone */ away: string | null };

type Props = {
  cameras: WallCamera[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showBoxes: boolean;
  beat: number;
};

const GAP = 6;
const CAPTION = 16;
const STRIP_TILE_H = 52;

/** Measures the element so the wall can size tiles to the panel instead of scrolling. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * 12 tiles, four across, sized so all three rows fit the panel. Selecting a tile expands it to fill
 * the wall with the other tiles collapsing to a filmstrip below; click it again or Close to return.
 */
export function VideoWall({ cameras, selectedId, onSelect, showBoxes, beat }: Props) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const selected = cameras.find((c) => c.sensor.id === selectedId) ?? null;

  let body: React.ReactNode = null;
  if (w > 0 && h > 0 && !selected) {
    const rows = Math.ceil(cameras.length / 4);
    const byWidth = (w - 3 * GAP) / 4;
    const byHeight = ((h - (rows - 1) * GAP - rows * CAPTION) / rows) * (16 / 9);
    const tileW = Math.max(80, Math.floor(Math.min(byWidth, byHeight)));
    body = (
      <div className="grid grid-cols-4 mx-auto" style={{ gap: GAP, width: tileW * 4 + 3 * GAP }} role="list" aria-label="Camera wall">
        {cameras.map((c) => (
          <Tile key={c.sensor.id} cam={c} width={tileW} compact={tileW < 220} selected={false} onClick={() => onSelect(c.sensor.id)} showBoxes={showBoxes} beat={beat} caption />
        ))}
      </div>
    );
  } else if (w > 0 && h > 0 && selected) {
    const feedH = Math.floor(Math.min(h - STRIP_TILE_H - GAP - CAPTION - 4, (w * 9) / 16));
    const feedW = Math.floor((feedH * 16) / 9);
    const stripW = Math.floor((STRIP_TILE_H * 16) / 9);
    body = (
      <div className="h-full flex flex-col" style={{ gap: GAP }}>
        <div className="mx-auto relative" style={{ width: feedW }}>
          <Tile cam={selected} width={feedW} compact={false} selected onClick={() => onSelect(null)} showBoxes={showBoxes} beat={beat} caption />
          <button type="button" className="btn btn-sm absolute right-1.5 top-1.5 z-10" onClick={() => onSelect(null)} title="Back to the wall (Esc)">
            Close <span className="kbd">Esc</span>
          </button>
        </div>
        <div className="flex overflow-x-auto shrink-0 pb-1" style={{ gap: GAP }} role="list" aria-label="Filmstrip">
          {cameras.map((c) => (
            <Tile key={c.sensor.id} cam={c} width={stripW} compact selected={c.sensor.id === selectedId} onClick={() => onSelect(c.sensor.id === selectedId ? null : c.sensor.id)} showBoxes={showBoxes} beat={beat} caption={false} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex-1 min-h-0 min-w-0 overflow-hidden"
      onKeyDown={(e) => { if (e.key === 'Escape' && selected) { e.stopPropagation(); onSelect(null); } }}
    >
      {body}
    </div>
  );
}

type TileProps = { cam: WallCamera; width: number; compact: boolean; selected: boolean; onClick: () => void; showBoxes: boolean; beat: number; caption: boolean };

function Tile({ cam, width, compact, selected, onClick, showBoxes, beat, caption }: TileProps) {
  const s = cam.sensor;
  const offline = s.status === 'offline';
  return (
    <div className="shrink-0" style={{ width }} role="listitem">
      <div className="rounded-[2px] overflow-hidden" style={selected ? { boxShadow: '0 0 0 1px var(--agent)' } : undefined}>
        {offline ? (
          <NoSignal sensor={s} compact={compact} onClick={onClick} />
        ) : (
          <CctvFeed
            sensorId={s.id}
            scene={s.scene ?? 'fence'}
            variant={s.type === 'thermal' ? 'thermal' : 'cctv'}
            subjects={subjectsFor(s.id, beat)}
            boxes={boxesFor(s.id, beat)}
            showBoxes={showBoxes}
            compact={compact}
            label={s.label}
            onClick={onClick}
          />
        )}
      </div>
      {caption && (
        <div className="flex items-center gap-1.5 text-11 leading-4 whitespace-nowrap overflow-hidden" style={{ height: CAPTION }} title={`${s.id} · ${s.label}${cam.away ? ` · ${cam.away}` : ''}`}>
          <span className="mono">{s.id}</span>
          <span className="text-text-muted truncate">{s.label}{cam.away ? ` · ${cam.away}` : ''}</span>
          {s.status === 'degraded' && <span className="dot bg-advisory shrink-0" title="Degraded" />}
          {offline && <span className="dot bg-alarm shrink-0" title="Offline" />}
        </div>
      )}
    </div>
  );
}

/** Designed state for a camera with no stream: keeps the slot so the wall stays honest about coverage. */
function NoSignal({ sensor, compact, onClick }: { sensor: Sensor; compact: boolean; onClick: () => void }) {
  const reason = sensor.id === 'CAM-P-W1' ? 'Media converter fault · ticket FM-1187' : 'Stream unavailable';
  return (
    <div
      className="relative bg-surface-inset scanlines cursor-pointer"
      style={{ aspectRatio: '16 / 9' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`${sensor.id} offline`}
    >
      <div className={`absolute left-1.5 top-1 flex items-center gap-1.5 mono ${compact ? 'text-[9px]' : 'text-11'} text-text-primary/90`}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-alarm" />
        <span>{sensor.id}</span>
      </div>
      <div className={`absolute inset-0 flex flex-col items-center justify-center text-text-muted ${compact ? 'text-[9px]' : 'text-12'}`}>
        <span>No signal</span>
        {!compact && <span className="mono text-11 mt-0.5">{reason}</span>}
        {!compact && <span className="text-11 mt-0.5">Covered by THM-P-SW and a robot pass every 20 minutes</span>}
      </div>
    </div>
  );
}
