import { useMemo } from 'react';
import * as THREE from 'three';
import { BUILDINGS, ROADS, ACCESS_ROAD, GROUND, HELIPAD, LIGHTS, type Building } from './campConfig';
import { useStore } from '@/store/useStore';
import { makeRng } from '@/lib/rng';

/** Box with lighting baked into vertex colours: top lit, sides shaded by normal. */
function bakedBox(w: number, h: number, d: number, hex: string) {
  const g = new THREE.BoxGeometry(w, h, d);
  const base = new THREE.Color(hex);
  const n = g.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(n.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), nx = n.getX(i), nz = n.getZ(i);
    let f = 0.55;
    if (ny > 0.5) f = 1.0;
    else if (ny < -0.5) f = 0.2;
    else if (nz > 0.5) f = 0.78; // south face, faces the camera
    else if (nx > 0.5) f = 0.62;
    else if (nx < -0.5) f = 0.5;
    else f = 0.42;
    c.copy(base).multiplyScalar(f);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function BuildingMesh({ b, dimmed }: { b: Building; dimmed: boolean }) {
  const [w, h, d] = b.size;
  const geom = useMemo(() => {
    if (b.shape === 'cylinder') return new THREE.CylinderGeometry(w / 2, w / 2, h, 18);
    return bakedBox(w, h, d, b.color);
  }, [b, w, h, d]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geom, 20), [geom]);
  const opacity = dimmed ? 0.3 : 1;
  const y = b.shape === 'cylinder' ? h / 2 : h / 2 + (b.position[1] ?? 0);
  return (
    <group position={[b.position[0], y, b.position[2]]} rotation={[0, b.rotation ?? 0, 0]}>
      <mesh geometry={geom}>
        {b.shape === 'cylinder' ? (
          <meshLambertMaterial color={b.color} transparent opacity={opacity} />
        ) : (
          <meshLambertMaterial vertexColors transparent opacity={opacity} />
        )}
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={b.emissive ?? '#3a5060'} transparent opacity={dimmed ? 0.15 : b.emissive ? 0.9 : 0.35} />
      </lineSegments>
      {b.shape === 'tower' && (
        <mesh position={[0, h / 2 + 1, 0]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#e5484d" />
        </mesh>
      )}
    </group>
  );
}

export function Buildings() {
  const zoneId = useStore((s) => s.selectedZoneId);
  return (
    <group>
      {BUILDINGS.map((b) => (
        <BuildingMesh key={b.id} b={b} dimmed={!!zoneId && zoneId !== 'perimeter' && b.zoneId !== zoneId} />
      ))}
    </group>
  );
}

export function Ground() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 384;
    const x = c.getContext('2d')!;
    x.fillStyle = '#16232b';
    x.fillRect(0, 0, c.width, c.height);
    const rng = makeRng(3);
    for (let i = 0; i < 9000; i++) {
      const v = 16 + Math.floor(rng.next() * 22);
      x.fillStyle = `rgba(${v + 4},${v + 12},${v + 16},${0.35 + rng.next() * 0.4})`;
      x.fillRect(rng.next() * c.width, rng.next() * c.height, 1 + rng.next() * 3, 1 + rng.next() * 3);
    }
    // faint darker patches
    for (let i = 0; i < 40; i++) {
      const g = x.createRadialGradient(rng.next() * c.width, rng.next() * c.height, 0, 0, 0, 0);
      void g;
      x.fillStyle = `rgba(0,0,0,${rng.next() * 0.12})`;
      x.beginPath(); x.ellipse(rng.next() * c.width, rng.next() * c.height, 20 + rng.next() * 60, 10 + rng.next() * 30, rng.next() * 3, 0, Math.PI * 2); x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[GROUND.w + 400, GROUND.d + 400]} />
        <meshLambertMaterial map={tex} color="#b8c4cc" />
      </mesh>
    </group>
  );
}

export function Roads() {
  const dashes = useMemo(() => {
    const items: { x: number; z: number; rot: number }[] = [];
    for (const r of [...ROADS, ACCESS_ROAD]) {
      if (r.width < 6) continue;
      const dx = r.to[0] - r.from[0], dz = r.to[1] - r.from[1];
      const len = Math.hypot(dx, dz);
      const n = Math.floor(len / 8);
      const rot = Math.atan2(dx, dz);
      for (let i = 1; i < n; i++) {
        const f = i / n;
        items.push({ x: r.from[0] + dx * f, z: r.from[1] + dz * f, rot });
      }
    }
    return items;
  }, []);
  const inst = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 3), new THREE.MeshBasicMaterial({ color: '#4a5a64' }), dashes.length);
    const o = new THREE.Object3D();
    dashes.forEach((d, i) => {
      o.position.set(d.x, 0.08, d.z);
      o.rotation.set(-Math.PI / 2, 0, -d.rot);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [dashes]);
  return (
    <group>
      {[...ROADS, ACCESS_ROAD].map((r, i) => {
        const dx = r.to[0] - r.from[0], dz = r.to[1] - r.from[1];
        const len = Math.hypot(dx, dz);
        const rot = Math.atan2(dx, dz);
        return (
          <mesh key={i} position={[(r.from[0] + r.to[0]) / 2, 0.05, (r.from[1] + r.to[1]) / 2]} rotation={[-Math.PI / 2, 0, -rot]}>
            <planeGeometry args={[r.width, len + r.width]} />
            <meshLambertMaterial color="#1a262e" />
          </mesh>
        );
      })}
      <primitive object={inst} />
    </group>
  );
}

export function Helipad() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d')!;
    x.clearRect(0, 0, 256, 256);
    x.strokeStyle = '#8fa3ad'; x.lineWidth = 6;
    x.beginPath(); x.arc(128, 128, 116, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#8fa3ad'; x.font = 'bold 150px Archivo, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('H', 128, 136);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={HELIPAD.position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[HELIPAD.radius + 2, 32]} />
        <meshLambertMaterial color="#1c2830" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[HELIPAD.radius * 2, HELIPAD.radius * 2]} />
        <meshBasicMaterial map={tex} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

let glowTex: THREE.CanvasTexture | null = null;
function getGlow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function StreetLights() {
  const glow = useMemo(() => getGlow(), []);
  return (
    <group>
      {LIGHTS.map((l, i) => (
        <group key={i} position={l.position}>
          {i < 6 && <pointLight color={l.color} intensity={l.intensity * 6} distance={l.intensity > 40 ? 90 : 55} decay={1.6} />}
          <mesh>
            <sphereGeometry args={[0.6, 6, 6]} />
            <meshBasicMaterial color={l.color} />
          </mesh>
          <sprite scale={[14, 14, 1]}>
            <spriteMaterial map={glow} color={l.color} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <mesh position={[0, -l.position[1] / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, l.position[1], 5]} />
            <meshBasicMaterial color="#1f2b33" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
