import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Access({ zone }: CapabilityProps) {
  return <CapabilityShell capability="access" status={`Watching ${zone.name}.`} primary={<EmptyState title="Access" body="Module under construction." />} />;
}
