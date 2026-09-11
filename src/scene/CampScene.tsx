import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Buildings, Ground, Roads, Helipad, StreetLights } from './buildings';
import { Fence } from './fence';
import { CameraRig } from './cameraRig';
import { ZoneRegions } from './overlays/ZoneRegions';
import { CoverageCones } from './overlays/CoverageCones';
import { AssetMarkers } from './overlays/AssetMarkers';
import { SensorDots } from './overlays/SensorDots';
import { Geofences } from './overlays/Geofences';
import { Heatmap } from './overlays/Heatmap';
import { AlertBeams } from './overlays/AlertBeams';
import { useStore } from '@/store/useStore';
import { DEFAULT_CAMERA } from './campConfig';

const FOG = new THREE.Color('#0d1418');

export function CampScene() {
  const overlays = useStore((s) => s.overlays);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: DEFAULT_CAMERA.position, fov: 42, near: 1, far: 2000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(FOG);
        scene.fog = new THREE.FogExp2(FOG.getHex(), 0.0021);
        gl.toneMapping = THREE.NoToneMapping;
      }}
      shadows={false}
    >
      {/* cold ambient from above, pre-dawn */}
      <hemisphereLight args={['#4a728a', '#0a1014', 1.8]} />
      <directionalLight position={[-120, 200, -80]} intensity={0.7} color="#8fb3c9" />
      <StreetLights />

      <Ground />
      <Roads />
      <Helipad />
      <Buildings />
      <Fence />

      <ZoneRegions />
      {overlays.coverage && <CoverageCones />}
      {overlays.sensors && <SensorDots />}
      {overlays.geofences && <Geofences />}
      {overlays.heatmap && <Heatmap />}
      {overlays.assets && <AssetMarkers />}
      <AlertBeams />

      <CameraRig />
    </Canvas>
  );
}
