import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Cyber({ zone }: CapabilityProps) {
  return <CapabilityShell capability="cyber" status={`Watching ${zone.name}.`} primary={<EmptyState title="Cyber" body="Module under construction." />} />;
}
