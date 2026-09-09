import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { ZONE_CAMERA, DEFAULT_CAMERA } from './campConfig';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Orbit controls plus the one orchestrated moment: the fly-in from camp to zone. */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const zoneId = useStore((s) => s.selectedZoneId);
  const view = useStore((s) => s.view);
  const focusReport = useStore((s) => s.focusReport);
  const anim = useRef<{ from: { p: THREE.Vector3; t: THREE.Vector3 }; to: { p: THREE.Vector3; t: THREE.Vector3 }; start: number; dur: number } | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (view !== 'map') return;
    const c = controls.current;
    if (!c) return;
    let toP: THREE.Vector3, toT: THREE.Vector3;
    if (zoneId) {
      const z = ZONE_CAMERA[zoneId];
      const target = new THREE.Vector3(...z.target);
      // three-quarter view from the south-east, lifted so the zone sits in the upper part of the stage
      const dir = new THREE.Vector3(0.55, 0.62, 0.62).normalize();
      toP = target.clone().add(dir.multiplyScalar(z.distance));
      // shift the look-at toward the camera on the ground plane so the zone renders above the hub panel
      const ground = new THREE.Vector3(toP.x - target.x, 0, toP.z - target.z).normalize();
      toT = target.clone().add(ground.multiplyScalar(z.distance * 0.3));
    } else {
      toP = new THREE.Vector3(...DEFAULT_CAMERA.position);
      toT = new THREE.Vector3(...DEFAULT_CAMERA.target);
    }
    if (reduced) {
      camera.position.copy(toP);
      c.target.copy(toT);
      c.update();
      anim.current = null;
      return;
    }
    anim.current = { from: { p: camera.position.clone(), t: c.target.clone() }, to: { p: toP, t: toT }, start: performance.now(), dur: zoneId ? 1200 : 900 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, view]);

  useFrame(() => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    const f = Math.min(1, (performance.now() - a.start) / a.dur);
    const e = easeOut(f);
    camera.position.lerpVectors(a.from.p, a.to.p, e);
    c.target.lerpVectors(a.from.t, a.to.t, e);
    c.update();
    if (f >= 1) anim.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={THREE.MathUtils.degToRad(15)}
      maxPolarAngle={THREE.MathUtils.degToRad(75)}
      minDistance={40}
      maxDistance={520}
      enablePan
      panSpeed={0.6}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      target={DEFAULT_CAMERA.target}
      enabled={!focusReport}
      onStart={() => { anim.current = null; }}
    />
  );
}
