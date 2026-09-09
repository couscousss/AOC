import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Aerial({ zone }: CapabilityProps) {
  return <CapabilityShell capability="aerial" status={`Watching ${zone.name}.`} primary={<EmptyState title="Aerial" body="Module under construction." />} />;
}
