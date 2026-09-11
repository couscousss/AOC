import { useMemo, useState } from 'react';
import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { useStore } from '@/store/useStore';
import type { Asset } from '@/lib/types';
import { EmptyState } from '@/ui/bits';
import { FleetBoard } from './FleetBoard';
import { UnitDetail } from './UnitDetail';
import { MissionPlanner } from './MissionPlanner';
import { PatrolSchedule } from './PatrolSchedule';
import { MaintenancePanel } from './Maintenance';
import { ROBOTICS_TABS, isActive, isGroundUnit, shortTask, type RoboticsTab } from './shared';

/** Machine-authored status line, derived from the live fleet. */
function statusLine(units: Asset[]) {
  const active = units.filter(isActive);
  if (active.length === 0) return 'No units on task. Ground fleet docked and charging.';
  const parts = active.slice(0, 3).map((u) => `${u.callsign} on ${shortTask(u)}`);
  const more = active.length > 3 ? `, ${active.length - 3} more` : '';
  return `Tracking ${active.length} unit${active.length === 1 ? '' : 's'} on task. ${parts.join(', ')}${more}.`;
}

export function Robotics({ zone }: CapabilityProps) {
  const assets = useStore((s) => s.assets);
  const units = useMemo(() => assets.filter(isGroundUnit), [assets]);
  const [tab, setTab] = useState<RoboticsTab>('fleet');
  const [unitId, setUnitId] = useState<string | null>(null);
  const unit = units.find((u) => u.id === unitId) ?? units[0];

  const onTask = units.filter(isActive).length;
  const atDock = units.filter((u) => u.state === 'docked' || u.state === 'charging').length;
  const flagged = units.filter((u) => u.maintenance.flagged || u.state === 'maintenance').length;
  const inZone = units.length ? `${units.length} units` : 'No units';

  const openUnit = (id: string) => { setUnitId(id); setTab('unit'); };
  const openPlanner = (id: string) => { setUnitId(id); setTab('planner'); };

  // Map-centric tabs need the vertical space; board-style tabs keep the shell's activity row.
  const wide = tab === 'unit' || tab === 'planner' || tab === 'schedule';

  const primary = (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b hairline shrink-0">
        <div className="seg" role="tablist" aria-label="Robotics views">
          {ROBOTICS_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-11 text-text-muted truncate">
          Ground fleet · {inZone} · {onTask} on task · {atDock} at dock{flagged ? <> · <span className="text-advisory">{flagged} flagged</span></> : null} · viewed from {zone.name}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {!unit ? (
          <EmptyState title="No ground units on the roster" body="The robot dock reports no registered units. Fitter will re-enumerate the fleet at the 06:00 health sweep." />
        ) : tab === 'fleet' ? (
          <FleetBoard units={units} onOpen={openUnit} />
        ) : tab === 'unit' ? (
          <UnitDetail unit={unit} units={units} onSelect={setUnitId} onPlan={openPlanner} />
        ) : tab === 'planner' ? (
          <MissionPlanner unit={unit} units={units} onSelectUnit={setUnitId} />
        ) : tab === 'schedule' ? (
          <PatrolSchedule units={units} />
        ) : (
          <MaintenancePanel units={units} />
        )}
      </div>
    </div>
  );

  return <CapabilityShell capability="robotics" status={statusLine(units)} primary={primary} noLower={wide} lowerHeight={150} />;
}
