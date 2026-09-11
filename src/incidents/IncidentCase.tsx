import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Asset, Evidence, Incident, SceneKind, TimelineEvent } from '@/lib/types';
import { ZONE_BY_ID } from '@/data/zones';
import { agentName } from '@/data/agents';
import { SENSOR_BY_ID } from '@/data/sensors';
import { ASSET_BY_ID, currentPosition } from '@/data/assets';
import { demoNow, fmtDuration, fmtTime } from '@/lib/time';
import { MiniMap } from '@/ui/MiniMap';
import { CctvFeed, type FeedSubjects, type FeedVariant } from '@/ui/CctvFeed';
import { EmptyState, Panel } from '@/ui/bits';
import { WhyButton } from '@/agents/ReasoningChain';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { IncidentReport } from './IncidentReport';
import { SeverityChip, STATE_LABEL, stateColor, severityColor, actorColor, RadarPlot, FenceTrace, PlateTile, PlateOverlay, LogTile, plateFrom } from './incidentBits';

/** One event, every capability that touched it, in one place. */
export function IncidentCase({ id }: { id: string }) {
  const incident = useStore((s) => s.incidents.find((i) => i.id === id));
  const openIncident = useStore((s) => s.openIncident);
  if (!incident) {
    return (
      <EmptyState
        title={`${id} is not on file`}
        body="It may have been cleared by a scenario reset. Every incident the agents opened in the last 24 hours is on the incidents list."
        action={<button type="button" className="btn" onClick={() => openIncident(null)}>Back to incidents</button>}
      />
    );
  }
  return <CaseView incident={incident} />;
}

