import { CapabilityShell } from '@/capabilities/CapabilityShell';
import type { CapabilityProps } from '@/capabilities/CapabilityView';
import { EmptyState } from '@/ui/bits';

// STUB — replaced by the full module.
export function SceneUnderstanding({ zone }: CapabilityProps) {
  return <CapabilityShell capability="scene" status={`Watching ${zone.name}.`} primary={<EmptyState title="SceneUnderstanding" body="Module under construction." />} />;
}
