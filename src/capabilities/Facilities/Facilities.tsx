import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import type { LightingZone, ZoneId } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { LIGHTING_ZONES, POWER } from '@/data/facilities';
import { DECLINE_REASONS } from '@/data/copy';
import { ZONE_BY_ID } from '@/data/zones';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';
import { WhyButton } from '@/agents/ReasoningChain';
import { Panel, Stat, StatusDot } from '@/ui/bits';
import { demoNow, fmtClock, fmtTime, relTime } from '@/lib/time';

const FUEL_ACTION_ID = 'ACT-FITTER-FUEL';
const FUEL_RESERVE_DAYS = 6;

/**
 * The 24 h profile in the data file is indexed by hour of day. Re-order it so it ends at the demo "now"
 * (04:00) and rebase it so the last point equals the live grid reading; the shape is unchanged.
 */
const NOW_HOUR = 4;
const POWER_24H = (() => {
  const ordered = Array.from({ length: 24 }, (_, i) => POWER.powerSeries[(NOW_HOUR + 1 + i) % 24]);
  const offset = POWER.gridKw - ordered[ordered.length - 1].kw;
  return ordered.map((p) => ({ label: `${p.h.toString().padStart(2, '0')}:00`, kw: p.kw + offset }));
})();
const POWER_TICKS = [POWER_24H[0], POWER_24H[6], POWER_24H[12], POWER_24H[18], POWER_24H[23]].map((p) => p.label);

/**
 * Module-level guard so the proposal is raised once per store generation, not once per mount
 * (StrictMode double-invokes effects; zone switches remount the module). proposeAction writes to the
 * store synchronously, so the store check catches everything except a same-tick re-entry.
 */
let fuelProposalIssuedAt = 0;

function useFuelProposal() {
  useEffect(() => {
    const s = useStore.getState();
    if (s.actions.some((a) => a.id === FUEL_ACTION_ID)) return;
    if (Date.now() - fuelProposalIssuedAt < 2000) return;
    fuelProposalIssuedAt = Date.now();
    s.proposeAction({
      id: FUEL_ACTION_ID,
      ts: demoNow(),
      agentId: 'fitter',
      title: 'Raise a fuel resupply request for Generator 1',
      observed: 'GEN-1 at 1,480 L of 2,400 L, burning 3.1 L/h under night load. Reserve threshold 400 L.',
      considered: [
        'Wait for the weekly resupply on Thursday (would arrive with 290 L in tank)',
        'Raise an ad-hoc resupply now',
        'Shift night load to GEN-2 (88 h since service; adds wear)',
      ],
      concluded: 'Reserve is reached in 6 days, one day after the scheduled delivery window opens. A request now costs nothing and removes the risk.',
      action: 'Raise a resupply request for 1,000 L with the facilities manager, delivery by Wednesday.',
      atHigherAutonomy: 'At Autonomous, Fitter would have raised the request and told you.',
      requiresApproval: true,
      zoneId: 'hq',
      ifApproved: 'Request sent to the facilities manager. Fitter tracks the delivery.',
      ifDeclined: 'Fitter re-raises at 4 days of reserve.',
    });
  }, []);
}

