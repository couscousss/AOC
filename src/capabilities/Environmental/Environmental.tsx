import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function Environmental({ zone }: CapabilityProps) {
  return <CapabilityShell capability="environmental" status={`Watching ${zone.name}.`} primary={<EmptyState title="Environmental" body="Module under construction." />} />;
}
