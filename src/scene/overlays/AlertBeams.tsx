import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import type { Alert } from '@/lib/types';

/** Pulsing vertical beams at open alert locations. Click → incident case view. */
export function AlertBeams() {
  const alerts = useStore((s) => s.alerts);
  const open = alerts.filter((a) => a.state !== 'resolved' && a.position && !a.mergedInto);
  return (
    <group>
      {open.map((a) => <Beam key={a.id} a={a} />)}
    </group>
  );
}

function Beam({ a }: { a: Alert }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const openIncident = useStore((s) => s.openIncident);
  const setView = useStore((s) => s.setView);
  const color = a.severity === 'high' ? '#e5484d' : a.severity === 'elevated' ? '#e0a93b' : '#7a8f9c';
  const height = a.severity === 'low' ? 18 : 40;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = 0.5 + 0.5 * Math.sin(t * (a.severity === 'high' ? 6 : 3));
    if (mat.current) mat.current.opacity = 0.25 + p * 0.5;
    if (ring.current) { const s = 1 + ((t * 0.8) % 1) * 2.2; ring.current.scale.set(s, s, s); (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 0.8) % 1)); }
  });
  const [x, , z] = a.position!;
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, height / 2, 0]}
        onClick={(e) => { e.stopPropagation(); if (a.incidentId) openIncident(a.incidentId); else if (a.actionId) setView('approvals'); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <cylinderGeometry args={[0.7, 1.6, height, 8, 1, true]} />
        <meshBasicMaterial ref={mat} color={color} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <ringGeometry args={[3, 3.6, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={a.severity === 'low' ? 8 : 30} distance={40} decay={1.5} position={[0, 4, 0]} />
    </group>
  );
}
