import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function VideoAnalytics({ zone }: CapabilityProps) {
  return <CapabilityShell capability="video" status={`Watching ${zone.name}.`} primary={<EmptyState title="VideoAnalytics" body="Module under construction." />} />;
}
