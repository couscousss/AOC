import { useRef, type ReactNode, type MouseEvent } from 'react';
import { BUILDINGS, ROADS, FENCE, GATES, HELIPAD, GROUND, ACCESS_ROAD } from '@/scene/campConfig';
import type { Vec3, Waypoint } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { currentPosition } from '@/data/assets';
import { SENSORS } from '@/data/sensors';
import { GEOFENCES } from '@/data/facilities';

type Props = {
  className?: string;
  /** world x,z on click */
  onClick?: (p: [number, number]) => void;
  /** extra SVG content in world coordinates (x → x, z → y) */
  children?: ReactNode;
  showAssets?: boolean;
  showCameras?: boolean;
  showGeofences?: boolean;
  highlightAssetId?: string;
  route?: Waypoint[] | Vec3[];
  routeColor?: string;
  focus?: { center: [number, number]; size: number };
  onCameraClick?: (id: string) => void;
  selectedCameraIds?: string[];
  /** world → svg helper exposed via children function is not needed; coordinates are 1:1 */
  interactive?: boolean;
};

const PAD = 24;

/** 2D plan view of Camp Raven, world units 1:1 (x right, z down). */
export function MiniMap({ className = '', onClick, children, showAssets = true, showCameras = false, showGeofences = false, highlightAssetId, route, routeColor = 'var(--agent)', focus, onCameraClick, selectedCameraIds = [], interactive }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const assets = useStore((s) => s.assets);
  const vb = focus
    ? `${focus.center[0] - focus.size / 2} ${focus.center[1] - focus.size / 2} ${focus.size} ${focus.size}`
    : `${-GROUND.w / 2 - PAD} ${-GROUND.d / 2 - PAD} ${GROUND.w + PAD * 2} ${GROUND.d + PAD * 2}`;

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onClick || !ref.current) return;
    const pt = ref.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = ref.current.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    onClick([Math.round(p.x), Math.round(p.y)]);
  };

  const routePts = route?.map((w) => ('position' in (w as Waypoint) ? (w as Waypoint).position : (w as Vec3)));

  return (
    <svg
      ref={ref}
      viewBox={vb}
      className={`w-full h-full bg-surface-inset ${onClick ? 'cursor-crosshair' : ''} ${className}`}
      onClick={handleClick}
      preserveAspectRatio="xMidYMid meet"
      role={interactive ? 'application' : 'img'}
      aria-label="Camp Raven plan view"
    >
      <defs>
        <pattern id="mm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(36,52,64,0.5)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x={-GROUND.w / 2} y={-GROUND.d / 2} width={GROUND.w} height={GROUND.d} fill="url(#mm-grid)" />
      {/* geofences */}
      {showGeofences &&
        GEOFENCES.map((g) => (
          <polygon
            key={g.id}
            points={g.polygon.map((p) => p.join(',')).join(' ')}
            fill={g.kind === 'nofly' ? 'rgba(229,72,77,0.12)' : g.kind === 'corridor' ? 'rgba(224,169,59,0.10)' : 'none'}
            stroke={g.kind === 'nofly' ? 'var(--alarm)' : g.kind === 'corridor' ? 'var(--advisory)' : 'var(--line)'}
            strokeWidth="0.8"
            strokeDasharray={g.kind === 'geofence' ? '4 3' : undefined}
          />
        ))}
      {/* roads */}
      {[...ROADS, ACCESS_ROAD].map((r, i) => (
        <line key={i} x1={r.from[0]} y1={r.from[1]} x2={r.to[0]} y2={r.to[1]} stroke="#1c2a33" strokeWidth={r.width} strokeLinecap="round" />
      ))}
      {/* fence */}
      <rect x={-FENCE.x} y={-FENCE.z} width={FENCE.x * 2} height={FENCE.z * 2} fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 2" />
      {/* buildings */}
      {BUILDINGS.map((b) =>
        b.shape === 'cylinder' ? (
          <circle key={b.id} cx={b.position[0]} cy={b.position[2]} r={b.size[0] / 2} fill="#243440" stroke="#2f4452" strokeWidth="0.6" />
        ) : (
          <rect key={b.id} x={b.position[0] - b.size[0] / 2} y={b.position[2] - b.size[2] / 2} width={b.size[0]} height={b.size[2]} fill="#243440" stroke="#2f4452" strokeWidth="0.6" />
        ),
      )}
      <circle cx={HELIPAD.position[0]} cy={HELIPAD.position[2]} r={HELIPAD.radius} fill="none" stroke="#2f4452" strokeWidth="0.8" />
      <text x={HELIPAD.position[0]} y={HELIPAD.position[2] + 5} textAnchor="middle" fontSize="14" fill="#2f4452" fontFamily="Archivo">H</text>
      {GATES.map((g) => (
        <rect key={g.id} x={g.position[0] - 5} y={g.position[2] - 3} width={10} height={6} fill="var(--advisory)" opacity="0.6" />
      ))}
      {/* labels */}
      {[
        ['HQ', 0, 0], ['Motor pool', 108, 62], ['Armoury', -124, 72], ['Barracks', -112, -27], ['Gate 1', -40, 118], ['Gate 2', 178, -40], ['Gate 3', 60, -128],
        ['Helipad', 120, -92], ['Nest', 40, -112], ['Dock', -30, -102], ['Mess', -46, 62], ['Workshop', 142, 10],
      ].map(([l, x, z]) => (
        <text key={l as string} x={x as number} y={(z as number) + 2.5} textAnchor="middle" fontSize="7" fill="var(--text-muted)" fontFamily="Archivo Narrow, Archivo" style={{ pointerEvents: 'none' }}>
          {l}
        </text>
      ))}
      {/* cameras */}
      {showCameras &&
        SENSORS.filter((s) => s.type === 'camera' || s.type === 'thermal').map((s) => {
          const sel = selectedCameraIds.includes(s.id);
          const idx = selectedCameraIds.indexOf(s.id);
          const h = ((s.heading ?? 0) - 90) * (Math.PI / 180);
          const fov = ((s.fov ?? 60) * Math.PI) / 180;
          const r = 22;
          const a1 = h - fov / 2, a2 = h + fov / 2;
          return (
            <g
              key={s.id}
              onClick={(e) => { if (onCameraClick) { e.stopPropagation(); onCameraClick(s.id); } }}
              className={onCameraClick ? 'cursor-pointer' : ''}
              role={onCameraClick ? 'button' : undefined}
              aria-label={`${s.id} ${s.label}`}
            >
              <path d={`M ${s.position[0]} ${s.position[2]} L ${s.position[0] + Math.cos(a1) * r} ${s.position[2] + Math.sin(a1) * r} A ${r} ${r} 0 0 1 ${s.position[0] + Math.cos(a2) * r} ${s.position[2] + Math.sin(a2) * r} Z`} fill={sel ? 'rgba(79,209,197,0.28)' : 'rgba(79,209,197,0.08)'} stroke="none" />
              <circle cx={s.position[0]} cy={s.position[2]} r={sel ? 4 : 2.6} fill={s.status === 'offline' ? 'var(--alarm)' : s.status === 'degraded' ? 'var(--advisory)' : sel ? 'var(--agent)' : 'var(--text-muted)'} stroke={sel ? '#0d1418' : 'none'} strokeWidth="1" />
              {sel && (
                <text x={s.position[0]} y={s.position[2] - 6} textAnchor="middle" fontSize="7" fill="var(--agent)" fontFamily="IBM Plex Mono" style={{ pointerEvents: 'none' }}>
                  {idx + 1}
                </text>
              )}
            </g>
          );
        })}
      {/* route */}
      {routePts && routePts.length > 1 && (
        <g>
          <polyline points={routePts.map((p) => `${p[0]},${p[2]}`).join(' ')} fill="none" stroke={routeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.9" />
          {routePts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[2]} r="3.5" fill="#0d1418" stroke={routeColor} strokeWidth="1.2" />
              <text x={p[0]} y={p[2] + 2.2} textAnchor="middle" fontSize="6" fill={routeColor} fontFamily="IBM Plex Mono">{i + 1}</text>
            </g>
          ))}
        </g>
      )}
      {/* assets */}
      {showAssets &&
        assets.map((a) => {
          const { position, heading } = currentPosition(a);
          const hl = a.id === highlightAssetId;
          const col = a.class === 'drone' ? 'var(--agent)' : a.state === 'maintenance' ? 'var(--advisory)' : 'var(--text-primary)';
          return (
            <g key={a.id} transform={`translate(${position[0]} ${position[2]})`} style={{ transition: 'transform 120ms linear' }}>
              {hl && <circle r="9" fill="none" stroke="var(--agent)" strokeWidth="1" opacity="0.7" />}
              <g transform={`rotate(${heading})`}>
                {a.class === 'drone' ? (
                  <polygon points="0,-4 3.5,3 0,1.5 -3.5,3" fill={col} />
                ) : (
                  <rect x="-3" y="-3" width="6" height="6" fill={col} rx="1" />
                )}
              </g>
              <text x="6" y="2.5" fontSize="6.5" fill={col} fontFamily="IBM Plex Mono" style={{ pointerEvents: 'none' }}>{a.callsign}</text>
            </g>
          );
        })}
      {children}
    </svg>
  );
}
