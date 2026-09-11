import { useEffect, useMemo, useState } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { useStore } from '@/store/useStore';
import { CYBER } from '@/data/facilities';
import { LIVE_INCIDENT_ID } from '@/data/incidents';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { ReasoningChain, WhyButton } from '@/agents/ReasoningChain';
import { Panel, StatusDot } from '@/ui/bits';
import { DEMO_NOW, demoNow, fmtClock, fmtDuration, min, relTime } from '@/lib/time';

const CORRELATION_ACTION_ID = 'ACT-OVERWATCH-1';
const PRIOR_CASE_ID = 'INC-0331';
const HELD_CREDENTIAL = 'ID-2261';
/** Overwatch has been holding the credential for 34 minutes at the demo's opening beat. */
const HELD_SINCE = DEMO_NOW - min(34);

type Segment = (typeof CYBER.segments)[number];
type Device = (typeof CYBER.devices)[number];

function useDemoClock(enabled: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => demoNow());
  useEffect(() => {
    if (!enabled) return;
    setNow(demoNow());
    const id = window.setInterval(() => setNow(demoNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

function IncidentLink({ id, primary }: { id: string; primary?: boolean }) {
  const openIncident = useStore((s) => s.openIncident);
  return primary ? (
    <button type="button" className="btn btn-sm btn-primary" onClick={() => openIncident(id)}>Open {id}</button>
  ) : (
    <button type="button" className="mono text-11 px-1 rounded border hairline hover:bg-surface-raised align-baseline" onClick={() => openIncident(id)} title={`Open ${id}`}>{id}</button>
  );
}

function HeldChip() {
  return (
    <span className="chip whitespace-nowrap" style={{ borderColor: 'rgba(224,169,59,0.5)', color: 'var(--advisory)' }}>held for correlation</span>
  );
}

export function Cyber(_props: CapabilityProps) {
  const correlated = useStore((s) => s.incidents.some((i) => i.id === LIVE_INCIDENT_ID));
  const [quarantined, setQuarantined] = useState<Record<string, number>>({});

  const segments: Segment[] = useMemo(
    () =>
      CYBER.segments.map((seg) =>
        seg.id === 'IT-GUEST' && quarantined['DEV-A4C3']
          ? { ...seg, health: 'nominal' as const, note: `Unknown device quarantined ${fmtClock(quarantined['DEV-A4C3'])}` }
          : seg,
      ),
    [quarantined],
  );
  const nominal = segments.filter((s) => s.health === 'nominal').length;
  const advisory = segments.length - nominal;
  const status = `${nominal} segments nominal${advisory ? `, ${advisory} advisory` : ''}. ${
    correlated ? `Credential ${HELD_CREDENTIAL} correlated to ${LIVE_INCIDENT_ID}; recommending suspension.` : 'One credential anomaly held for correlation.'
  }`;

  return (
    <CapabilityShell
      capability="cyber"
      status={status}
      lowerHeight={120}
      primary={
        <div className="h-full overflow-auto p-2">
          <div
            className="grid gap-2 h-full min-h-[460px]"
            style={{ gridTemplateColumns: '1.25fr 1fr 1fr', gridTemplateRows: 'minmax(0, 1.5fr) minmax(0, 0.8fr) minmax(0, 1fr)' }}
          >
            <CorrelatedCasePanel correlated={correlated} className="row-span-3" />
            <AnomaliesPanel correlated={correlated} className="col-span-2" />
            <SegmentsPanel segments={segments} className="col-span-2" />
            <DevicesPanel quarantined={quarantined} onQuarantine={(d, ts) => setQuarantined((q) => ({ ...q, [d.id]: ts }))} />
            <CredentialsPanel correlated={correlated} />
          </div>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ the correlated case */

function SignalCard({ kind, source, time, text }: { kind: string; source: string; time: string; text: string }) {
  return (
    <div className="inset p-2 min-w-0">
      <div className="flex items-center gap-2 text-11">
        <span className="text-text-primary font-medium">{kind}</span>
        <span className="text-text-muted truncate">{source}</span>
        <span className="mono text-text-muted ml-auto">{time}</span>
      </div>
      <div className="text-12 mt-0.5">{text}</div>
    </div>
  );
}

function CorrelatedCasePanel({ correlated, className = '' }: { correlated: boolean; className?: string }) {
  const action = useStore((s) => s.actions.find((a) => a.id === CORRELATION_ACTION_ID));
  const now = useDemoClock(!correlated);
  return (
    <Panel
      title="Physical + cyber, same incident"
      right={
        correlated ? (
          <span className="chip" style={{ borderColor: 'rgba(79,209,197,0.5)', color: 'var(--agent)' }}>correlated by Overwatch</span>
        ) : (
          <HeldChip />
        )
      }
      className={className}
      bodyClass="flex flex-col min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-2 gap-2 px-3 pt-2">
          <SignalCard kind="Physical" source="Access control" time="04:06" text={`Badge ${HELD_CREDENTIAL} (J. Marsh, Halden & Co) refused at DOOR-HQ-N. Outside contractor hours.`} />
          <SignalCard kind="Cyber" source="Contractor portal" time="03:58" text="Account j.marsh authenticated to the contractor portal from an address outside the camp range." />
        </div>

        {correlated ? (
          <div className="px-3 py-2 space-y-2">
            {action ? (
              <ReasoningChain action={action} compact />
            ) : (
              <div className="text-12 agent-text">
                <span className="font-medium">Overwatch</span> — Correlated with {LIVE_INCIDENT_ID}. A credential test at the north door followed by a fence approach eleven minutes later is one pattern, not two events. The access control system and the network monitor each saw half of it; neither would have raised it alone.
              </div>
            )}
            <div className="flex items-center gap-2">
              <IncidentLink id={LIVE_INCIDENT_ID} primary />
              <WhyButton actionId={CORRELATION_ACTION_ID} />
              <span className="text-11 text-text-muted">Alert merged into the incident; nothing new for the rail.</span>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1.5 text-12">
            <div className="agent-text">
              <span className="font-medium">Overwatch</span> — Holding {HELD_CREDENTIAL} for correlation. Waiting for a second signal: <span className="mono">{fmtDuration(now - HELD_SINCE)}</span>.
            </div>
            <div className="agent-text">
              A refused badge is routine. An off-camp portal login is routine. The same account doing both eight minutes apart is not routine, but it is not yet an incident either. The access control system and the network monitor each see half of this; neither would have raised it on its own.
            </div>
            <div className="text-11 text-text-muted">
              Hold expires at <span className="mono">{fmtClock(HELD_SINCE + min(60))}</span> unless a second signal arrives. Trigger for escalation: any physical event within 200 m of the north door, or a second login from the same address.
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Prior case <IncidentLink id={PRIOR_CASE_ID} /> yesterday 07:57: same account from two locations, correlated with a door read. Cause was a shared laptop; single-session contractor accounts enforced since 15:37.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ anomalies */

function AnomaliesPanel({ correlated, className = '' }: { correlated: boolean; className?: string }) {
  const held = CYBER.anomalies.filter((a) => a.held).length;
  return (
    <Panel
      title="Badge and credential anomalies"
      right={<span className="text-11 text-text-muted">last 8 h · {CYBER.anomalies.length} events · {held} {correlated ? 'correlated' : 'held'}</span>}
      className={className}
      bodyClass="overflow-auto"
    >
      <table className="data">
        <thead>
          <tr>
            <th>Time</th>
            <th>Kind</th>
            <th>Detail</th>
            <th>Severity</th>
            <th>Disposition</th>
          </tr>
        </thead>
        <tbody>
          {CYBER.anomalies.map((a) => (
            <tr key={a.id}>
              <td className="mono text-text-muted whitespace-nowrap">{fmtClock(a.ts)}</td>
              <td className="whitespace-nowrap">{a.kind}</td>
              <td>{a.detail}</td>
              <td className={a.severity === 'low' ? 'text-text-muted' : 'text-advisory'}>{a.severity}</td>
              <td className="whitespace-nowrap">
                {a.held ? (
                  correlated ? <span className="agent-text text-11">correlated → {LIVE_INCIDENT_ID}</span> : <HeldChip />
                ) : (
                  <span className="text-11 text-text-muted">closed — {a.kind === 'Unknown device' ? 'quarantined' : a.kind === 'Firmware drift' ? 'ticketed to Fitter' : 'resolved by helpdesk'}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ------------------------------------------------------------------ segments */

function SegmentsPanel({ segments, className = '' }: { segments: Segment[]; className?: string }) {
  const hosts = segments.reduce((n, s) => n + s.hosts, 0);
  return (
    <Panel title="Network segment health" right={<span className="mono text-11 text-text-muted">{hosts} hosts</span>} className={className} bodyClass="overflow-auto">
      <div className="grid grid-cols-5 gap-2 p-2">
        {segments.map((seg) => (
          <div key={seg.id} className="inset p-2 min-w-0">
            <div className="flex items-center gap-1.5 text-12">
              <StatusDot status={seg.health} />
              <span className="truncate">{seg.name}</span>
            </div>
            <div className="mono text-11 text-text-muted">{seg.id} · {seg.hosts} hosts</div>
            <div className={`text-11 mt-0.5 ${seg.health === 'advisory' ? 'text-advisory' : 'text-text-muted'}`}>{seg.note}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ devices */

function DevicesPanel({ quarantined, onQuarantine }: { quarantined: Record<string, number>; onQuarantine: (d: Device, ts: number) => void }) {
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const quarantine = (d: Device) => {
    const ts = demoNow();
    onQuarantine(d, ts);
    pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Quarantined device', target: d.id, record: { mac: d.mac, segment: d.segment, vendor: d.vendor } });
    pushFeed('overwatch', `${d.id} (${d.mac}) quarantined on ${d.segment} by ${DUTY_OFFICER}. Guest segment back within band.`);
  };
  return (
    <Panel title="Unauthorised device connections" right={<span className="text-11 text-text-muted">guest and contractor segment</span>} bodyClass="overflow-auto">
      <table className="data">
        <thead>
          <tr>
            <th>Device</th>
            <th>MAC</th>
            <th>Vendor</th>
            <th>Seen</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {CYBER.devices.map((d) => {
            const q = d.state === 'quarantined' ? 'auto' : quarantined[d.id] ? 'human' : null;
            return (
              <tr key={d.id}>
                <td className="mono whitespace-nowrap">{d.id}</td>
                <td className="mono text-text-muted whitespace-nowrap">{d.mac}</td>
                <td className="whitespace-nowrap">{d.vendor}</td>
                <td className="mono text-text-muted whitespace-nowrap">{relTime(d.seen)}</td>
                <td className="whitespace-nowrap">
                  {q === 'auto' ? (
                    <span className="text-11 text-text-muted">quarantined automatically, no captive portal completion</span>
                  ) : q === 'human' ? (
                    <span className="text-11 text-text-muted">quarantined by {DUTY_OFFICER} <span className="mono">{fmtClock(quarantined[d.id])}</span></span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="chip" style={{ borderColor: 'rgba(224,169,59,0.5)', color: 'var(--advisory)' }}>unknown</span>
                      <button type="button" className="btn btn-sm" onClick={() => quarantine(d)}>Quarantine</button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/* ------------------------------------------------------------------ credentials */

function CredentialsPanel({ correlated }: { correlated: boolean }) {
  return (
    <Panel title="Credentials of interest" right={<span className="text-11 text-text-muted">{CYBER.credentials.length} badges</span>} bodyClass="overflow-auto">
      <table className="data">
        <thead>
          <tr>
            <th>Badge</th>
            <th>Holder</th>
            <th>Org</th>
            <th>Status</th>
            <th>Last read</th>
          </tr>
        </thead>
        <tbody>
          {CYBER.credentials.map((c) => (
            <tr key={c.badge}>
              <td className="mono whitespace-nowrap">{c.badge}</td>
              <td className="whitespace-nowrap">{c.holder}</td>
              <td className="text-text-muted whitespace-nowrap">{c.org}</td>
              <td className="whitespace-nowrap">
                {c.status === 'held' ? (
                  correlated ? <span className="agent-text text-11">attached to {LIVE_INCIDENT_ID}</span> : <HeldChip />
                ) : c.status === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 text-text-muted"><StatusDot status="nominal" />active</span>
                ) : (
                  <span className="text-text-muted">{c.status}</span>
                )}
              </td>
              <td className="text-text-muted">{c.lastRead}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