export function Facilities({ zone }: CapabilityProps) {
  useFuelProposal();
  const fuelAction = useStore((s) => s.actions.find((a) => a.id === FUEL_ACTION_ID));
  const gens = [POWER.generator, POWER.generator2];
  const genLine = gens.every((g) => g.state === 'standby') ? 'Both generators on standby.' : `${gens.filter((g) => g.state === 'running').map((g) => g.id).join(' and ')} running.`;
  const fuelLine =
    fuelAction?.approvalState === 'approved'
      ? 'Generator 1 resupply requested, 1,000 L by Wednesday.'
      : fuelAction?.approvalState === 'declined'
        ? `Generator 1 fuel reaches reserve in ${FUEL_RESERVE_DAYS} days; I re-raise at 4.`
        : `Generator 1 fuel reaches reserve in ${FUEL_RESERVE_DAYS} days.`;
  const status = `Grid ${POWER.gridKw} kW. ${genLine} ${fuelLine}`;

  return (
    <CapabilityShell
      capability="facilities"
      status={status}
      lowerHeight={120}
      primary={
        <div className="h-full overflow-auto p-2">
          <div className="grid gap-2 h-full min-h-[400px]" style={{ gridTemplateColumns: '1.15fr 1fr 1fr 1.15fr', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <PowerPanel className="row-span-2" />
            <FuelProposalCard />
            <LightingPanel className="row-span-2" />
            <DoorsPanel zoneId={zone.id} className="row-span-2" />
            <HvacPanel />
          </div>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ power, generators, fuel, water */

function PowerTip({ active, payload }: TooltipProps<number, string>) {
  const p = payload?.[0]?.payload as { label: string; kw: number } | undefined;
  if (!active || !p) return null;
  return <div className="panel px-2 py-1 text-11 mono shadow-lg">{p.label} · {p.kw} kW</div>;
}

function PowerPanel({ className = '' }: { className?: string }) {
  const min24 = Math.min(...POWER_24H.map((p) => p.kw));
  const max24 = Math.max(...POWER_24H.map((p) => p.kw));
  return (
    <Panel title="Power and generators" right={<span className="text-11 text-text-muted">grid feed and two standby sets</span>} className={className} bodyClass="flex flex-col min-h-0 overflow-auto">
      <div className="px-3 pt-2 pb-1 flex items-end justify-between gap-3 shrink-0">
        <Stat label="Grid draw" value={<span className="mono">{POWER.gridKw} kW</span>} sub="Night load, mains supply healthy" />
        <div className="text-11 text-text-muted text-right">
          <div>24 h low <span className="mono text-text-primary">{min24}</span> · high <span className="mono text-text-primary">{max24}</span> kW</div>
          <div>Grid draw, last 24 h to <span className="mono">{POWER_24H[23].label}</span></div>
        </div>
      </div>
      <div className="h-[96px] w-full shrink-0 px-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={POWER_24H} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" ticks={POWER_TICKS} interval={0} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
            <YAxis domain={['dataMin - 20', 'dataMax + 20']} width={36} tickCount={3} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => Math.round(v).toString()} />
            <Tooltip content={<PowerTip />} cursor={{ stroke: 'var(--line)' }} isAnimationActive={false} />
            <Line type="monotone" dataKey="kw" stroke="var(--text-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" dot={false} activeDot={{ r: 4, fill: 'var(--text-primary)', stroke: 'var(--surface-inset)', strokeWidth: 2 }} isAnimationActive={false} />
            <ReferenceDot x={POWER_24H[23].label} y={POWER.gridKw} r={4} fill="var(--text-primary)" stroke="var(--surface-inset)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <GeneratorRow g={POWER.generator} projection={`Reserve in ${FUEL_RESERVE_DAYS} days at night load`} />
      <GeneratorRow g={POWER.generator2} />
      <div className="px-3 py-1.5 border-t hairline text-12 shrink-0">
        <div className="flex items-center gap-2">
          <span>Water tank</span>
          <span className="ml-auto mono text-text-muted">{POWER.waterTankL.toLocaleString('en-GB')} L · {POWER.waterTankPct}%</span>
        </div>
        <LevelBar pct={POWER.waterTankPct} />
        <div className="text-11 text-text-muted mt-1">Two days at camp demand without mains. Refill valve automatic below 60%.</div>
      </div>
    </Panel>
  );
}

function LevelBar({ pct, markerPct, tone = 'nominal' }: { pct: number; markerPct?: number; tone?: 'nominal' | 'advisory' }) {
  return (
    <div className="relative h-1.5 mt-1 rounded-sm bg-surface-inset border hairline overflow-hidden" role="img" aria-label={`${pct}%`}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone === 'advisory' ? 'var(--advisory)' : 'var(--nominal)' }} />
      {markerPct !== undefined && <div className="absolute inset-y-0 w-px" style={{ left: `${markerPct}%`, background: 'var(--advisory)' }} title="Reserve threshold" />}
    </div>
  );
}

function GeneratorRow({ g, projection }: { g: typeof POWER.generator; projection?: string }) {
  const pct = Math.round((g.fuelL / g.capacityL) * 100);
  const reservePct = (g.reserveL / g.capacityL) * 100;
  return (
    <div className="px-3 py-1.5 border-t hairline text-12 shrink-0">
      <div className="flex items-center gap-2">
        <span className="mono">{g.id}</span>
        <span className="chip">{g.state}</span>
        <span className="ml-auto mono text-text-muted">{g.fuelL.toLocaleString('en-GB')} / {g.capacityL.toLocaleString('en-GB')} L · {pct}%</span>
      </div>
      <LevelBar pct={pct} markerPct={reservePct} />
      <div className="flex flex-wrap gap-x-3 mt-1 text-11 text-text-muted">
        <span><span className="mono text-text-primary">{g.burnLh.toFixed(1)}</span> L/h night load</span>
        <span><span className="mono text-text-primary">{g.hoursSinceService}</span> h since service</span>
        <span>reserve <span className="mono text-text-primary">{g.reserveL}</span> L</span>
        {projection && <span className="agent-text ml-auto">{projection}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ HVAC */

function HvacPanel() {
  const advisory = POWER.hvac.filter((h) => h.status !== 'nominal');
  return (
    <Panel title="HVAC by building" right={<span className="text-11 text-text-muted">{POWER.hvac.length} plants</span>} bodyClass="flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Building</th>
              <th>Mode</th>
              <th className="text-right">Set</th>
              <th className="text-right">Actual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {POWER.hvac.map((h) => {
              const delta = h.actual - h.setpoint;
              return (
                <tr key={h.building}>
                  <td className="whitespace-nowrap">{h.building}</td>
                  <td className="text-text-muted">{h.mode}</td>
                  <td className="mono text-right">{h.mode === 'off' ? '—' : `${h.setpoint.toFixed(0)}°`}</td>
                  <td className={`mono text-right ${h.status === 'advisory' ? 'text-advisory' : ''}`}>{h.actual.toFixed(1)}°</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <StatusDot status={h.status} />
                      <span className={h.status === 'advisory' ? 'text-advisory' : 'text-text-muted'}>
                        {h.status === 'advisory' ? `${Math.abs(delta).toFixed(1)}° ${delta < 0 ? 'under' : 'over'}` : h.mode === 'off' ? 'off' : 'on setpoint'}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {advisory.length > 0 && (
        <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 agent-text">
          <span className="font-medium">Fitter</span> — Barracks B is 0.8° under setpoint on reduced boiler output since 02:10. Same boiler as the GAS-BK-01 CO advisory; flue check is on the day-shift list.
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ lighting */

type ManualNote = { state: LightingZone['state']; by: string; ts: number };

function LightingPanel({ className = '' }: { className?: string }) {
  const lighting = useStore((s) => s.lighting);
  const setLighting = useStore((s) => s.setLighting);
  const [manual, setManual] = useState<Record<string, ManualNote>>({});

  const choose = (z: LightingZone, state: LightingZone['state']) => {
    if (z.state === state) return;
    const defaultLevel = LIGHTING_ZONES.find((d) => d.id === z.id)?.level ?? 40;
    const level = state === 'on' ? 100 : state === 'off' ? 0 : defaultLevel;
    // A human override supersedes any agent override on the zone, so the agent note is cleared.
    setLighting(z.id, { state, level, override: undefined }, DUTY_OFFICER);
    setManual((m) => ({ ...m, [z.id]: { state, by: DUTY_OFFICER, ts: demoNow() } }));
  };

  const overridden = lighting.filter((z) => z.override).length;
  return (
    <Panel
      title="Lighting zones"
      right={<span className="text-11 text-text-muted">{overridden > 0 ? <span className="agent-text">{overridden} agent override</span> : 'night cycle'}</span>}
      className={className}
      bodyClass="flex flex-col min-h-0"
    >
      <ul className="flex-1 min-h-0 overflow-auto">
        {lighting.map((z) => {
          const note = manual[z.id];
          return (
            <li key={z.id} className="px-3 py-1.5 border-b border-line/50 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-12">
                  <span className="truncate">{z.name}</span>
                  <span className="mono text-11 text-text-muted">{z.id}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                  <div className="h-1 w-14 shrink-0 bg-surface-inset border hairline rounded-sm overflow-hidden" aria-hidden>
                    <div className="h-full" style={{ width: `${z.level}%`, background: 'var(--text-muted)' }} />
                  </div>
                  <span className="mono text-11 text-text-muted w-8 shrink-0">{z.level}%</span>
                  {z.override ? (
                    <span className="text-11 agent-text truncate" title={z.override}>{z.override}</span>
                  ) : note ? (
                    <span className="text-11 text-text-muted truncate">{note.state === 'auto' ? 'Returned to auto' : `Manual ${note.state}`} · {note.by} <span className="mono">{fmtClock(note.ts)}</span></span>
                  ) : null}
                </div>
              </div>
              <div className="seg shrink-0" role="radiogroup" aria-label={`${z.name} lighting`}>
                {(['auto', 'on', 'off'] as const).map((st) => (
                  <button key={st} type="button" role="radio" aria-checked={z.state === st} aria-pressed={z.state === st} onClick={() => choose(z, st)}>
                    {st === 'auto' ? 'Auto' : st === 'on' ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Auto follows the night cycle and Warden's SOP steps. Manual settings hold until changed and are recorded in the audit log.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ doors and locks */

function LockGlyph({ locked }: { locked: boolean }) {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="shrink-0">
      <rect x="1" y="5.5" width="8" height="6" rx="1" fill={locked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />
      <path d={locked ? 'M3 5.5V3.5a2 2 0 0 1 4 0v2' : 'M3 5.5V3.5a2 2 0 0 1 4 0'} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function DoorsPanel({ zoneId, className = '' }: { zoneId: ZoneId; className?: string }) {
  const doors = useStore((s) => s.doors);
  const setDoor = useStore((s) => s.setDoor);
  const ordered = useMemo(() => [...doors].sort((a, b) => Number(b.zoneId === zoneId) - Number(a.zoneId === zoneId)), [doors, zoneId]);
  const inZone = doors.filter((d) => d.zoneId === zoneId).length;
  const locked = doors.filter((d) => d.locked).length;
  return (
    <Panel
      title="Doors and locks"
      right={<span className="text-11 text-text-muted">{locked} of {doors.length} locked · {inZone} in this zone</span>}
      className={className}
      bodyClass="flex flex-col min-h-0"
    >
      <ul className="flex-1 min-h-0 overflow-auto">
        {ordered.map((d, i) => {
          const here = d.zoneId === zoneId;
          const firstOther = !here && (i === 0 || ordered[i - 1].zoneId === zoneId);
          return (
            <li key={d.id} className={`px-3 py-1.5 border-b border-line/50 flex items-center gap-2 ${firstOther ? 'border-t hairline' : ''}`}>
              <span className={d.locked ? 'text-text-primary' : 'text-text-muted'}><LockGlyph locked={d.locked} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-12">
                  <span className="truncate">{d.name}</span>
                  <span className="mono text-11 text-text-muted">{d.id}</span>
                  {!here && <span className="text-11 text-text-muted">· {ZONE_BY_ID[d.zoneId].name}</span>}
                </div>
                <div className="text-11 text-text-muted truncate">
                  <span className={d.locked ? 'text-text-primary' : ''}>{d.locked ? 'Locked' : 'Unlocked'}</span> · {d.lastEvent} <span className="mono">{relTime(d.lastTs)}</span>
                </div>
              </div>
              <button type="button" className="btn btn-sm shrink-0" onClick={() => setDoor(d.id, !d.locked, DUTY_OFFICER)} title={`${d.locked ? 'Unlock' : 'Lock'} ${d.name}`}>
                {d.locked ? 'Unlock' : 'Lock'}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="shrink-0 px-3 py-1.5 border-t hairline text-11 text-text-muted">
        Lock and unlock here is the same action Warden proposes during an SOP. Both are recorded with who did it.
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ the one non-security proposal */

function FuelProposalCard() {
  const action = useStore((s) => s.actions.find((a) => a.id === FUEL_ACTION_ID));
  const approve = useStore((s) => s.approve);
  const decline = useStore((s) => s.decline);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0]);

  if (!action) {
    return (
      <Panel title="Fitter proposal" bodyClass="flex items-center justify-center">
        <div className="text-12 text-text-muted p-3">Fitter is checking the fuel projection.</div>
      </Panel>
    );
  }

  const state = action.approvalState;
  const autonomousRun = state === 'approved' && action.approvedBy === 'Autonomous (policy)';
  const loggedOnly = !action.requiresApproval && !state;

  const stateChip =
    state === 'pending' ? <span className="text-11 text-advisory">awaiting approval</span>
      : state === 'approved' ? <span className="text-11 text-nominal">{autonomousRun ? 'executed autonomously' : 'approved'}</span>
        : state === 'declined' ? <span className="text-11 text-text-muted">declined</span>
          : <span className="text-11 text-text-muted">logged only</span>;

  return (
    <Panel
      title={<span>Fitter proposal <span className="text-text-muted">· not a security action</span></span>}
      right={<>{stateChip}<WhyButton actionId={FUEL_ACTION_ID} /></>}
      bodyClass="flex flex-col min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2 text-12 space-y-1.5">
        <div className="flex items-center gap-2 text-11 text-text-muted">
          <span className="agent-text font-medium">Fitter</span>
          <span className="mono">{fmtTime(action.ts)}</span>
          <span>· generator fuel</span>
        </div>
        <div className="text-14 font-medium agent-text leading-5">{action.title}</div>
        <div className="grid grid-cols-[64px_1fr] gap-x-2 gap-y-1">
          <div className="text-11 text-text-muted pt-0.5">Observed</div>
          <div className="agent-text">{action.observed}</div>
          <div className="text-11 text-text-muted pt-0.5">Concluded</div>
          <div className="agent-text">{action.concluded}</div>
          <div className="text-11 text-text-muted pt-0.5">{state === 'approved' ? 'Did' : 'Proposes'}</div>
          <div className="agent-text">{action.action.replace(/^Logged only \(agent at Observe\): /, '')}</div>
        </div>

        {state === 'pending' && !declining && (
          <div className="grid grid-cols-2 gap-2 text-11">
            <div className="inset p-1.5"><div className="text-text-muted">If approved</div><div>{action.ifApproved}</div></div>
            <div className="inset p-1.5"><div className="text-text-muted">If declined</div><div>{action.ifDeclined}</div></div>
          </div>
        )}

        {state === 'approved' && (
          <div className="inset p-2 text-12">
            <div className="flex items-center gap-1.5"><StatusDot status="nominal" /><span>{autonomousRun ? 'Executed under Autonomous policy; duty officer notified.' : `Approved by ${action.approvedBy}.`}</span></div>
            <div className="agent-text mt-0.5">{action.ifApproved}</div>
          </div>
        )}
        {state === 'declined' && (
          <div className="inset p-2 text-12">
            <div>Declined by {action.approvedBy ?? DUTY_OFFICER} — {action.declineReason}</div>
            <div className="agent-text mt-0.5">{action.ifDeclined} The reason is kept as a preference for proposals of this type.</div>
          </div>
        )}
        {loggedOnly && (
          <div className="inset p-2 text-12 text-text-muted">Fitter is at Observe, so this was logged and not proposed. Raise Fitter to Recommend or above to see it as a proposal.</div>
        )}
      </div>

      {state === 'pending' && (
        <div className="shrink-0 px-3 py-2 border-t hairline">
          {declining ? (
            <div className="flex items-center gap-2">
              <select className="field" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason for declining">
                {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="button" className="btn btn-sm shrink-0" onClick={() => { decline(action.id, reason, DUTY_OFFICER); setDeclining(false); }}>Confirm decline</button>
              <button type="button" className="btn btn-sm shrink-0" onClick={() => setDeclining(false)}>Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(action.id, DUTY_OFFICER)}>Approve</button>
              <button type="button" className="btn btn-sm" onClick={() => setDeclining(true)}>Decline</button>
              <span className="ml-auto text-11 text-text-muted">Declining asks for a reason; that is how Fitter learns.</span>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
