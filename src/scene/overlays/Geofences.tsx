import { useMemo } from 'react';
import * as THREE from 'three';
import { GEOFENCES } from '@/data/facilities';
import { useStore } from '@/store/useStore';

/** Extruded translucent volumes for no-fly zones, corridors and the operating geofence. */
export function Geofences() {
  const unknownDrone = useStore((s) => s.unknownDrone);
  const geoms = useMemo(
    () =>
      GEOFENCES.map((g) => {
        const shape = new THREE.Shape();
        g.polygon.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
        shape.closePath();
        const geom = new THREE.ExtrudeGeometry(shape, { depth: g.maxAlt - g.minAlt, bevelEnabled: false });
        geom.rotateX(-Math.PI / 2);
        return { g, geom };
      }),
    [],
  );
  const trackLine = useMemo(() => {
    if (!unknownDrone) return null;
    const g = new THREE.BufferGeometry().setFromPoints(unknownDrone.points.map((p) => new THREE.Vector3(...p)));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e0a93b' }));
  }, [unknownDrone]);
  return (
    <group>
      {geoms.map(({ g, geom }) => {
        const color = g.kind === 'nofly' ? '#e5484d' : g.kind === 'corridor' ? '#e0a93b' : '#7a8f9c';
        return (
          <group key={g.id} position={[0, g.minAlt, 0]}>
            <mesh geometry={geom}>
              <meshBasicMaterial color={color} transparent opacity={g.kind === 'geofence' ? 0.03 : 0.1} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <lineSegments geometry={new THREE.EdgesGeometry(geom)}>
              <lineBasicMaterial color={color} transparent opacity={g.kind === 'geofence' ? 0.25 : 0.6} />
            </lineSegments>
          </group>
        );
      })}
      {trackLine && unknownDrone && (
        <group>
          <primitive object={trackLine} />
          <mesh position={unknownDrone.points[unknownDrone.points.length - 1]}>
            <octahedronGeometry args={[2.2]} />
            <meshBasicMaterial color="#e0a93b" wireframe />
          </mesh>
        </group>
      )}
    </group>
  );
}
