import { useEffect, useRef, memo } from 'react';
import type { SceneKind } from '@/lib/types';
import { makeRng } from '@/lib/rng';
import { fmtDateTime, demoNow } from '@/lib/time';
import { BOX_TRACKS, boxAt } from '@/data/detections';
import { VIDEO_MANIFEST } from '@/data/video';
import { useStore } from '@/store/useStore';

export type FeedVariant = 'cctv' | 'robot' | 'thermal' | 'drone';
export type FeedSubjects = 'none' | 'two-figures' | 'figures-at-fence' | 'withdraw' | 'vehicle-verge' | 'drone-topdown';

type Props = {
  sensorId: string;
  scene: SceneKind;
  label?: string;
  variant?: FeedVariant;
  subjects?: FeedSubjects;
  showBoxes?: boolean;
  boxes?: { cls: string; conf: number; box: [number, number, number, number] }[];
  className?: string;
  fps?: number;
  onClick?: () => void;
  compact?: boolean;
  seedOffset?: number;
};

const W = 320, H = 180;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Figure = { x: number; y: number; h: number; dir: number; phase: number };

/** Draws one frame of a procedural night scene. t is seconds. */
function drawScene(ctx: CanvasRenderingContext2D, scene: SceneKind, variant: FeedVariant, subjects: FeedSubjects, t: number, seed: number, noise: HTMLCanvasElement) {
  const rng = makeRng(seed);
  const thermal = variant === 'thermal' || scene === 'thermal';
  const bg = thermal ? '#1a1a1a' : variant === 'robot' ? '#0e1a1d' : '#101a20';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const ink = thermal ? 'rgba(255,255,255,0.35)' : 'rgba(170,190,200,0.35)';
  const inkDim = thermal ? 'rgba(255,255,255,0.12)' : 'rgba(170,190,200,0.14)';
  const warm = 'rgba(255,190,110,0.55)';

  const drawFigure = (f: Figure, hot = thermal) => {
    const bob = Math.sin(t * 6 + f.phase) * 1.2;
    const w = f.h * 0.34;
    ctx.fillStyle = hot ? 'rgba(255,255,255,0.95)' : 'rgba(40,52,60,0.95)';
    // head
    ctx.beginPath(); ctx.ellipse(f.x, f.y - f.h + f.h * 0.1 + bob, w * 0.36, f.h * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    // torso
    ctx.beginPath(); ctx.roundRect(f.x - w / 2, f.y - f.h * 0.78 + bob, w, f.h * 0.45, 2); ctx.fill();
    // legs
    const swing = Math.sin(t * 6 + f.phase) * f.h * 0.09 * (f.dir === 0 ? 0.2 : 1);
    ctx.fillRect(f.x - w * 0.42, f.y - f.h * 0.35 + bob, w * 0.36, f.h * 0.35 + swing);
    ctx.fillRect(f.x + w * 0.06, f.y - f.h * 0.35 + bob, w * 0.36, f.h * 0.35 - swing);
    if (hot) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(f.x, f.y - f.h * 0.45, w * 1.2, f.h * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  };

  const drawLongObject = (f: Figure) => {
    ctx.strokeStyle = thermal ? 'rgba(220,220,220,0.8)' : 'rgba(60,70,78,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.x - f.h * 0.45, f.y - f.h * 0.5); ctx.lineTo(f.x + f.h * 0.45, f.y - f.h * 0.5); ctx.stroke();
  };

  const drawFence = (y: number, spacing: number, tall: number, persp = true) => {
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.strokeStyle = inkDim;
    for (let i = 0; i < 40; i++) {
      const x = persp ? (i * spacing) ** 1.18 : i * spacing;
      if (x > W) break;
      const h = persp ? tall * (0.35 + x / W) : tall;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
      if (i % 2 === 0) { ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + spacing * 0.9, y - h * 0.98); ctx.stroke(); }
    }
    // mesh hint
    ctx.strokeStyle = thermal ? 'rgba(255,255,255,0.05)' : 'rgba(170,190,200,0.05)';
    for (let k = 0; k < 8; k++) { const yy = y - (k + 1) * (tall / 8); ctx.beginPath(); ctx.moveTo(0, yy + 6); ctx.lineTo(W, yy - 6); ctx.stroke(); }
  };

  const horizonGlow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  const ground = (y: number, color = thermal ? '#222' : '#16242c') => {
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, color); g.addColorStop(1, thermal ? '#141414' : '#0d151a');
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
  };

  const vehicle = (x: number, y: number, w: number, h: number, lightsOn: boolean, hot = thermal) => {
    ctx.fillStyle = hot ? 'rgba(200,200,200,0.7)' : 'rgba(30,40,46,0.95)';
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 3); ctx.fill();
    ctx.fillStyle = hot ? 'rgba(255,255,255,0.8)' : 'rgba(22,30,36,0.95)';
    ctx.beginPath(); ctx.roundRect(x - w * 0.35, y - h * 1.45, w * 0.7, h * 0.5, 3); ctx.fill();
    if (lightsOn && !hot) { horizonGlow(x - w * 0.35, y - h * 0.5, w * 0.5, 'rgba(255,240,200,0.9)'); horizonGlow(x + w * 0.35, y - h * 0.5, w * 0.5, 'rgba(255,240,200,0.9)'); }
    if (hot) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(x - w * 0.3, y - h * 0.9, w * 0.25, h * 0.4); }
  };

  switch (scene) {
    case 'fence':
    case 'thermal': {
      ground(H * 0.55);
      if (!thermal) horizonGlow(W * 0.8, H * 0.5, 120, 'rgba(255,170,80,0.10)');
      drawFence(H * 0.62, 9, 46);
      // distant light
      if (!thermal) { ctx.fillStyle = warm; ctx.fillRect(W * 0.82, H * 0.5, 2, 2); }
      // fox occasionally
      if (subjects === 'none') {
        const fx = ((t * 12 + seed % 200) % (W + 60)) - 30;
        if (Math.floor((t + seed) / 40) % 3 === 0) {
          ctx.fillStyle = thermal ? 'rgba(255,255,255,0.9)' : 'rgba(50,60,66,0.9)';
          ctx.beginPath(); ctx.ellipse(fx, H * 0.7, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'carpark': {
      ground(H * 0.45, thermal ? '#222' : '#0e181d');
      horizonGlow(W * 0.5, H * 0.18, 160, 'rgba(255,190,110,0.12)');
      ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(0, H * 0.32); ctx.lineTo(W, H * 0.3); ctx.stroke();
      ctx.fillStyle = thermal ? '#2a2a2a' : '#111c22'; ctx.fillRect(0, H * 0.3, W, H * 0.15);
      for (let i = 0; i < 6; i++) vehicle(30 + i * 52, H * 0.62 + (i % 2) * 4, 42, 14, false);
      for (let i = 0; i < 5; i++) vehicle(56 + i * 52, H * 0.9, 50, 17, false);
      ctx.strokeStyle = inkDim; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 52 + 4, H * 0.5); ctx.lineTo(i * 52 + 4, H * 0.66); ctx.stroke(); }
      break;
    }
    case 'corridor': {
      ctx.fillStyle = thermal ? '#1e1e1e' : '#0f181d'; ctx.fillRect(0, 0, W, H);
      const vx = W * 0.5, vy = H * 0.45;
      ctx.strokeStyle = ink;
      for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]] as const) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(vx, vy); ctx.stroke(); }
      ctx.fillStyle = thermal ? '#161616' : '#0b1216'; ctx.fillRect(vx - 24, vy - 16, 48, 32);
      for (let i = 0; i < 4; i++) { const f = 1 - i / 4; horizonGlow(vx, vy - (H * 0.45) * f, 30 * f + 6, 'rgba(200,220,230,0.16)'); }
      ctx.strokeStyle = inkDim; for (let i = 0; i < 3; i++) { const f = 0.35 + i * 0.22; ctx.strokeRect(vx - W * 0.5 * f + 20 * f, vy - H * 0.45 * f + 10, 18 * f, H * 0.45 * f * 1.5); }
      ctx.fillStyle = thermal ? '#242424' : '#0d161b'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      break;
    }
    case 'gate': {
      ground(H * 0.5);
      horizonGlow(W * 0.24, H * 0.3, 90, 'rgba(255,190,110,0.28)');
      // guard house
      ctx.fillStyle = thermal ? '#2c2c2c' : '#15222a'; ctx.fillRect(W * 0.05, H * 0.34, W * 0.24, H * 0.24);
      ctx.fillStyle = 'rgba(255,220,150,0.7)'; ctx.fillRect(W * 0.1, H * 0.4, W * 0.06, H * 0.08);
      // barrier
      ctx.strokeStyle = thermal ? '#ddd' : '#c8d2d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.58); ctx.lineTo(W * 0.72, H * 0.6); ctx.stroke();
      ctx.strokeStyle = thermal ? '#666' : '#e5484d'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.58); ctx.lineTo(W * 0.72, H * 0.6); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      // road
      ctx.strokeStyle = inkDim; ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.42, H * 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W * 0.9, H); ctx.lineTo(W * 0.62, H * 0.5); ctx.stroke();
      // approaching vehicle in cycle
      const cyc = (t % 28) / 28;
      if (cyc < 0.5) { const f = cyc / 0.5; const y = H * 0.52 + f * H * 0.55; vehicle(W * 0.52, y, 20 + f * 60, 8 + f * 22, true); }
      break;
    }
    case 'road': {
      ground(H * 0.48);
      horizonGlow(W * 0.5, H * 0.46, 80, 'rgba(255,190,110,0.08)');
      ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W * 0.45, H * 0.48); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W * 0.55, H * 0.48); ctx.stroke();
      ctx.strokeStyle = inkDim; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.moveTo(W * 0.5, H); ctx.lineTo(W * 0.5, H * 0.48); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = warm; ctx.fillRect(W * 0.3, H * 0.42, 2, 2); ctx.fillRect(W * 0.7, H * 0.43, 2, 2);
      if (subjects === 'vehicle-verge') {
        vehicle(W * 0.72, H * 0.78, 70, 22, false);
        drawFigure({ x: W * 0.6, y: H * 0.82, h: 40, dir: 1, phase: 0 }, false);
      } else {
        const cyc = (t % 36) / 36;
        if (cyc > 0.6) { const f = (cyc - 0.6) / 0.4; vehicle(W * 0.5 + (f - 0.5) * 20, H * 0.5 + f * H * 0.5, 10 + f * 70, 5 + f * 24, true); }
      }
      break;
    }
    case 'yard': {
      ground(H * 0.5);
      ctx.fillStyle = thermal ? '#2a2a2a' : '#14212a'; ctx.fillRect(0, H * 0.18, W, H * 0.34);
      ctx.fillStyle = 'rgba(255,220,150,0.5)'; ctx.fillRect(W * 0.72, H * 0.26, 12, 10);
      ctx.strokeStyle = inkDim; for (let i = 0; i < 9; i++) ctx.strokeRect(20 + i * 34, H * 0.28, 14, 12);
      ctx.strokeStyle = ink; ctx.strokeRect(W * 0.4, H * 0.7, 50, 8);
      horizonGlow(W * 0.15, H * 0.1, 70, 'rgba(200,220,230,0.1)');
      break;
    }
    case 'rooftop': {
      ctx.fillStyle = thermal ? '#141414' : '#0a1116'; ctx.fillRect(0, 0, W, H * 0.4);
      ground(H * 0.4, '#0e171c');
      for (let i = 0; i < 26; i++) { const x = (rng.next() * W); const y = H * 0.3 + rng.next() * H * 0.1; ctx.fillStyle = rng.chance(0.6) ? warm : 'rgba(200,220,230,0.4)'; ctx.fillRect(x, y, 1.5, 1.5); }
      ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(W * 0.8, H * 0.4); ctx.lineTo(W * 0.8, H * 0.05); ctx.stroke();
      if (Math.floor(t) % 2 === 0) { ctx.fillStyle = '#e5484d'; ctx.fillRect(W * 0.8 - 2, H * 0.05, 4, 4); horizonGlow(W * 0.8, H * 0.06, 14, 'rgba(229,72,77,0.35)'); }
      ctx.fillStyle = thermal ? '#2a2a2a' : '#101a20'; ctx.fillRect(0, H * 0.75, W, H * 0.25);
      ctx.strokeStyle = inkDim; ctx.strokeRect(20, H * 0.6, 40, 30); ctx.strokeRect(80, H * 0.66, 30, 24);
      break;
    }
    case 'door': {
      ctx.fillStyle = thermal ? '#222' : '#121d24'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = thermal ? '#1a1a1a' : '#0d151a'; ctx.fillRect(W * 0.38, H * 0.18, W * 0.24, H * 0.62);
      ctx.strokeStyle = ink; ctx.strokeRect(W * 0.38, H * 0.18, W * 0.24, H * 0.62);
      ctx.fillStyle = thermal ? '#444' : '#3d8f6b'; ctx.fillRect(W * 0.66, H * 0.42, 5, 5);
      horizonGlow(W * 0.5, H * 0.12, 60, 'rgba(200,220,230,0.18)');
      ground(H * 0.8, '#0e171c');
      const cyc = (t % 24) / 24;
      if (cyc < 0.4) { const f = cyc / 0.4; drawFigure({ x: W * 0.15 + f * W * 0.33, y: H * 0.86, h: 60, dir: 1, phase: seed }, false); }
      break;
    }
    case 'helipad': {
      ground(H * 0.42);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.72, W * 0.36, H * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = ink; ctx.font = 'bold 34px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('H', W * 0.5, H * 0.82);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.fillStyle = (Math.floor(t * 2) + i) % 8 === 0 ? '#e0a93b' : 'rgba(224,169,59,0.35)'; ctx.fillRect(W * 0.5 + Math.cos(a) * W * 0.36 - 1.5, H * 0.72 + Math.sin(a) * H * 0.16 - 1.5, 3, 3); }
      break;
    }
  }

  // Drone top-down overrides everything with a plan view
  if (subjects === 'drone-topdown' || variant === 'drone') {
    ctx.fillStyle = '#0b1114'; ctx.fillRect(0, 0, W, H);
    // fence line diagonal
    ctx.strokeStyle = 'rgba(170,190,200,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.15); ctx.lineTo(W * 0.9, H * 0.85); ctx.stroke(); ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(170,190,200,0.2)'; for (let i = 0; i < 12; i++) { const f = i / 12; ctx.beginPath(); ctx.moveTo(W * 0.1 + f * W * 0.8 - 4, H * 0.15 + f * H * 0.7 + 4); ctx.lineTo(W * 0.1 + f * W * 0.8 + 4, H * 0.15 + f * H * 0.7 - 4); ctx.stroke(); }
    // road at right
    ctx.strokeStyle = 'rgba(170,190,200,0.25)'; ctx.beginPath(); ctx.moveTo(W * 0.85, 0); ctx.lineTo(W * 0.95, H); ctx.stroke();
    // lit sector
    horizonGlow(W * 0.55, H * 0.5, 150, 'rgba(255,200,120,0.12)');
    // subjects as hot blobs
    const s1x = subjects === 'withdraw' ? W * 0.7 + Math.sin(t) * 2 : W * 0.5;
    const s1y = subjects === 'withdraw' ? H * 0.3 : H * 0.62;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(s1x, s1y, 4, 6, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s1x + 26, s1y - 14, 4, 6, 0.6, 0, Math.PI * 2); ctx.fill();
    horizonGlow(s1x, s1y, 18, 'rgba(255,255,255,0.25)'); horizonGlow(s1x + 26, s1y - 14, 18, 'rgba(255,255,255,0.25)');
    if (subjects === 'withdraw') { ctx.fillStyle = 'rgba(200,200,200,0.7)'; ctx.beginPath(); ctx.roundRect(W * 0.86, H * 0.2, 12, 26, 3); ctx.fill(); }
    // crosshair
    ctx.strokeStyle = 'rgba(79,209,197,0.6)'; ctx.beginPath(); ctx.moveTo(W / 2 - 14, H / 2); ctx.lineTo(W / 2 - 4, H / 2); ctx.moveTo(W / 2 + 4, H / 2); ctx.lineTo(W / 2 + 14, H / 2); ctx.moveTo(W / 2, H / 2 - 14); ctx.lineTo(W / 2, H / 2 - 4); ctx.moveTo(W / 2, H / 2 + 4); ctx.lineTo(W / 2, H / 2 + 14); ctx.stroke();
  } else if (subjects === 'two-figures' || subjects === 'figures-at-fence' || subjects === 'withdraw') {
    const f1: Figure = { x: W * 0.42, y: H * 0.78, h: 46, dir: 0, phase: 1 };
    const f2: Figure = { x: W * 0.66, y: H * 0.7, h: 40, dir: 0, phase: 2 };
    if (subjects === 'figures-at-fence') { f2.x = W * 0.6; f2.y = H * 0.66; f2.h = 26; }
    if (subjects === 'withdraw') { const f = Math.min(1, (t % 20) / 12); f1.x = W * 0.42 + f * W * 0.5; f1.dir = 1; f2.x = W * 0.66 + f * W * 0.4; f2.dir = 1; f1.y = H * 0.78 - f * H * 0.2; f2.y = H * 0.7 - f * H * 0.14; }
    drawFigure(f2); drawFigure(f1); drawLongObject(f1);
  }

  // grain
  ctx.globalAlpha = thermal ? 0.18 : 0.12;
  ctx.drawImage(noise, -Math.floor(rng.next() * 40) - Math.floor((t * 60) % 40), -Math.floor((t * 37) % 40));
  ctx.globalAlpha = 1;
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

