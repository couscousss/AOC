import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Facilities({ zone }: CapabilityProps) {
  return <CapabilityShell capability="facilities" status={`Watching ${zone.name}.`} primary={<EmptyState title="Facilities" body="Module under construction." />} />;
}
