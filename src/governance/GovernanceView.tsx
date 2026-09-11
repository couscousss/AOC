import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Autonomy } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { AGENT_STATE_LABEL, agentStateColor, Panel } from '@/ui/bits';
import { AutonomyControl, DUTY_OFFICER } from '@/governance/AutonomyControl';
import { AuditLog } from '@/governance/AuditLog';
import { SOP_PB_03 } from '@/data/copy';
import { agentName } from '@/data/agents';

type Tab = 'autonomy' | 'audit' | 'policy';
type OverrideAgent = 'warden' | 'dispatch';

const OVERRIDE_AGENTS: OverrideAgent[] = ['warden', 'dispatch'];
const ACTION_TYPES: { id: string; label: string; physical?: boolean; init: Autonomy }[] = [
  { id: 'illuminate', label: 'Illuminate', init: 3 },
  { id: 'notify', label: 'Notify', init: 3 },
  { id: 'drone', label: 'Dispatch observer drone', physical: true, init: 2 },
  { id: 'robot', label: 'Dispatch ground robot', physical: true, init: 2 },
  { id: 'door', label: 'Lock or unlock door', init: 2 },
  { id: 'incident', label: 'Raise incident', init: 3 },
];
const SHORT = ['Obs', 'Rec', 'Appr', 'Auto'];

type Overrides = Record<OverrideAgent, Record<string, Autonomy>>;
const initialOverrides = (): Overrides => ({
  warden: Object.fromEntries(ACTION_TYPES.map((t) => [t.id, t.init])),
  dispatch: Object.fromEntries(ACTION_TYPES.map((t) => [t.id, t.init])),
});
/** Survives leaving and re-entering the view for the length of the session. */
let OVERRIDES: Overrides = initialOverrides();

const OTHER_SOPS = [
  { id: 'SOP-AC-07', name: 'Access control anomaly', line: 'Tailgating at a controlled door is always escalated. Lock inward, verify by roster, unlock on confirmation.' },
  { id: 'SOP-FS-01', name: 'Fire and smoke', line: 'Overhead look with a drone, notify the fire picket, hold ground assets clear. No agent suppresses anything.' },
  { id: 'SOP-AS-02', name: 'Airspace', line: 'Unknown aircraft: notify the duty officer and the helipad controller, ground our own drones, keep the PTZ tracking. No interception exists in this system.' },
  { id: 'SOP-MD-01', name: 'Medical', line: 'Person down: medic paged autonomously, an observer sent to relay. The only step allowed at Autonomous by default.' },
  { id: 'SOP-CY-04', name: 'Credential anomaly', line: 'Suspend the account, keep door policy unchanged, notify the security manager. Overwatch correlates physical and cyber signals first.' },
];

/** Global view: who is allowed to do what, what was done, and the written policy behind both. */
export function GovernanceView() {
  const [tab, setTab] = useState<Tab>('autonomy');
  const auditCount = useStore((s) => s.audit.length);
  return (
    <div className="h-full min-h-0 flex flex-col">
      <header className="px-4 pt-3 pb-2 shrink-0 flex items-center gap-4 flex-wrap">
        <h1 className="text-20 font-medium">Governance</h1>
        <div className="seg" role="tablist" aria-label="Governance sections">
          <button type="button" role="tab" aria-selected={tab === 'autonomy'} aria-pressed={tab === 'autonomy'} onClick={() => setTab('autonomy')}>Autonomy</button>
          <button type="button" role="tab" aria-selected={tab === 'audit'} aria-pressed={tab === 'audit'} onClick={() => setTab('audit')}>
            Audit log <span className="mono ml-1">{auditCount.toLocaleString('en-GB')}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'policy'} aria-pressed={tab === 'policy'} onClick={() => setTab('policy')}>Policy</button>
        </div>
        <div className="text-12 text-text-muted">
          {tab === 'autonomy' && 'Levels are set per agent and can be overridden per action type. Every change is recorded with who made it.'}
          {tab === 'audit' && 'Append-only. Agents and people write here; nobody edits.'}
          {tab === 'policy' && 'The written rules the agents run under. Short enough to be read aloud.'}
        </div>
      </header>
      <div className="flex-1 min-h-0 px-4 pb-4">
        {tab === 'autonomy' && <AutonomyTab />}
        {tab === 'audit' && <div className="panel h-full min-h-0"><AuditLog /></div>}
        {tab === 'policy' && <PolicyTab />}
      </div>
    </div>
  );
}

