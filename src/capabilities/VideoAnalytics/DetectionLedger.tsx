import { useMemo, useState } from 'react';
import type { Detection } from '@/lib/types';
import { fmtTime, fmtClock } from '@/lib/time';
import { DetectionThumb } from '@/capabilities/CapabilityShell';

type Props = {
  /** every detection on the wall's cameras, chronological, already cut to the 24h window and the replay point */
  rows: Detection[];
  /** the camera the wall currently has expanded, if any: the ledger follows it */
  cameraId: string | null;
  onClearCamera: () => void;
  onOpenIncident: (id: string) => void;
  onShowCamera: (sensorId: string) => void;
  replayAt: number | null;
};

/**
 * The detection ledger: what Sentry saw and what Sift decided about it, every time.
 * This is what proves the system works continuously, not only when something happens.
 */
export function DetectionLedger({ rows, cameraId, onClearCamera, onOpenIncident, onShowCamera, replayAt }: Props) {
  const [mode, setMode] = useState<'all' | 'escalations'>('all');

  const scoped = useMemo(() => (cameraId ? rows.filter((d) => d.sensorId === cameraId) : rows), [rows, cameraId]);
  const dismissed = useMemo(() => scoped.filter((d) => d.disposition === 'dismissed').length, [scoped]);
  const escalated = scoped.length - dismissed;
  const visible = useMemo(() => {
    const list = mode === 'escalations' ? scoped.filter((d) => d.disposition !== 'dismissed') : scoped;
    return list.slice().reverse();
  }, [scoped, mode]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 pt-1.5 pb-1 border-b hairline shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-12 text-text-muted flex items-center gap-2 min-w-0">
            <span>Detection ledger</span>
            {cameraId && (
              <button type="button" className="chip" aria-pressed onClick={onClearCamera} title="Show every camera on the wall">
                <span className="mono">{cameraId}</span> ×
              </button>
            )}
          </div>
          <div className="seg shrink-0" role="radiogroup" aria-label="Ledger filter">
            <button type="button" role="radio" aria-checked={mode === 'all'} aria-pressed={mode === 'all'} onClick={() => setMode('all')}>All</button>
            <button type="button" role="radio" aria-checked={mode === 'escalations'} aria-pressed={mode === 'escalations'} onClick={() => setMode('escalations')}>Escalations</button>
          </div>
        </div>
        <div className="text-11 text-text-muted mt-0.5 truncate" title={`${escalated} escalated or merged into an incident`}>
          {replayAt ? `Ledger as it stood at ${fmtClock(replayAt)}: ` : ''}
          <span className="text-text-primary">{scoped.length}</span> detection{scoped.length === 1 ? '' : 's'} in 24h ·{' '}
          <span className="text-text-primary">{dismissed}</span> dismissed by Sift without a person seeing them
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-12 text-text-muted">
          {mode === 'escalations'
            ? 'Nothing was escalated in this window. Every detection was dismissed by Sift with a stated reason.'
            : cameraId
              ? `No detections on ${cameraId} in the last 24 hours.`
              : 'No detections on these cameras in the last 24 hours.'}
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-auto divide-y divide-line/50" aria-label="Detections">
          {visible.map((d) => {
            const merged = !!d.incidentId;
            return (
              <li
                key={d.id}
                className="px-3 py-1 cursor-pointer hover:bg-surface-raised"
                onClick={() => (merged ? onOpenIncident(d.incidentId!) : onShowCamera(d.sensorId))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); merged ? onOpenIncident(d.incidentId!) : onShowCamera(d.sensorId); } }}
                role="button"
                tabIndex={0}
                title={merged ? `Open ${d.incidentId}` : `Show ${d.sensorId} on the wall`}
              >
                <div className="flex items-center gap-2 text-12 min-w-0">
                  <DetectionThumb d={d} size={22} />
                  <span className="mono text-text-muted shrink-0">{fmtTime(d.ts)}</span>
                  <span className="mono shrink-0">{d.sensorId}</span>
                  <span className="truncate">{d.class}</span>
                  <span className="mono text-text-muted ml-auto shrink-0">{Math.round(d.confidence * 100)}%</span>
                </div>
                <div className={`text-11 agent-text truncate pl-[46px] ${d.disposition === 'dismissed' ? 'opacity-70' : ''}`} title={d.dispositionReason}>
                  {d.dispositionReason}
                  {merged && <span className="text-text-muted"> · open incident →</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
