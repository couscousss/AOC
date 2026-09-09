import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ZONE_GEOMS, FENCE } from '../campConfig';
import { ZONE_BY_ID } from '@/data/zones';
import { useStore } from '@/store/useStore';
import { currentPosition } from '@/data/assets';
import type { ZoneId } from '@/lib/types';

/** Clickable zone regions: outlined boundaries, hover card, click → fly-in. */
export function ZoneRegions() {
  const showZones = useStore((s) => s.overlays.zones);
  const hovered = useStore((s) => s.hoveredZoneId);
  const selected = useStore((s) => s.selectedZoneId);
  const setHovered = useStore((s) => s.setHovered);
  const selectZone = useStore((s) => s.selectZone);

  return (
    <group>
      {ZONE_GEOMS.map((z) => (
        <ZoneRegion
          key={z.id}
          id={z.id}
          center={z.center}
          size={z.size}
          ring={z.ring}
          outlined={showZones || hovered === z.id || selected === z.id}
          hovered={hovered === z.id}
          selected={selected === z.id}
          onHover={(h) => setHovered(h ? z.id : hovered === z.id ? null : hovered)}
          onClick={() => selectZone(z.id)}
        />
      ))}
      {hovered && selected !== hovered && <HoverCard id={hovered} />}
    </group>
  );
}

function ZoneRegion({ id, center, size, ring, outlined, hovered, selected, onHover, onClick }: {
  id: ZoneId; center: [number, number]; size: [number, number]; ring?: boolean; outlined: boolean; hovered: boolean; selected: boolean; onHover: (h: boolean) => void; onClick: () => void;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const w = size[0] / 2, d = size[1] / 2;
    s.moveTo(-w, -d); s.lineTo(w, -d); s.lineTo(w, d); s.lineTo(-w, d); s.closePath();
    if (ring) {
      const hole = new THREE.Path();
      const iw = w - 14, idd = d - 14;
      hole.moveTo(-iw, -idd); hole.lineTo(iw, -idd); hole.lineTo(iw, idd); hole.lineTo(-iw, idd); hole.closePath();
      s.holes.push(hole);
    }
    return s;
  }, [size, ring]);
  const fill = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);
  const outline = useMemo(() => {
    const w = size[0] / 2, d = size[1] / 2;
    const pts = ring
      ? [new THREE.Vector3(-FENCE.x, 0, -FENCE.z), new THREE.Vector3(FENCE.x, 0, -FENCE.z), new THREE.Vector3(FENCE.x, 0, FENCE.z), new THREE.Vector3(-FENCE.x, 0, FENCE.z), new THREE.Vector3(-FENCE.x, 0, -FENCE.z)]
      : [new THREE.Vector3(-w, 0, -d), new THREE.Vector3(w, 0, -d), new THREE.Vector3(w, 0, d), new THREE.Vector3(-w, 0, d), new THREE.Vector3(-w, 0, -d)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#7a8f9c', transparent: true, opacity: 0.35 }));
    line.position.set(ring ? -center[0] : 0, 0.2, ring ? -center[1] : 0);
    return line;
  }, [size, ring, center]);
  const color = hovered || selected ? '#4fd1c5' : '#7a8f9c';
  const mat = outline.material as THREE.LineBasicMaterial;
  mat.color.set(color);
  mat.opacity = outlined ? (hovered || selected ? 0.95 : 0.35) : 0;
  return (
    <group position={[center[0], 0.12, center[1]]}>
      <mesh
        geometry={fill}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        name={`zone-${id}`}
      >
        <meshBasicMaterial color="#4fd1c5" transparent opacity={hovered ? 0.1 : selected ? 0.05 : 0.001} depthWrite={false} />
      </mesh>
      <primitive object={outline} />
    </group>
  );
}

function HoverCard({ id }: { id: ZoneId }) {
  const zone = ZONE_BY_ID[id];
  const geom = ZONE_GEOMS.find((z) => z.id === id)!;
  const alerts = useStore((s) => s.alerts.filter((a) => a.zoneId === id && a.state !== 'resolved').length);
  const allSensors = useStore((s) => s.sensors);
  const sensors = allSensors.filter((x) => x.zoneId === id);
  const assets = useStore((s) => s.assets);
  const inZone = assets.filter((a) => {
    const p = currentPosition(a).position;
    return Math.abs(p[0] - geom.center[0]) <= geom.size[0] / 2 && Math.abs(p[2] - geom.center[1]) <= geom.size[1] / 2 && !geom.ring;
  }).length;
  const deg = sensors.filter((s) => s.status !== 'nominal').length;
  const pos: [number, number, number] = id === 'perimeter' ? [150, 6, -110] : [geom.center[0], 8, geom.center[1]];
  return (
    <Html position={pos} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
      <div className="panel px-3 py-2 min-w-[200px] shadow-xl" style={{ transform: 'translateY(-60%)' }}>
        <div className="text-14 font-medium whitespace-nowrap">{zone.name}</div>
        <div className="grid grid-cols-3 gap-2 mt-1 text-11 whitespace-nowrap">
          <div><div className="text-text-muted">Alerts</div><div className="mono" style={{ color: alerts ? 'var(--advisory)' : undefined }}>{alerts} open</div></div>
          <div><div className="text-text-muted">Assets</div><div className="mono">{inZone}</div></div>
          <div><div className="text-text-muted">Sensors</div><div className="mono" style={{ color: deg ? 'var(--advisory)' : 'var(--nominal)' }}>{sensors.length - deg}/{sensors.length} ok</div></div>
        </div>
        <div className="text-11 text-text-muted mt-1">Click to drill down</div>
      </div>
    </Html>
  );
}
