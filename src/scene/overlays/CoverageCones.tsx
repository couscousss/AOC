import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

/** Translucent FOV sectors on the ground. Overlaps compound and read darker, which reveals coverage gaps. */
export function CoverageCones() {
  const sensors = useStore((s) => s.sensors);
  const cams = useMemo(() => sensors.filter((s) => (s.type === 'camera' || s.type === 'thermal') && s.fov && s.range), [sensors]);
  return (
    <group>
      {cams.map((c) => {
        const fov = THREE.MathUtils.degToRad(c.fov!);
        // heading is clockwise from north (-z). CircleGeometry thetaStart is measured from +x counter-clockwise in the XY plane;
        // after rotating the plane flat (-90° about x), +y maps to -z (north). So start = 90° - heading - fov/2.
        const start = Math.PI / 2 - THREE.MathUtils.degToRad(c.heading ?? 0) - fov / 2;
        const off = c.status === 'offline';
        return (
          <mesh key={c.id} position={[c.position[0], 0.25, c.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[c.range!, 24, start, fov]} />
            <meshBasicMaterial color={off ? '#e5484d' : c.status === 'degraded' ? '#e0a93b' : '#4fd1c5'} transparent opacity={off ? 0.04 : 0.08} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}
