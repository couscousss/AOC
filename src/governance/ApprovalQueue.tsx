import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { AgentAction, AuditEntry, Evidence, Incident, TimelineEvent } from '@/lib/types';
import { AUTONOMY_LABELS } from '@/lib/types';
import { AgentChip } from '@/agents/AgentChip';
import { ReasoningChain, WhyButton } from '@/agents/ReasoningChain';
import { AutonomyControl, DUTY_OFFICER } from '@/governance/AutonomyControl';
import { CctvFeed } from '@/ui/CctvFeed';
import { Panel } from '@/ui/bits';
import { DECLINE_REASONS } from '@/data/copy';
import { agentName } from '@/data/agents';
import { ZONE_BY_ID } from '@/data/zones';
import { demoNow, fmtDuration, fmtTime } from '@/lib/time';

const LEVELS: { name: string; body: string }[] = [
  { name: 'Observe', body: 'Detects and logs only. Nothing is proposed.' },
  { name: 'Recommend', body: 'Surfaces a proposed action but takes none.' },
  { name: 'Act with approval', body: 'Prepares the action and executes it on a human click. This queue.' },
  { name: 'Autonomous', body: 'Acts, then notifies. Recorded with a named approver.' },
];

const HUMAN_DECISION_ACTIONS = new Set(['Approved proposal', 'Declined proposal', 'Human decision']);

/** Re-render once a second so countdowns and "ago" copy stay honest. */
function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** Global view: everything waiting on a person, and the record of what people decided. */
export function ApprovalQueue() {
  useTick(1000);
  const actions = useStore((s) => s.actions);
  const incidents = useStore((s) => s.incidents);
  const audit = useStore((s) => s.audit);
  const agents = useStore((s) => s.agents);
  const kpi = useStore((s) => s.kpi);

  const pending = useMemo(() => actions.filter((a) => a.approvalState === 'pending').slice().sort((a, b) => a.ts - b.ts), [actions]);
  const decided = useMemo(
    () => actions.filter((a) => a.approvalState === 'approved' || a.approvalState === 'declined').slice().sort((a, b) => b.ts - a.ts),
    [actions],
  );
  const historical = useMemo(() => {
    const out: { event: TimelineEvent; incident: Incident }[] = [];
    for (const inc of incidents) for (const e of inc.timeline) if (e.actor === 'human') out.push({ event: e, incident: inc });
    out.sort((a, b) => b.event.ts - a.event.ts);
    return out.slice(0, 6);
  }, [incidents]);
  const lastHuman = useMemo(
    () =>
      audit
        .filter((r) => r.actorKind === 'human' && HUMAN_DECISION_ACTIONS.has(r.action))
        .reduce<AuditEntry | null>((best, r) => (!best || r.ts > best.ts ? r : best), null),
    [audit],
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      <header className="px-4 pt-3 pb-2 shrink-0 flex items-baseline gap-3 flex-wrap">
        <h1 className="text-20 font-medium">Approvals</h1>
        <div className={`text-12 ${pending.length ? 'text-advisory' : 'text-text-muted'}`}>
          {pending.length === 0 ? 'Nothing pending' : pending.length === 1 ? '1 proposal waiting on you' : `${pending.length} proposals waiting on you`}
        </div>
        <div className="text-12 text-text-muted">
          Agents propose. You decide. Every decision is recorded under your name and shapes what gets proposed next time.
        </div>
      </header>

      <div className="flex-1 min-h-0 flex gap-3 px-4 pb-4">
        <section className="flex-1 min-w-0 min-h-0 overflow-auto" aria-label="Pending proposals">
          {pending.length === 0 ? (
            <EmptyQueue autoResolvedPct={kpi.autoResolvedPct} lastHuman={lastHuman} />
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((a) => <PendingCard key={a.id} action={a} />)}
            </div>
          )}
        </section>

        <aside className="w-[420px] shrink-0 min-h-0 overflow-auto flex flex-col gap-3" aria-label="Decision record and autonomy levels">
          <Panel title="Recent decisions" right={<span className="text-11 text-text-muted">{decided.length ? `${decided.length} this session` : 'None this session'}</span>}>
            {decided.length > 0 && (
              <ul>
                {decided.map((a) => <DecidedRow key={a.id} action={a} />)}
              </ul>
            )}
            {historical.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-11 text-text-muted">{decided.length ? 'Earlier, from the incident record' : 'From the incident record'}</div>
                <ul>
                  {historical.map(({ event, incident }) => (
                    <HistoricalRow key={event.id} event={event} incident={incident} />
                  ))}
                </ul>
              </div>
            )}
            {decided.length === 0 && historical.length === 0 && (
              <div className="px-3 py-3 text-12 text-text-muted">No human decisions on record yet.</div>
            )}
          </Panel>

          <Panel title="The four autonomy levels" right={<span className="text-11 text-text-muted">Set per agent</span>}>
            <ol className="px-3 pt-2 pb-1 space-y-1 text-12">
              {LEVELS.map((l, i) => (
                <li key={l.name} className="flex gap-2">
                  <span className="mono text-text-muted w-3 shrink-0">{i}</span>
                  <span><span className="text-text-primary font-medium">{l.name}.</span> <span className="text-text-muted">{l.body}</span></span>
                </li>
              ))}
            </ol>
            <table className="data mt-1">
              <thead>
                <tr><th>Agent</th><th>Role</th><th>Level</th></tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td className="agent-text font-medium">{a.name}</td>
                    <td className="text-text-muted">{a.role}</td>
                    <td><AutonomyControl agentId={a.id} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-11 text-text-muted">
              Moving an agent to {AUTONOMY_LABELS[3]} asks for confirmation and is recorded under your name. Per-action overrides for Warden and Dispatch are in Governance.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Pending proposal ---------- */

