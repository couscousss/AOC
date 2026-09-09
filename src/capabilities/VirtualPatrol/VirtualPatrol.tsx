import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function VirtualPatrol({ zone }: CapabilityProps) {
  return <CapabilityShell capability="patrol" status={`Watching ${zone.name}.`} primary={<EmptyState title="VirtualPatrol" body="Module under construction." />} />;
}
