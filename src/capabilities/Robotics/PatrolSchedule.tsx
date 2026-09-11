import { useMemo } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import type { Asset, AssetClass } from '@/lib/types';
import { makeRng } from '@/lib/rng';
import { DEMO_NOW, DAY_MS } from '@/lib/time';
import { agentName } from '@/data/agents';
import { shortTask } from './shared';

const BLOCKS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'];
const ROUTES: { id: string; short: string; name: string; eligible: AssetClass[]; nightOnly: boolean; live: string }[] = [
  { id: 'perimeter', short: 'Perimeter', name: 'Perimeter loop', eligible: ['robot-dog', 'ugv'], nightOnly: false, live: 'perimeter loop' },
  { id: 'motorpool', short: 'Motor pool', name: 'Motor pool sweep', eligible: ['ugv', 'robot-dog'], nightOnly: false, live: 'motor pool sweep' },
  { id: 'hq', short: 'HQ', name: 'HQ loop', eligible: ['humanoid', 'robot-dog', 'service'], nightOnly: true, live: 'HQ' },
];

type Cell = { route: (typeof ROUTES)[number]; unit?: string; gap: boolean; note?: string; notRequired?: boolean };
type Day = { label: string; cells: Cell[][] };

/** Deterministic week plan. Same seed, same grid, every run. */
function buildGrid(units: Asset[]) {
  const rng = makeRng(20260309);
  const weekStart = startOfWeek(DEMO_NOW, { weekStartsOn: 1 });
  const now = new Date(DEMO_NOW);
  const nowDay = (now.getDay() + 6) % 7;
  const nowBlock = Math.floor(now.getHours() / 4);
  const liveFor = (r: (typeof ROUTES)[number]) => units.find((u) => shortTask(u).startsWith(r.live))?.callsign;
  const service = units
    .filter((u) => u.maintenance.flagged)
    .map((u) => ({ callsign: u.callsign, day: Math.floor((new Date(u.maintenance.nextDue).getTime() - weekStart.getTime()) / DAY_MS) }))
    .filter((s) => s.day >= 0 && s.day < 7);

  let gaps = 0, serviceGaps = 0;
  const days: Day[] = [];
  for (let d = 0; d < 7; d++) {
    const cells: Cell[][] = [];
    for (let b = 0; b < 6; b++) {
      const used = new Set<string>();
      const block: Cell[] = [];
      for (const route of ROUTES) {
        if (route.nightOnly && b >= 2 && b <= 4) { block.push({ route, gap: false, notRequired: true }); continue; }
        if (d === nowDay && b === nowBlock) {
          const unit = liveFor(route);
          if (unit) used.add(unit);
          if (!unit) gaps++;
          block.push({ route, unit, gap: !unit, note: unit ? undefined : 'No unit on this route now' });
          continue;
        }
        const inService = service.find((s) => s.day === d && (b === 2 || b === 3));
        const pool = units.filter((u) => route.eligible.includes(u.class) && !used.has(u.callsign) && !(inService && u.callsign === inService.callsign));
        if (inService && route.id === 'motorpool') {
          gaps++; serviceGaps++;
          block.push({ route, gap: true, note: `${inService.callsign} in service` });
          continue;
        }
        if (pool.length === 0 || rng.chance(0.06)) {
          gaps++;
          block.push({ route, gap: true, note: pool.length === 0 ? 'No eligible unit' : 'Unassigned' });
          continue;
        }
        const pick = pool[Math.floor(rng.next() * pool.length)];
        used.add(pick.callsign);
        block.push({ route, unit: pick.callsign, gap: false });
      }
      cells.push(block);
    }
    days.push({ label: format(addDays(weekStart, d), 'EEE d MMM'), cells });
  }
  return { days, gaps, serviceGaps, nowDay, nowBlock, weekLabel: format(weekStart, 'd MMM'), service };
}

/** Week grid: which unit covers which route in each four-hour block. Gaps in advisory. */
export function PatrolSchedule({ units }: { units: Asset[] }) {
  const ids = units.map((u) => u.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const grid = useMemo(() => buildGrid(units), [ids]);
  const svc = grid.service[0];
  const proposal = grid.gaps === 0
    ? 'Full coverage this week. No changes proposed.'
    : `${grid.gaps} uncovered block${grid.gaps === 1 ? '' : 's'} this week${grid.serviceGaps ? `, ${grid.serviceGaps} from ${svc?.callsign}'s service window` : ''}. Badger-1 can absorb the day-shift motor pool sweeps if the perimeter loop drops to hourly; I will propose the swap at the Monday planning review.`;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-1.5 border-b hairline flex items-center justify-between gap-4 text-11 shrink-0">
        <div className="text-text-muted shrink-0">Week of {grid.weekLabel} · four-hour blocks · <span className="text-advisory">amber</span> marks a coverage gap · HQ loop runs at night only</div>
        <div className="agent-text truncate" title={proposal}><span className="font-medium">{agentName('dispatch')}</span> — {proposal}</div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="data">
          <thead className="sticky top-0 bg-surface-inset">
            <tr>
              <th className="w-[110px]">Day</th>
              {BLOCKS.map((b) => <th key={b} className="mono font-normal">{b}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.days.map((day, d) => (
              <tr key={day.label}>
                <td className={d === grid.nowDay ? 'font-medium' : 'text-text-muted'}>{day.label}</td>
                {day.cells.map((block, b) => {
                  const isNow = d === grid.nowDay && b === grid.nowBlock;
                  const hasGap = block.some((c) => c.gap);
                  return (
                    <td
                      key={b}
                      className="align-top"
                      style={{
                        background: hasGap ? 'rgba(224,169,59,0.10)' : undefined,
                        boxShadow: isNow ? 'inset 0 0 0 1px var(--agent)' : undefined,
                      }}
                    >
                      {isNow && <div className="text-[10px] agent-text mono leading-3 mb-0.5">now</div>}
                      {block.map((c) => (
                        <div key={c.route.id} className="flex items-baseline gap-1.5 text-11 leading-4 whitespace-nowrap">
                          <span className="narrow text-text-muted w-[62px] shrink-0">{c.route.short}</span>
                          {c.notRequired ? (
                            <span className="text-text-muted">—</span>
                          ) : c.gap ? (
                            <span className="text-advisory">{c.note ?? 'No cover'}</span>
                          ) : (
                            <span>{c.unit}</span>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