function CaseView({ incident }: { incident: Incident }) {
  const openIncident = useStore((s) => s.openIncident);
  const selectZone = useStore((s) => s.selectZone);
  const patchIncident = useStore((s) => s.patchIncident);
  const appendIncidentEvent = useStore((s) => s.appendIncidentEvent);
  const pushAudit = useStore((s) => s.pushAudit);
  const updateAlert = useStore((s) => s.updateAlert);
  const toast = useStore((s) => s.toast);
  const focusReport = useStore((s) => s.focusReport);
  const setFocusReport = useStore((s) => s.setFocusReport);
  const replayAt = useStore((s) => s.replayAt);

  const [confirmClose, setConfirmClose] = useState(false);
  const [flash, setFlash] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // The scenario asks for the report at 3:20: bring it into view, light its edge briefly, then hand control back.
  useEffect(() => {
    if (!focusReport) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    reportRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    setFlash(true);
    let done = false;
    const t = window.setTimeout(() => { done = true; setFlash(false); setFocusReport(false); }, 1500);
    return () => { window.clearTimeout(t); if (!done) setFocusReport(false); };
  }, [focusReport, setFocusReport]);

  const zone = ZONE_BY_ID[incident.zoneId];
  const isOpen = incident.state !== 'closed';
  const events = useMemo(() => {
    const l = [...incident.timeline].sort((a, b) => a.ts - b.ts);
    return replayAt ? l.filter((e) => e.ts <= replayAt) : l;
  }, [incident.timeline, replayAt]);

  const close = () => {
    const ts = demoNow();
    patchIncident(incident.id, { state: 'closed', closedAt: ts });
    appendIncidentEvent(incident.id, { ts, actor: 'human', actorName: DUTY_OFFICER, text: 'Closed the incident.' });
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Closed incident', target: incident.id, record: { title: incident.title, humanDecisions: incident.humanDecisions, openFor: fmtDuration(ts - incident.openedAt) }, ts });
    updateAlert(`AL-${incident.id}`, { state: 'resolved', resolution: `closed by ${DUTY_OFFICER}` });
    toast(`${incident.id} closed by ${DUTY_OFFICER}. Recorded in the audit log.`, 'human');
    setConfirmClose(false);
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <header className="px-5 pt-3 pb-2 border-b hairline shrink-0 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <span className="mono text-16 text-text-muted shrink-0">{incident.id}</span>
            <h1 className="text-20 font-medium truncate">{incident.title}</h1>
          </div>
          <div className="text-12 text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Opened <span className="mono">{fmtTime(incident.openedAt)}</span></span>
            <span>·</span>
            <span>opened by <span className="agent-text font-medium">{agentName(incident.openedBy)}</span></span>
            <span>·</span>
            <button type="button" className="hover:text-text-primary underline decoration-dotted underline-offset-2" onClick={() => selectZone(incident.zoneId)} title="Open this zone on the camp map">
              {zone?.name ?? incident.zoneId}
            </button>
            <span>·</span>
            <span>{incident.assetIds.length} asset{incident.assetIds.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{incident.sensorIds.length} sensor{incident.sensorIds.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span style={{ color: stateColor(incident.state) }}>{STATE_LABEL[incident.state]}</span>
            {incident.closedAt && (
              <span>· closed <span className="mono">{fmtTime(incident.closedAt)}</span> after {fmtDuration(incident.closedAt - incident.openedAt)}</span>
            )}
            <span>·</span>
            <span>detected in <span className="mono">{incident.detectSeconds}s</span></span>
          </div>
          <div className="text-12 agent-text mt-0.5 truncate" title={incident.summary}>{incident.summary}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <SeverityChip severity={incident.severity} size={12} />
          <button type="button" className="btn" onClick={() => openIncident(null)} title="Back to the incidents list (Esc)">← Back to incidents</button>
          {isOpen && (
            <div className="relative">
              <button type="button" className="btn" onClick={() => setConfirmClose((v) => !v)} aria-expanded={confirmClose}>Close incident</button>
              {confirmClose && (
                <div className="absolute z-30 right-0 top-full mt-1 w-80 panel p-3 shadow-xl" role="alertdialog" aria-label="Confirm close">
                  <div className="text-12 font-medium mb-1">Close {incident.id}?</div>
                  <div className="text-12 text-text-muted mb-2">
                    The alert is resolved under your name, the report stays as Scribe drafted it, and the closure is written to the audit log.
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="btn btn-sm" onClick={() => setConfirmClose(false)}>Cancel</button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={close}>Confirm close</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-5 py-3">
        <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: '42fr 58fr' }}>
          {/* Left: map over evidence */}
          <div className="min-h-0 flex flex-col gap-3">
            <Panel
              inset
              title="Map"
              right={<span className="mono text-11 text-text-muted">x {Math.round(incident.location[0])} · z {Math.round(incident.location[2])}</span>}
              className="flex-[4] min-h-0"
              bodyClass="relative"
            >
              <div className="absolute inset-0"><CaseMap incident={incident} /></div>
              <div className="absolute left-2 bottom-1.5 text-11 text-text-muted pointer-events-none flex items-center gap-3">
                <span><span className="dot align-middle mr-1" style={{ background: severityColor(incident.severity) }} />incident</span>
                <span><span className="inline-block w-[7px] h-[7px] rotate-45 align-middle mr-1" style={{ background: 'var(--agent)' }} />attached sensor</span>
                <span><span className="inline-block w-4 border-t border-dashed align-middle mr-1" style={{ borderColor: 'var(--agent)' }} />asset route</span>
              </div>
            </Panel>
            <Panel title={`Evidence · ${incident.evidence.length}`} className="flex-[5] min-h-0" bodyClass="overflow-auto p-2">
              {incident.evidence.length === 0 ? (
                <EmptyState title="No evidence attached yet" body="Sift attaches frames, traces and log lines as each sensor reports." />
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
                  {incident.evidence.map((e, i) => <EvidenceTile key={`${e.id}-${i}`} e={e} index={i} />)}
                </div>
              )}
            </Panel>
          </div>

          {/* Right: timeline */}
          <Panel
            title="Timeline"
            right={
              <span className="text-11 text-text-muted">
                {events.length} event{events.length === 1 ? '' : 's'} · <span className="agent-text">agents</span> · <span className="text-text-primary">people</span>
                {replayAt ? <span className="text-advisory"> · replay, up to {fmtTime(replayAt)}</span> : null}
              </span>
            }
            className="min-h-0"
            bodyClass="flex flex-col"
          >
            <div className="px-3 py-2 border-b hairline shrink-0 space-y-1">
              <ChipRow label="Sensors" empty="No sensors attached">
                {incident.sensorIds.map((sid) => {
                  const s = SENSOR_BY_ID[sid];
                  return (
                    <span key={sid} className="chip" title={s?.label ?? sid}>
                      <span className="mono text-text-primary">{sid}</span>
                      {s && <span>{s.type === 'camera' ? (sid.startsWith('PTZ') ? 'PTZ' : 'camera') : s.type}</span>}
                    </span>
                  );
                })}
              </ChipRow>
              <ChipRow label="Assets" empty="No assets tasked">
                {incident.assetIds.map((aid) => {
                  const a = ASSET_BY_ID[aid];
                  return (
                    <span key={aid} className="chip" title={a ? `${a.callsign} · ${a.model}` : aid}>
                      <span className="mono text-text-primary">{aid}</span>
                      {a && <span>{a.callsign}</span>}
                    </span>
                  );
                })}
              </ChipRow>
            </div>
            <TimelineList events={events} incidentId={incident.id} />
          </Panel>
        </div>

        {/* Bottom: the report writes itself */}
        <div
          ref={reportRef}
          className="min-h-0 rounded-[4px] transition-shadow duration-500"
          style={{ flex: '0 0 34%', boxShadow: flash ? '0 0 0 2px var(--agent), 0 0 32px rgba(79,209,197,0.35)' : '0 0 0 0 transparent' }}
        >
          <IncidentReport incident={incident} />
        </div>
      </div>
    </div>
  );
}

function ChipRow({ label, empty, children }: { label: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="flex items-start gap-2 text-11">
      <span className="text-text-muted w-14 shrink-0 pt-0.5">{label}</span>
      <div className="flex flex-wrap gap-1 min-w-0">{children.length ? children : <span className="text-text-muted pt-0.5">{empty}</span>}</div>
    </div>
  );
}

/** Incident location, attached sensors, asset tracks. Subscribes to assets itself so ticks do not re-render the whole case. */
function CaseMap({ incident }: { incident: Incident }) {
  const assets = useStore((s) => s.assets);
  const incidentAssets = incident.assetIds.map((id) => assets.find((a) => a.id === id)).filter((a): a is Asset => !!a);
  const [x, , z] = incident.location;
  const sev = severityColor(incident.severity);
  const isOpen = incident.state !== 'closed';
  return (
    <MiniMap focus={{ center: [x, z], size: 220 }} showAssets showCameras selectedCameraIds={incident.sensorIds}>
      {incident.sensorIds.map((sid) => {
        const s = SENSOR_BY_ID[sid];
        if (!s || s.type === 'camera' || s.type === 'thermal') return null;
        return (
          <g key={sid} transform={`translate(${s.position[0]} ${s.position[2]})`}>
            <rect x="-2.5" y="-2.5" width="5" height="5" transform="rotate(45)" fill="var(--agent)" opacity="0.9" />
            <text x="5" y="2.2" fontSize="5" fill="var(--agent)" fontFamily="IBM Plex Mono, monospace" style={{ pointerEvents: 'none' }}>{sid}</text>
          </g>
        );
      })}
      {incidentAssets.map((a) =>
        a.route && a.route.length > 1 ? (
          <polyline key={`${a.id}-route`} points={a.route.map((w) => `${w.position[0]},${w.position[2]}`).join(' ')} fill="none" stroke="var(--agent)" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.8" />
        ) : null,
      )}
      {incidentAssets.map((a) => {
        const { position } = currentPosition(a);
        return <circle key={`${a.id}-ring`} cx={position[0]} cy={position[2]} r="8" fill="none" stroke="var(--agent)" strokeWidth="0.8" opacity="0.7" />;
      })}
      <g transform={`translate(${x} ${z})`}>
        {isOpen && (
          <circle r="4" fill="none" stroke={sev} strokeWidth="1">
            <animate attributeName="r" values="4;26" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}
        <circle r="3.5" fill={sev} stroke="#0d1418" strokeWidth="1" />
        <text y="-7" textAnchor="middle" fontSize="5.5" fill={sev} fontFamily="IBM Plex Mono, monospace" style={{ pointerEvents: 'none' }}>{incident.id}</text>
      </g>
    </MiniMap>
  );
}

function TimelineList({ events, incidentId }: { events: TimelineEvent[]; incidentId: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const count = events.length;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, incidentId]);
  if (count === 0) {
    return <EmptyState title="No events yet" body="The timeline fills as agents act and people decide." />;
  }
  return (
    <ol ref={listRef} className="flex-1 min-h-0 overflow-auto px-3 py-2 space-y-1" aria-label="Incident timeline">
      {events.map((e) => {
        const color = actorColor(e.actor);
        const isHuman = e.actor === 'human';
        return (
          <li key={e.id} className="flex items-start gap-2 text-12 leading-4 py-1 pl-2" style={{ boxShadow: `inset 2px 0 0 ${color}` }}>
            <span className="mono text-text-muted shrink-0 w-[60px]">{fmtTime(e.ts)}</span>
            <span className="shrink-0 w-[150px] flex items-center gap-1.5 min-w-0">
              <span className="font-medium truncate" style={{ color }}>{e.actorName}</span>
              {isHuman && <span className="chip shrink-0" style={{ padding: '0 5px', lineHeight: '14px', color: 'var(--text-primary)', borderColor: 'rgba(220,230,236,0.4)' }}>human</span>}
            </span>
            <span className="flex-1 min-w-0" style={{ color: isHuman ? 'var(--text-primary)' : e.actor === 'system' ? 'var(--text-muted)' : 'var(--agent)' }}>{e.text}</span>
            {e.actionId && <WhyButton actionId={e.actionId} className="shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- evidence ---------- */

const looksLikeRobotFeed = (e: Evidence) => /forward camera|ferret|kestrel|badger|heron|robot/i.test(e.label);

function subjectsFor(e: Evidence): FeedSubjects {
  const t = `${e.label} ${e.detail ?? ''}`;
  if (e.kind === 'drone') return /withdr|vehicle|saloon|road/i.test(t) ? 'withdraw' : 'drone-topdown';
  if (/cutting tool|fence base|crouch/i.test(t)) return 'figures-at-fence';
  if (/two|signature|figure|person|individual|subject|long object/i.test(t)) return 'two-figures';
  return 'none';
}

function EvidenceTile({ e, index }: { e: Evidence; index: number }) {
  return (
    <figure className="inset overflow-hidden flex flex-col min-w-0 m-0">
      {evidenceVisual(e, index)}
      <figcaption className="px-2 py-1 text-11 leading-4 border-t hairline min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-text-primary truncate" title={e.label}>{e.label}</span>
          <span className="mono text-text-muted ml-auto shrink-0">{fmtTime(e.ts)}</span>
        </div>
        {e.detail && <div className="text-text-muted truncate" title={e.detail}>{e.detail}</div>}
      </figcaption>
    </figure>
  );
}

function evidenceVisual(e: Evidence, index: number) {
  const sensor = e.sensorId ? SENSOR_BY_ID[e.sensorId] : undefined;
  const feedId = e.sensorId ?? e.label.split(/[\s,]/)[0].toUpperCase();
  switch (e.kind) {
    case 'radar':
      return <RadarPlot label={e.label} detail={e.detail} />;
    case 'fence':
      return <FenceTrace detail={e.detail} seed={index + 1} />;
    case 'log':
      return <LogTile ts={e.ts} sensorId={e.sensorId} detail={e.detail} />;
    case 'anpr': {
      const plate = plateFrom(e);
      const scene = e.scene ?? sensor?.scene;
      if (scene) {
        return (
          <div className="relative">
            <CctvFeed sensorId={feedId} scene={scene} subjects="vehicle-verge" showBoxes={false} compact seedOffset={index} className="w-full" />
            {plate && <PlateOverlay plate={plate} />}
          </div>
        );
      }
      return <PlateTile plate={plate ?? 'No read'} sub={e.detail} />;
    }
    default: {
      const variant: FeedVariant = e.kind === 'thermal' ? 'thermal' : e.kind === 'drone' ? 'drone' : looksLikeRobotFeed(e) ? 'robot' : 'cctv';
      const scene: SceneKind = e.scene ?? sensor?.scene ?? (e.kind === 'thermal' ? 'thermal' : e.kind === 'drone' ? 'rooftop' : variant === 'robot' ? 'yard' : 'fence');
      return <CctvFeed sensorId={feedId} scene={scene} variant={variant} subjects={subjectsFor(e)} showBoxes={false} compact seedOffset={index} className="w-full" />;
    }
  }
}
