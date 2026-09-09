import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { demoNow, fmtDuration } from '@/lib/time';
import { format } from 'date-fns';
import { ZONE_BY_ID, CAPABILITY_META } from '@/data/zones';
import { ScenarioControls } from '@/scenario/ScenarioControls';

const VIEW_LABEL: Record<string, string> = { agents: 'Agents', approvals: 'Approvals', incidents: 'Incidents', governance: 'Governance', health: 'Health' };

export function StatusBar() {
  const [now, setNow] = useState(demoNow());
  const kpi = useStore((s) => s.kpi);
  const posture = useStore((s) => s.posture);
  const view = useStore((s) => s.view);
  const zoneId = useStore((s) => s.selectedZoneId);
  const cap = useStore((s) => s.activeCapability);
  const incidentId = useStore((s) => s.selectedIncidentId);
  const replayAt = useStore((s) => s.replayAt);
  const selectZone = useStore((s) => s.selectZone);
  const setView = useStore((s) => s.setView);
  const openIncident = useStore((s) => s.openIncident);

  useEffect(() => {
    const t = setInterval(() => setNow(demoNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const crumbs: { label: string; go: () => void }[] = [{ label: 'Camp Raven', go: () => { selectZone(null); setView('map'); } }];
  if (view === 'map') {
    if (zoneId) crumbs.push({ label: ZONE_BY_ID[zoneId].name, go: () => selectZone(zoneId) });
    if (zoneId && cap) crumbs.push({ label: CAPABILITY_META[cap].name, go: () => {} });
  } else {
    crumbs.push({ label: VIEW_LABEL[view], go: () => { setView(view); if (view === 'incidents') openIncident(null); } });
    if (view === 'incidents' && incidentId) crumbs.push({ label: incidentId, go: () => {} });
  }

  const postureColor = posture === 'alarm' ? 'var(--alarm)' : posture === 'elevated' ? 'var(--advisory)' : 'var(--nominal)';
  const clock = replayAt ?? now;

  return (
    <header className="h-[var(--status-h)] shrink-0 border-b hairline bg-surface-raised flex items-center px-4 gap-6" role="banner">
      <div className="flex items-baseline gap-2 min-w-[210px]">
        <span className="text-16 font-semibold">Camp Raven</span>
        <span className="mono text-14 text-text-muted" aria-live="off">
          {format(clock, 'HH:mm:ss')} {replayAt ? <span className="text-advisory">replay</span> : 'local'}
        </span>
      </div>

      <nav className="flex items-center gap-1 text-12 min-w-0" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="text-text-muted">/</span>}
            <button type="button" onClick={c.go} className={`truncate hover:underline ${i === crumbs.length - 1 ? 'text-text-primary' : 'text-text-muted'}`}>{c.label}</button>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-5 text-12">
        <Kpi label="MTTD" value={`${kpi.mttdSec}s`} />
        <Kpi label="MTTR" value={fmtDuration(kpi.mttrMs)} />
        <Kpi label="Auto-resolved" value={`${kpi.autoResolvedPct.toFixed(1)}%`} />
        <Kpi label="Assets online" value={`${kpi.assetsOnline}/${kpi.assetsTotal}`} />
      </div>

      <div className="flex items-center gap-2 pl-4 border-l hairline">
        <span className="dot" style={{ background: postureColor, boxShadow: posture !== 'normal' ? `0 0 8px ${postureColor}` : undefined }} />
        <span className="text-12" style={{ color: posture === 'normal' ? undefined : postureColor }}>
          {posture === 'normal' ? 'Normal' : posture === 'elevated' ? 'Elevated' : 'Alarm'}
        </span>
      </div>

      <ScenarioControls />
    </header>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-text-muted narrow">{label}</span>
      <span className="mono text-14 text-text-primary">{value}</span>
    </div>
  );
}
