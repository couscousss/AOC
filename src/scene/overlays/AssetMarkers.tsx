import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { currentPosition, routeLength } from '@/data/assets';
import { demoNow } from '@/lib/time';
import type { Asset } from '@/lib/types';

/** Live markers for robots, drones and vehicles. Positions lerp toward store state every frame. */
export function AssetMarkers() {
  const assets = useStore((s) => s.assets);
  return (
    <group>
      {assets.map((a) => <AssetMarker key={a.id} id={a.id} />)}
    </group>
  );
}

const tmp = new THREE.Vector3();
let glowTex: THREE.CanvasTexture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function AssetMarker({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null);
  const line = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const asset = useStore((s) => s.assets.find((a) => a.id === id));
  const replayAt = useStore((s) => s.replayAt);
  const selectZone = useStore((s) => s.selectZone);
  const openCapability = useStore((s) => s.openCapability);

  useFrame((_, dt) => {
    const a = useStore.getState().assets.find((x) => x.id === id);
    const g = group.current;
    if (!a || !g) return;
    const { position, heading } = currentPosition(a);
    let x = position[0], z = position[2];
    if (replayAt && a.route && a.routeProgress !== undefined && a.routeLoop) {
      // approximate replay: rewind along the patrol loop by the elapsed demo time
      const backMetres = ((demoNow() - replayAt) / 1000) * a.speed;
      const loopLen = routeLength(a.route);
      const p = (((a.routeProgress - backMetres / loopLen) % 1) + 1) % 1;
      const pos = currentPosition({ ...a, routeProgress: p }).position;
      x = pos[0]; z = pos[2];
    }
    const alt = a.class === 'drone' ? a.altitude ?? 0 : 0;
    tmp.set(x, alt + 1.2, z);
    const k = 1 - Math.pow(0.001, dt);
    g.position.lerp(tmp, k);
    g.rotation.y = -THREE.MathUtils.degToRad(heading);
    if (line.current) {
      line.current.scale.y = Math.max(0.01, g.position.y - 0.5);
      line.current.position.y = -g.position.y / 2;
    }
  });

  if (!asset) return null;
  const isDrone = asset.class === 'drone';
  const color = isDrone ? '#4fd1c5' : asset.state === 'maintenance' ? '#e0a93b' : asset.state === 'docked' || asset.state === 'charging' ? '#7a8f9c' : '#dce6ec';
  const p0 = currentPosition(asset).position;

  return (
    <group ref={group} position={[p0[0], (asset.altitude ?? 0) + 1.2, p0[2]]}>
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); selectZone(isDrone ? 'dronenest' : 'robotdock'); openCapability(isDrone ? 'aerial' : 'robotics'); }}
      >
        {isDrone ? (
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[1.6, 3.2, 4]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[2.4, 1.4, 3.2]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )}
        <mesh position={[0, 0, isDrone ? 0 : 2]}>
          <boxGeometry args={[0.5, 0.5, 1]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <sprite scale={[8, 8, 1]}>
          <spriteMaterial map={glowTexture()} color={color} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
      {isDrone && (
        <mesh ref={line} position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}
      {(hover || (asset.state !== 'docked' && asset.state !== 'charging' && asset.state !== 'maintenance')) && (
        <Html position={[0, 3, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[15, 0]}>
          <div className={`mono text-11 whitespace-nowrap px-1 rounded ${hover ? 'panel' : ''}`} style={{ color, textShadow: '0 0 4px #000' }}>
            {asset.callsign}
            {hover && <Detail a={asset} />}
          </div>
        </Html>
      )}
    </group>
  );
}

function Detail({ a }: { a: Asset }) {
  return (
    <div className="font-sans text-text-primary text-11 mt-0.5">
      <div>{a.currentTask ?? a.state}</div>
      <div className="text-text-muted">{a.battery}% · {a.state}{a.altitude ? ` · ${Math.round(a.altitude)}m` : ''}</div>
    </div>
  );
}
