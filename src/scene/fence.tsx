import { useMemo } from 'react';
import * as THREE from 'three';
import { FENCE, GATES } from './campConfig';

/** Perimeter fence: instanced posts along the rectangle, a top rail, gaps at the gates. */
export function Fence() {
  const { posts, rail } = useMemo(() => {
    const pts: [number, number][] = [];
    const corners: [number, number][] = [[-FENCE.x, -FENCE.z], [FENCE.x, -FENCE.z], [FENCE.x, FENCE.z], [-FENCE.x, FENCE.z], [-FENCE.x, -FENCE.z]];
    const spacing = 5;
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.round(len / spacing);
      for (let k = 0; k < n; k++) {
        const f = k / n;
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        const nearGate = GATES.some((g) => Math.hypot(g.position[0] - x, g.position[2] - z) < 7);
        if (!nearGate) pts.push([x, z]);
      }
    }
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 3, 0.35), new THREE.MeshLambertMaterial({ color: '#4a5a64' }), pts.length);
    const o = new THREE.Object3D();
    pts.forEach((p, i) => { o.position.set(p[0], 1.5, p[1]); o.updateMatrix(); posts.setMatrixAt(i, o.matrix); });
    posts.instanceMatrix.needsUpdate = true;

    const railPts: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[i + 1];
      railPts.push(a[0], 3, a[1], b[0], 3, b[1]);
      railPts.push(a[0], 1.6, a[1], b[0], 1.6, b[1]);
    }
    const rail = new THREE.BufferGeometry();
    rail.setAttribute('position', new THREE.Float32BufferAttribute(railPts, 3));
    return { posts, rail };
  }, []);

  return (
    <group>
      <primitive object={posts} />
      <lineSegments geometry={rail}>
        <lineBasicMaterial color="#5c6c76" transparent opacity={0.7} />
      </lineSegments>
      {GATES.map((g) => (
        <group key={g.id} position={[g.position[0], 0, g.position[2]]} rotation={[0, (g.heading * Math.PI) / 180, 0]}>
          <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[12, 0.25, 0.25]} />
            <meshBasicMaterial color="#e0a93b" />
          </mesh>
          <mesh position={[-6, 1.5, 0]}><boxGeometry args={[0.5, 3, 0.5]} /><meshLambertMaterial color="#6a7a84" /></mesh>
          <mesh position={[6, 1.5, 0]}><boxGeometry args={[0.5, 3, 0.5]} /><meshLambertMaterial color="#6a7a84" /></mesh>
        </group>
      ))}
    </group>
  );
}
