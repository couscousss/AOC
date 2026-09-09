import type { CommandResult, CapabilityId, ZoneId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { RETRO_QUERIES, SUMMARY_LAST_4H, COMMAND_SUGGESTIONS } from '@/data/copy';
import { ZONES, CAPABILITY_META } from '@/data/zones';
import { currentPosition } from '@/data/assets';
import { fmtTime } from '@/lib/time';
import { agentName } from '@/data/agents';

const ZONE_WORDS: [RegExp, ZoneId][] = [
  [/motor\s*pool|vehicles?\b(?!.*gate)/i, 'motorpool'],
  [/main\s*gate|gate\s*1\b|\bgate\b(?!\s*2)/i, 'gate'],
  [/perimeter|fence/i, 'perimeter'],
  [/\bhq\b|headquarters|command building/i, 'hq'],
  [/armoury|armory/i, 'armoury'],
  [/barracks|accommodation/i, 'barracks'],
  [/helipad/i, 'helipad'],
  [/drone\s*nest|\bnest\b/i, 'dronenest'],
  [/robot\s*dock|\bdock\b/i, 'robotdock'],
];

const CAP_WORDS: [RegExp, CapabilityId][] = [
  [/drone|aerial|fleet.*drone|drone.*fleet|airspace/i, 'aerial'],
  [/robot|dog|ugv|fleet/i, 'robotics'],
  [/video|camera|cctv/i, 'video'],
  [/scene|vlm|describe/i, 'scene'],
  [/patrol/i, 'patrol'],
  [/environment|fire|smoke|gas|flood|weather|muster/i, 'environmental'],
  [/facilit|power|generator|fuel|hvac|lighting|door/i, 'facilities'],
  [/cyber|network|credential|badge/i, 'cyber'],
  [/access|anpr|visitor|plate/i, 'access'],
];

export function runCommand(raw: string): CommandResult {
  const q = raw.trim();
  const s = useStore.getState();
  if (!q) return { kind: 'fallback', title: 'Ask anything about the camp', body: 'Try one of the suggestions.' };

  // Global views
  if (/approval|pending|awaiting/i.test(q)) {
    const p = s.actions.filter((a) => a.approvalState === 'pending');
    return {
      kind: 'status',
      title: p.length ? `${p.length} open approval${p.length > 1 ? 's' : ''}` : 'No open approvals',
      body: p.length ? undefined : 'The queue is empty. Warden has nothing waiting on a person right now.',
      items: p.map((a) => ({ label: a.title, sub: `${agentName(a.agentId)} · proposed ${fmtTime(a.ts)}` })),
      go: { view: 'approvals' },
    };
  }
  if (/^(show|go to|open)?\s*(the\s*)?(agents?|roster)\b/i.test(q)) return { kind: 'nav', title: 'Agents', body: 'Opening the agent roster.', go: { view: 'agents' } };
  if (/incident|case/i.test(q) && !/summar/i.test(q)) {
    const live = s.incidents.find((i) => i.state !== 'closed');
    return { kind: 'nav', title: live ? `Open incident ${live.id}` : 'Incidents', body: live ? live.title : `${s.incidents.length} incidents in the last 24 hours, all closed.`, go: { view: 'incidents', incidentId: live?.id } };
  }
  if (/audit|governance|autonomy|policy/i.test(q)) return { kind: 'nav', title: 'Governance', body: 'Autonomy levels, audit log and policy.', go: { view: 'governance' } };
  if (/health|uptime|offline|degraded/i.test(q)) {
    const off = s.sensors.filter((x) => x.status === 'offline');
    const deg = s.sensors.filter((x) => x.status === 'degraded');
    return { kind: 'status', title: `${off.length} offline, ${deg.length} degraded`, items: [...off, ...deg].map((x) => ({ label: `${x.id} · ${x.label}`, sub: x.status })), go: { view: 'health' } };
  }

  // Asset status: "what is Kestrel-2 doing"
  const asset = s.assets.find((a) => q.toLowerCase().includes(a.callsign.toLowerCase()));
  if (asset) {
    const { position } = currentPosition(asset);
    return {
      kind: 'status',
      title: `${asset.callsign} — ${asset.currentTask ?? asset.state}`,
      body: `${asset.model}. Battery ${asset.battery}%, ${asset.state}, connectivity ${asset.connectivity}. Position ${Math.round(position[0])}, ${Math.round(position[2])}${asset.altitude ? `, ${Math.round(asset.altitude)}m AGL` : ''}. ${asset.maintenance.flagged ? `Fitter note: ${asset.maintenance.flagged}` : 'No maintenance flags.'}`,
      go: { zone: asset.class === 'drone' ? 'dronenest' : 'robotdock', capability: asset.class === 'drone' ? 'aerial' : 'robotics' },
    };
  }

  // Summaries
  if (/summar|what happened|brief|report/i.test(q)) return { kind: 'report', title: 'Summary of the last four hours', body: SUMMARY_LAST_4H };

  // Retrospective search
  for (const r of RETRO_QUERIES) {
    if (r.match.test(q)) return { kind: 'search', title: r.title, body: r.summary, items: r.results.map((x) => ({ label: x.label, sub: x.sub, ts: x.ts, scene: x.scene })) };
  }

  // Navigation to zone / capability
  const zone = ZONE_WORDS.find(([re]) => re.test(q))?.[1];
  const cap = CAP_WORDS.find(([re]) => re.test(q))?.[1];
  if (zone || cap) {
    const z = zone ?? (cap ? ZONES.find((zz) => zz.capabilities.includes(cap))?.id ?? 'hq' : 'hq');
    const zz = ZONES.find((x) => x.id === z)!;
    const c = cap && zz.capabilities.includes(cap) ? cap : zone ? undefined : cap;
    const capName = c ? CAPABILITY_META[c].name : undefined;
    return { kind: 'nav', title: capName ? `${zz.name} · ${capName}` : zz.name, body: zz.description, go: { zone: z, capability: c ?? zz.capabilities[0] } };
  }

  // Graceful fallback, in voice
  const nearest = COMMAND_SUGGESTIONS[Math.abs(hashStr(q)) % COMMAND_SUGGESTIONS.length];
  return {
    kind: 'fallback',
    title: 'I can\'t answer that one yet',
    body: `I can navigate, search the last 30 days, report on any asset or agent, and summarise. The nearest thing I can do is "${nearest}".`,
    items: [{ label: nearest, sub: 'Suggested' }],
  };
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function applyGo(go: NonNullable<CommandResult['go']>) {
  const s = useStore.getState();
  if (go.incidentId) { s.openIncident(go.incidentId); return; }
  if (go.view) { s.setView(go.view); if (go.view === 'incidents') s.openIncident(null); return; }
  if (go.zone) { s.selectZone(go.zone); if (go.capability) s.openCapability(go.capability); }
}
