import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND, ROADS } from '../campConfig';
import { makeRng } from '@/lib/rng';

/** Ground-projected 24h foot and vehicle traffic density. Baked once into a canvas texture. */
export function Heatmap() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    const x = c.getContext('2d')!;
    const sx = c.width / GROUND.w, sz = c.height / GROUND.d;
    const toPx = (wx: number, wz: number): [number, number] => [(wx + GROUND.w / 2) * sx, (wz + GROUND.d / 2) * sz];
    const blob = (wx: number, wz: number, r: number, a: number) => {
      const [px, pz] = toPx(wx, wz);
      const g = x.createRadialGradient(px, pz, 0, px, pz, r);
      g.addColorStop(0, `rgba(224,169,59,${a})`);
      g.addColorStop(0.5, `rgba(224,120,59,${a * 0.5})`);
      g.addColorStop(1, 'rgba(229,72,77,0)');
      x.fillStyle = g;
      x.fillRect(px - r, pz - r, r * 2, r * 2);
    };
    const rng = makeRng(21);
    // roads carry vehicle traffic
    for (const r of ROADS) {
      const n = Math.ceil(Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1]) / 6);
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        blob(r.from[0] + (r.to[0] - r.from[0]) * f, r.from[1] + (r.to[1] - r.from[1]) * f, 14 + rng.next() * 6, r.width >= 8 ? 0.16 : 0.08);
      }
    }
    // foot traffic hot spots
    const spots: [number, number, number, number][] = [
      [-40, 128, 60, 0.3], [0, 22, 50, 0.32], [-46, 62, 45, 0.25], [-112, -27, 55, 0.22], [108, 62, 60, 0.2], [-124, 84, 30, 0.14], [-30, -96, 24, 0.12], [40, -100, 20, 0.1],
    ];
    for (const [wx, wz, r, a] of spots) for (let k = 0; k < 6; k++) blob(wx + (rng.next() - 0.5) * 30, wz + (rng.next() - 0.5) * 30, r, a / 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
      <planeGeometry args={[GROUND.w, GROUND.d]} />
      <meshBasicMaterial map={tex} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