function PendingCard({ action: a }: { action: AgentAction }) {
  const approve = useStore((s) => s.approve);
  const decline = useStore((s) => s.decline);
  const openIncident = useStore((s) => s.openIncident);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const zone = a.zoneId ? ZONE_BY_ID[a.zoneId] : null;
  const name = agentName(a.agentId);

  return (
    <article className="panel flex flex-col" aria-label={`Proposal: ${a.title}`}>
      <header className="px-4 py-3 border-b hairline flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-12 text-text-muted">
            <AgentChip agentId={a.agentId} />
            <span>proposed at</span>
            <span className="mono">{fmtTime(a.ts)}</span>
            {zone && <span>· {zone.name}</span>}
            {a.incidentId && (
              <button type="button" className="mono text-11 px-1 rounded border hairline hover:bg-surface-inset" onClick={() => openIncident(a.incidentId!)} title="Open the incident">
                {a.incidentId}
              </button>
            )}
          </div>
          <h2 className="text-16 font-medium mt-1 leading-5">{a.title}</h2>
          <p className="agent-text text-14 leading-5 mt-1">{a.action}</p>
        </div>
        <Countdown escalateAt={a.escalateAt} />
      </header>

      <div className="px-4 pt-3 grid grid-cols-[1fr_300px] gap-4">
        <div className="min-w-0">
          <div className="text-12 text-text-muted mb-1.5">Why</div>
          <div className="inset px-3 py-2">
            <ReasoningChain action={a} compact />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-12 text-text-muted mb-1.5">Evidence</div>
          {a.evidence && a.evidence.length > 0 ? (
            <EvidenceList evidence={a.evidence} />
          ) : (
            <div className="inset px-3 py-2 text-12 text-text-muted">No sensor evidence attached. The reasoning stands on the incident record{a.incidentId ? ` for ${a.incidentId}` : ''}.</div>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 grid grid-cols-2 gap-3 text-12">
        <div className="inset px-3 py-2">
          <div className="text-text-muted mb-0.5">If approved</div>
          <div className="agent-text">{a.ifApproved ?? 'The action runs as described above and the outcome is written to the incident and the audit log.'}</div>
        </div>
        <div className="inset px-3 py-2">
          <div className="text-text-muted mb-0.5">If declined</div>
          <div className="agent-text">{a.ifDeclined ?? `${name} takes no action, keeps observing, and records your reason for future proposals of this type.`}</div>
        </div>
      </div>

      <footer className="px-4 py-3 mt-3 border-t hairline flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => approve(a.id, DUTY_OFFICER)}>Approve</button>
        {declining ? (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-12 text-text-muted" htmlFor={`reason-${a.id}`}>Reason</label>
            <select id={`reason-${a.id}`} className="field !w-auto" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="btn" onClick={() => { decline(a.id, reason, DUTY_OFFICER); setDeclining(false); }}>Confirm decline</button>
            <button type="button" className="btn btn-sm" onClick={() => setDeclining(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setDeclining(true)}>Decline</button>
        )}
        <span className="ml-auto text-11 text-text-muted">Deciding as <span className="text-text-primary">{DUTY_OFFICER}</span></span>
        <p className="basis-full text-11 text-text-muted">
          Declining with a reason is how the system learns. {name} records it and weights future proposals of this type.
        </p>
      </footer>
    </article>
  );
}

function Countdown({ escalateAt }: { escalateAt?: number }) {
  if (!escalateAt) return null;
  const remaining = escalateAt - demoNow();
  if (remaining <= 0) {
    return (
      <div className="shrink-0 text-right max-w-[190px]">
        <div className="text-12 text-advisory">Escalated to the duty officer by pager</div>
        <div className="text-11 text-text-muted">No decision within 4 minutes. The proposal stays open.</div>
      </div>
    );
  }
  const s = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <div className="shrink-0 text-right">
      <div className="text-11 text-text-muted">Auto-escalation in</div>
      <div className={`mono text-20 leading-6 ${s <= 60 ? 'text-advisory' : ''}`} aria-live="off">{mm}:{ss}</div>
      <div className="text-11 text-text-muted">then the duty officer is paged</div>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  const visual = evidence.filter((e) => e.scene);
  const textual = evidence.filter((e) => !e.scene);
  return (
    <div className="flex flex-col gap-2">
      {visual.length > 0 && (
        <div className={`grid gap-2 ${visual.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {visual.map((e) => (
            <figure key={e.id} className="min-w-0">
              <CctvFeed
                sensorId={e.sensorId ?? e.id}
                scene={e.scene!}
                label={e.label}
                variant={e.kind === 'thermal' ? 'thermal' : e.kind === 'drone' ? 'drone' : 'cctv'}
                showBoxes={false}
                compact
                className="rounded-[3px] border hairline"
              />
              <figcaption className="mono text-[10px] leading-4 text-text-muted truncate mt-0.5" title={e.detail ? `${e.label} · ${e.detail}` : e.label}>
                {e.label}{e.detail ? ` · ${e.detail}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {textual.length > 0 && (
        <ul className="inset overflow-hidden">
          {textual.map((e) => (
            <li key={e.id} className="mono text-11 px-2 py-1 border-b hairline last:border-b-0 flex gap-2">
              <span className="text-text-muted shrink-0">{fmtTime(e.ts)}</span>
              <span className="text-text-muted shrink-0">{e.kind}</span>
              <span className="min-w-0 truncate" title={e.detail ? `${e.label} · ${e.detail}` : e.label}>
                {e.label}{e.detail ? ` · ${e.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Right column ---------- */

function DecidedRow({ action: a }: { action: AgentAction }) {
  const openIncident = useStore((s) => s.openIncident);
  const withdrawn = a.approvalState === 'declined' && !a.approvedBy;
  const byPolicy = a.approvedBy === 'Autonomous (policy)';
  const verb = a.approvalState === 'approved' ? 'Approved' : withdrawn ? 'Withdrawn' : 'Declined';
  return (
    <li className="px-3 py-2 border-b hairline">
      <div className="flex items-center gap-2 text-11 text-text-muted">
        <span className="mono">{fmtTime(a.ts)}</span>
        <span className="agent-text">{agentName(a.agentId)}</span>
        {a.incidentId && (
          <button type="button" className="mono hover:text-text-primary" onClick={() => openIncident(a.incidentId!)} title="Open the incident">{a.incidentId}</button>
        )}
        <WhyButton actionId={a.id} className="ml-auto" />
      </div>
      <div className="text-12 mt-0.5 leading-4">{a.title}</div>
      <div className="text-12 mt-0.5">
        <span className={a.approvalState === 'approved' ? '' : 'text-text-muted'}>{verb}</span>
        {a.approvedBy && (
          <span> by <span className={byPolicy ? 'agent-text' : 'text-text-primary'}>{a.approvedBy}</span></span>
        )}
        {a.declineReason && <span className="text-text-muted"> · {a.declineReason.replace(/^Withdrawn — /, '')}</span>}
      </div>
    </li>
  );
}

function HistoricalRow({ event, incident }: { event: TimelineEvent; incident: Incident }) {
  const openIncident = useStore((s) => s.openIncident);
  return (
    <li className="px-3 py-1.5 border-b hairline last:border-b-0 text-12 flex gap-2 items-baseline">
      <span className="mono text-11 text-text-muted shrink-0">{fmtTime(event.ts)}</span>
      <span className="min-w-0 flex-1">
        <span className="text-text-primary">{event.actorName}</span> <span className="text-text-primary/80">{event.text}</span>
      </span>
      <button type="button" className="mono text-11 text-text-muted hover:text-text-primary shrink-0" onClick={() => openIncident(incident.id)} title={incident.title}>
        {incident.id}
      </button>
    </li>
  );
}

/* ---------- Empty state ---------- */

function EmptyQueue({ autoResolvedPct, lastHuman }: { autoResolvedPct: number; lastHuman: AuditEntry | null }) {
  const now = demoNow();
  const ref = lastHuman ? (typeof lastHuman.record.incident === 'string' && lastHuman.record.incident) || lastHuman.target : null;
  const lastLine = lastHuman && ref
    ? `the last human decision was ${fmtDuration(now - lastHuman.ts)} ago on ${ref}.`
    : 'no human decision has been needed this shift.';
  return (
    <div className="h-full min-h-[320px] panel flex flex-col items-center justify-center text-center px-8 gap-2">
      <div className="text-20 font-medium">Nothing waiting on you.</div>
      <p className="text-14 text-text-muted max-w-[520px]">
        <span className="mono text-text-primary">{Math.round(autoResolvedPct)}%</span> of tonight's traffic was resolved by agents; {lastLine}
      </p>
      <p className="text-12 text-text-muted max-w-[520px] mt-2">
        Proposals appear here the moment an agent needs a decision. Warden pages the duty officer after four minutes without one.
      </p>
    </div>
  );
}
