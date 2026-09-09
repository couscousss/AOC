import { useEffect } from 'react';
import { useStore, nextId } from '@/store/useStore';
import { FEED_SEEDS, VLM_IDLE } from '@/data/copy';
import { DETECTIONS } from '@/data/detections';
import { SENSOR_BY_ID } from '@/data/sensors';
import { demoNow } from '@/lib/time';
import { makeRng } from '@/lib/rng';

/**
 * Keeps the demo alive: moves assets, scrolls the agent feed, drops resolved alerts into the rail,
 * rotates the idle VLM description. Deterministic — seeded, not Math.random.
 */
export function Ticker() {
  useEffect(() => {
    const rng = makeRng(99);
    let last = performance.now();
    let feedI = 0;
    let vlmI = 0;
    let alertI = 0;
    let feedAcc = 0, alertAcc = 0, vlmAcc = 0, sparkAcc = 0;
    let feedNext = 5000, alertNext = 24000, vlmNext = 9000;
    const idleDetections = DETECTIONS.filter((d) => d.disposition === 'dismissed').slice(-60);

    const loop = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      const s = useStore.getState();
      if (s.replayAt) return; // frozen in replay
      s.tickAssets(dt);

      feedAcc += dt * 1000;
      if (feedAcc >= feedNext) {
        feedAcc = 0; feedNext = 4500 + rng.next() * 4000;
        const seed = FEED_SEEDS[feedI++ % FEED_SEEDS.length];
        s.pushFeed(seed.agentId, seed.text);
      }

      alertAcc += dt * 1000;
      if (alertAcc >= alertNext && s.scenario.status !== 'running') {
        alertAcc = 0; alertNext = 20000 + rng.next() * 20000;
        const d = idleDetections[alertI++ % idleDetections.length];
        const sensor = SENSOR_BY_ID[d.sensorId];
        const ts = demoNow();
        s.pushAlert({
          id: nextId('AL-LIVE'), ts, severity: 'low', zoneId: sensor?.zoneId ?? 'hq',
          text: `${d.class[0].toUpperCase() + d.class.slice(1)} on ${d.sensorId} (${Math.round(d.confidence * 100)}%)`,
          agentId: 'sentry', state: 'resolved', resolution: `dismissed by Sift — ${d.dispositionReason.replace(/^dismissed — /, '')}`, position: sensor?.position,
        });
        s.pushFeed('sift', `Dismissed ${d.sensorId} ${d.class} ${d.confidence.toFixed(2)} — ${d.dispositionReason.replace(/^dismissed — /, '')}.`);
      }

      vlmAcc += dt * 1000;
      if (vlmAcc >= vlmNext && !s.vlm.live) {
        vlmAcc = 0; vlmNext = 8000 + rng.next() * 4000;
        vlmI = (vlmI + 1) % VLM_IDLE.length;
        s.setVlm(VLM_IDLE[vlmI].cameraId, VLM_IDLE[vlmI].text, false);
      }

      sparkAcc += dt;
      if (sparkAcc >= 30) {
        sparkAcc = 0;
        useStore.setState((st) => ({ agents: st.agents.map((a) => ({ ...a, activity: [...a.activity.slice(1), Math.max(0, Math.round(a.activity[a.activity.length - 1] + (rng.next() - 0.5) * 4))] })) }));
      }
    }, 100);
    return () => clearInterval(loop);
  }, []);
  return null;
}
