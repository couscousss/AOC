import type { SceneKind } from '@/lib/types';
import { VLM_QUESTIONS, RETRO_QUERIES, RETRO_FALLBACK, type RetroResult } from '@/data/copy';

/** One line of the observer's log: what the model saw, what the duty officer asked, what Trace answered. */
export type LogEntry = {
  id: string;
  kind: 'observation' | 'question' | 'answer';
  ts: number;
  text: string;
  cameraId?: string;
  /** Trace's short note when a free-text question was mapped to the nearest one it can answer */
  note?: string;
  /** still being streamed in */
  stream: boolean;
  streamKey: string | number;
};

const STOP = new Set(['the', 'and', 'are', 'was', 'were', 'has', 'have', 'had', 'that', 'this', 'with', 'from', 'for', 'you', 'your', 'they', 'them', 'their', 'there', 'here', 'about', 'can', 'could', 'would', 'should', 'does', 'did', 'not', 'any', 'all', 'these', 'those', 'than', 'then', 'been', 'being', 'into', 'onto', 'show', 'tell']);
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Hand-picked vocabulary per scripted question so free text lands on the nearest one. */
const VOCAB: string[][] = [
  ['seen', 'before', 'camp', 'known', 'recognise', 'recognize', 'identify', 'identity', 'who', 'badge', 'record', 'history', 'visitor', 'contractor', 'match', 'face', 'people', 'either', 'personnel', 'roster', 'staff', 'familiar', 'previously', 'prior'],
  ['object', 'carrying', 'carry', 'carried', 'holding', 'held', 'weapon', 'tool', 'item', 'thing', 'long', 'bolt', 'cutter', 'cutters', 'rifle', 'gun', 'firearm', 'what', 'hands', 'bar', 'pipe', 'pole'],
  ['normal', 'usual', 'typical', 'compare', 'comparison', 'baseline', 'activity', 'section', 'fence', 'pattern', 'unusual', 'precedent', 'hour', 'night', 'often', 'frequently', 'expected', 'anomalous', 'happen', 'happens', 'usually'],
];

export type QuestionMatch = { q: string; a: string; direct: boolean };

/** Exact question → its answer. Anything else → the nearest scripted question, flagged so Trace can say so. */
export function matchQuestion(input: string): QuestionMatch {
  const norm = (s: string) => s.toLowerCase().replace(/[?.!,]/g, '').trim();
  const exact = VLM_QUESTIONS.find((x) => norm(x.q) === norm(input));
  if (exact) return { q: exact.q, a: exact.a, direct: true };
  const inTok = tokens(input);
  let bestI = 0;
  let bestScore = -1;
  VLM_QUESTIONS.forEach((c, i) => {
    const vocab = new Set([...VOCAB[i], ...tokens(c.q)]);
    const score = inTok.filter((t) => vocab.has(t)).length;
    if (score > bestScore) { bestScore = score; bestI = i; }
  });
  const need = Math.max(1, Math.ceil(inTok.length * 0.4));
  const c = VLM_QUESTIONS[bestI];
  return { q: c.q, a: c.a, direct: bestScore >= need };
}

export const nearestNote = (q: string) => `I can't answer that directly from this feed. The nearest question I can answer is "${q}", so here is that.`;

export const firstSentence = (s: string) => {
  const i = s.indexOf('. ');
  return i > 0 ? s.slice(0, i + 1) : s;
};

export type RetroOutcome = { title: string; summary: string; results: RetroResult[]; matched: boolean; /** simulated query time */ ms: number };

const hash = (s: string) => { let h = 11; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h; };

/** Regex-matched scripted retrospective search over the last 30 days. Unmatched queries get Trace's guidance. */
export function runRetro(query: string): RetroOutcome {
  const q = query.trim();
  const ms = 220 + (hash(q) % 400);
  const hit = RETRO_QUERIES.find((r) => r.match.test(q));
  if (!hit) return { title: RETRO_FALLBACK.title, summary: RETRO_FALLBACK.summary, results: [], matched: false, ms };
  return { title: hit.title, summary: hit.summary, results: hit.results, matched: true, ms };
}

/** Example searches for the empty state. Each one matches a scripted query. */
export const RETRO_EXAMPLES = [
  'every vehicle that entered Gate 2 after 2200 and did not leave',
  'people on exterior cameras in the last two hours',
  'where is the white van SGP-7716',
];

/** The camera whose archive a result thumbnail is drawn from, by scene. */
export function cameraForScene(scene: SceneKind): string {
  switch (scene) {
    case 'road': return 'CAM-RD-E';
    case 'gate': return 'CAM-G1-01';
    case 'carpark': return 'CAM-MP-01';
    case 'thermal': return 'THM-P-NE';
    case 'corridor': return 'CAM-HQ-03';
    case 'door': return 'CAM-HQ-01';
    case 'yard': return 'CAM-BK-02';
    case 'rooftop': return 'CAM-HQ-04';
    case 'helipad': return 'CAM-HP-01';
    default: return 'PTZ-P-NE';
  }
}
