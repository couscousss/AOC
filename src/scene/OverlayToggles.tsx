import { useStore, type OverlayKey } from '@/store/useStore';

const ITEMS: { k: OverlayKey; label: string }[] = [
  { k: 'coverage', label: 'Camera coverage' },
  { k: 'assets', label: 'Assets' },
  { k: 'sensors', label: 'Sensor status' },
  { k: 'geofences', label: 'Geofences and no-fly' },
  { k: 'heatmap', label: 'Movement heatmap' },
  { k: 'zones', label: 'Zone boundaries' },
];

export function OverlayToggles() {
  const overlays = useStore((s) => s.overlays);
  const toggle = useStore((s) => s.toggleOverlay);
  return (
    <div className="absolute top-3 left-3 panel p-1.5 flex flex-col gap-0.5 z-10" role="group" aria-label="Map overlays">
      {ITEMS.map((it) => (
        <button
          key={it.k}
          type="button"
          onClick={() => toggle(it.k)}
          aria-pressed={overlays[it.k]}
          className={`flex items-center gap-2 px-2 py-1 rounded text-12 text-left hover:bg-surface-inset ${overlays[it.k] ? 'text-text-primary' : 'text-text-muted'}`}
        >
          <span className="w-3 h-3 rounded-[2px] border flex items-center justify-center" style={{ borderColor: overlays[it.k] ? 'var(--agent)' : 'var(--line)', background: overlays[it.k] ? 'rgba(79,209,197,0.25)' : 'transparent' }}>
            {overlays[it.k] && <span className="w-1.5 h-1.5 bg-agent rounded-[1px]" />}
          </span>
          {it.label}
        </button>
      ))}
    </div>
  );
}