/* ---------- Autonomy ---------- */

function AutonomyTab() {
  const agents = useStore((s) => s.agents);
  const pushAudit = useStore((s) => s.pushAudit);
  const pushFeed = useStore((s) => s.pushFeed);
  const [overrides, setOverrides] = useState<Overrides>(() => OVERRIDES);
  const [warn, setWarn] = useState<string | null>(null);

  const change = (agent: OverrideAgent, typeId: string, level: Autonomy) => {
    const prev = overrides[agent][typeId];
    if (prev === level) return;
    const type = ACTION_TYPES.find((t) => t.id === typeId)!;
    const next: Overrides = { ...overrides, [agent]: { ...overrides[agent], [typeId]: level } };
    OVERRIDES = next;
    setOverrides(next);
    setWarn(level === 3 ? `${agent}:${typeId}` : null);
    pushAudit({
      actor: DUTY_OFFICER, actorKind: 'human', action: 'Changed action override', target: `${agentName(agent)} / ${type.label}`,
      record: { from: AUTONOMY_LABELS[prev], to: AUTONOMY_LABELS[level], physicalAsset: !!type.physical, namedApprover: level === 3 ? DUTY_OFFICER : '' },
    });
    pushFeed('overwatch', `${agentName(agent)} override for "${type.label}" set to ${AUTONOMY_LABELS[level]} by ${DUTY_OFFICER}. Recorded.`);
  };

  return (
    <div className="h-full min-h-0 overflow-auto flex flex-col gap-3">
      <Panel title="Agent autonomy levels" right={<span className="text-11 text-text-muted">Changes are recorded under <span className="text-text-primary">{DUTY_OFFICER}</span></span>}>
        <table className="data">
          <thead>
            <tr><th>Agent</th><th>Role</th><th>State</th><th>Level</th><th>What that means right now</th></tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const c = agentStateColor(a.state);
              return (
                <tr key={a.id}>
                  <td className="agent-text font-medium whitespace-nowrap">{a.name}</td>
                  <td className="text-text-muted whitespace-nowrap">{a.role}</td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="dot" style={{ background: c }} />
                      <span style={{ color: a.state === 'watching' ? undefined : c }}>{AGENT_STATE_LABEL[a.state]}</span>
                    </span>
                  </td>
                  <td><AutonomyControl agentId={a.id} /></td>
                  <td className="text-text-muted">
                    {a.autonomy === 0 && `${a.name} logs what it sees and proposes nothing.`}
                    {a.autonomy === 1 && `${a.name} proposes but never executes, even after approval.`}
                    {a.autonomy === 2 && `${a.name} prepares actions and waits for a click in the approval queue.`}
                    {a.autonomy === 3 && <span className="text-advisory">{a.name} acts first and notifies afterwards.</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Per-action overrides for Warden and Dispatch"
        right={<span className="text-11 text-text-muted">An override applies to one action type and takes precedence over the agent level</span>}
      >
        <table className="data">
          <thead>
            <tr>
              <th>Action type</th>
              {OVERRIDE_AGENTS.map((id) => <th key={id}><span className="agent-text">{agentName(id)}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {ACTION_TYPES.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap">
                  {t.label}
                  {t.physical && <span className="text-11 text-text-muted ml-2">physical asset</span>}
                </td>
                {OVERRIDE_AGENTS.map((agent) => {
                  const level = overrides[agent][t.id];
                  const key = `${agent}:${t.id}`;
                  return (
                    <td key={agent}>
                      <div className="seg" role="radiogroup" aria-label={`${agentName(agent)} override for ${t.label}`}>
                        {AUTONOMY_LABELS.map((l, i) => (
                          <button
                            key={l}
                            type="button"
                            role="radio"
                            aria-checked={level === i}
                            aria-pressed={level === i}
                            title={l}
                            onClick={() => change(agent, t.id, i as Autonomy)}
                            style={level === i && i === 3 ? { background: 'rgba(224,169,59,0.16)' } : undefined}
                          >
                            {SHORT[i]}
                          </button>
                        ))}
                      </div>
                      {warn === key && (
                        <div className="text-11 text-advisory mt-1 max-w-[320px]">
                          {t.physical
                            ? `Autonomous dispatch of a physical asset. Policy requires a named approver for this change: recorded as ${DUTY_OFFICER}.`
                            : `${agentName(agent)} will ${t.label.toLowerCase()} without waiting for approval and notify afterwards. Recorded under ${DUTY_OFFICER}.`}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-3 py-2 text-11 text-text-muted">
          Obs = Observe, Rec = Recommend, Appr = Act with approval, Auto = Autonomous. Nothing here can make an agent propose contact or interception; those actions do not exist in the system.
        </p>
      </Panel>
    </div>
  );
}

/* ---------- Policy ---------- */

function PolicyTab() {
  return (
    <div className="h-full min-h-0 overflow-auto flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Panel title={`${SOP_PB_03.id} · ${SOP_PB_03.name}`} right={<span className="text-11 text-text-muted">Loaded by Warden on a correlated perimeter signal</span>}>
          <ol className="px-4 py-3 space-y-1.5 text-14">
            {SOP_PB_03.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mono text-12 text-text-muted w-4 shrink-0 pt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Autonomy and oversight">
          <ul className="px-4 py-3 space-y-2 text-14">
            <li><span className="font-medium">Physical assets need a person.</span> <span className="text-text-muted">No agent may dispatch a drone or a ground robot autonomously without a named approver recorded against the change.</span></li>
            <li><span className="font-medium">Observation only.</span> <span className="text-text-muted">Agents may observe, illuminate, alert, send an unmanned asset to look, notify a person, lock or unlock a door, and raise an incident. Nothing else exists.</span></li>
            <li><span className="font-medium">Retention.</span> <span className="text-text-muted">Full reasoning chains, evidence and audit rows are kept for 90 days, then summarised.</span></li>
            <li><span className="font-medium">Declines teach.</span> <span className="text-text-muted">A decline reason is recorded against the proposal type and weights future proposals from that agent.</span></li>
            <li><span className="font-medium">Exports are logged.</span> <span className="text-text-muted">Every export of the audit log is itself an audit row, with who, when and how many rows.</span></li>
            <li><span className="font-medium">Escalation.</span> <span className="text-text-muted">A proposal without a decision for four minutes pages the duty officer. It never executes by timeout.</span></li>
          </ul>
        </Panel>
      </div>

      <Panel title="Other procedures" right={<span className="text-11 text-text-muted">One line each; the full text is in the SOP library</span>}>
        <table className="data">
          <thead><tr><th>Procedure</th><th>Name</th><th>In one line</th></tr></thead>
          <tbody>
            {OTHER_SOPS.map((s) => (
              <tr key={s.id}>
                <td className="mono whitespace-nowrap">{s.id}</td>
                <td className="whitespace-nowrap">{s.name}</td>
                <td className="text-text-muted">{s.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="text-12 text-text-muted px-1">
        Last edited by <span className="text-text-primary">Security manager R. Bell</span>, yesterday. Policy edits are recorded in the audit log like any other change.
      </div>
    </div>
  );
}
