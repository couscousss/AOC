import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

const COLORS = { nominal: new THREE.Color('#3d8f6b'), degraded: new THREE.Color('#e0a93b'), offline: new THREE.Color('#e5484d') };

/** Every sensor as an instanced dot coloured by status. */
export function SensorDots() {
  const sensors = useStore((s) => s.sensors);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 8, 8), new THREE.MeshBasicMaterial({ vertexColors: false }), sensors.length);
    return m;
  }, [sensors.length]);

  useEffect(() => {
    const o = new THREE.Object3D();
    sensors.forEach((s, i) => {
      o.position.set(s.position[0], Math.max(1.5, s.position[1]), s.position[2]);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, COLORS[s.status]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [sensors, mesh]);

  return (
    <group>
      <primitive object={mesh} />
      {sensors.filter((s) => s.status !== 'nominal').map((s) => (
        <mesh key={s.id} position={[s.position[0], Math.max(1.5, s.position[1]), s.position[2]]}>
          <sphereGeometry args={[2.4, 8, 8]} />
          <meshBasicMaterial color={s.status === 'offline' ? '#e5484d' : '#e0a93b'} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