let noiseCanvas: HTMLCanvasElement | null = null;
function getNoise() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = W + 40; c.height = H + 40;
  const x = c.getContext('2d')!;
  const img = x.createImageData(c.width, c.height);
  const rng = makeRng(7);
  for (let i = 0; i < img.data.length; i += 4) { const v = 60 + Math.floor(rng.next() * 195); img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

function CctvFeedInner({ sensorId, scene, label, variant = 'cctv', subjects = 'none', showBoxes = true, boxes, className = '', fps = 15, onClick, compact, seedOffset = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tsRef = useRef<HTMLSpanElement>(null);
  const replayAt = useStore((s) => s.replayAt);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const videoSrc = VIDEO_MANIFEST[scene];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let raf = 0;
    let last = 0;
    const seed = hash(sensorId) + seedOffset;
    const noise = getNoise();
    const tracks = boxes ? null : BOX_TRACKS[sensorId] ?? [];
    const start = performance.now() - (seed % 20000);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / (reduced ? 4 : fps)) return;
      last = now;
      const t = (now - start) / 1000;
      if (ctx && !videoSrc) drawScene(ctx, scene, variant, subjects, t, seed, noise);
      if (tsRef.current) tsRef.current.textContent = fmtDateTime(replayAt ?? demoNow());
      const svg = svgRef.current;
      if (svg && showBoxes) {
        const list = boxes ?? (tracks ?? []).map((tr) => ({ cls: tr.cls, conf: tr.conf, box: boxAt(tr, t) }));
        const groups = svg.querySelectorAll('g[data-box]');
        groups.forEach((g, i) => {
          const b = list[i];
          if (!b) { (g as SVGGElement).style.display = 'none'; return; }
          (g as SVGGElement).style.display = '';
          const rect = g.querySelector('rect')!; const text = g.querySelector('text')!;
          rect.setAttribute('x', (b.box[0] * 100).toFixed(2)); rect.setAttribute('y', (b.box[1] * 100).toFixed(2));
          rect.setAttribute('width', (b.box[2] * 100).toFixed(2)); rect.setAttribute('height', (b.box[3] * 100).toFixed(2));
          text.setAttribute('x', (b.box[0] * 100 + 0.8).toFixed(2)); text.setAttribute('y', (b.box[1] * 100 - 1.5).toFixed(2));
          text.textContent = `${b.cls} ${Math.round(b.conf * 100)}%`;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sensorId, scene, variant, subjects, showBoxes, boxes, fps, replayAt, reduced, seedOffset, videoSrc]);

  const filter = variant === 'robot' ? 'cctv-robot' : variant === 'thermal' || scene === 'thermal' ? 'cctv-thermal' : 'cctv';

  return (
    <div
      className={`relative overflow-hidden bg-surface-inset scanlines ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{ aspectRatio: '16 / 9' }}
    >
      {videoSrc ? (
        <video src={videoSrc} muted loop playsInline autoPlay className={`absolute inset-0 w-full h-full object-cover ${filter}`} />
      ) : (
        <canvas ref={canvasRef} width={W} height={H} className={`absolute inset-0 w-full h-full ${filter}`} style={{ imageRendering: 'auto' }} />
      )}
      {showBoxes && (
        <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          {[0, 1, 2].map((i) => (
            <g key={i} data-box style={{ display: 'none' }}>
              <rect fill="none" stroke="var(--agent)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              <text fill="var(--agent)" fontSize={compact ? 4.5 : 3.2} fontFamily="IBM Plex Mono, monospace" style={{ paintOrder: 'stroke', stroke: 'rgba(10,16,19,0.8)', strokeWidth: 0.8 }} />
            </g>
          ))}
        </svg>
      )}
      <div className={`absolute left-1.5 top-1 flex items-center gap-1.5 mono ${compact ? 'text-[9px]' : 'text-11'} text-text-primary/90 pointer-events-none`} style={{ textShadow: '0 0 3px #000' }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-alarm blink" />
        <span>{sensorId}</span>
        {label && !compact && <span className="text-text-muted">· {label}</span>}
      </div>
      <div className={`absolute right-1.5 bottom-1 mono ${compact ? 'text-[9px]' : 'text-11'} text-text-primary/80 pointer-events-none`} style={{ textShadow: '0 0 3px #000' }}>
        {replayAt && <span className="text-advisory mr-1.5">REPLAY</span>}
        <span ref={tsRef} />
      </div>
      {variant === 'thermal' || scene === 'thermal' ? (
        <div className="absolute left-1.5 bottom-1 mono text-[9px] text-text-muted pointer-events-none">WHITE HOT</div>
      ) : variant === 'drone' ? (
        <div className="absolute left-1.5 bottom-1 mono text-[9px] text-text-muted pointer-events-none">EO · GIMBAL -90°</div>
      ) : variant === 'robot' ? (
        <div className="absolute left-1.5 bottom-1 mono text-[9px] text-text-muted pointer-events-none">FWD CAM · IR</div>
      ) : null}
    </div>
  );
}

export const CctvFeed = memo(CctvFeedInner);
