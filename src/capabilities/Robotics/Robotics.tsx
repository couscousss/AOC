import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Robotics({ zone }: CapabilityProps) {
  return <CapabilityShell capability="robotics" status={`Watching ${zone.name}.`} primary={<EmptyState title="Robotics" body="Module under construction." />} />;
}
