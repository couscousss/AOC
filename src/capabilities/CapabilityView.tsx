import type { CapabilityId, Zone } from '@/lib/types';
import { VideoAnalytics } from './VideoAnalytics/VideoAnalytics';
import { SceneUnderstanding } from './SceneUnderstanding/SceneUnderstanding';
import { VirtualPatrol } from './VirtualPatrol/VirtualPatrol';
import { Robotics } from './Robotics/Robotics';
import { Aerial } from './Aerial/Aerial';
import { Environmental } from './Environmental/Environmental';
import { Facilities } from './Facilities/Facilities';
import { Cyber } from './Cyber/Cyber';
import { Access } from './Access/Access';

export type CapabilityProps = { zone: Zone };

/** Routes a capability id to its module. Every module renders inside CapabilityShell. */
export function CapabilityView({ capability, zone }: { capability: CapabilityId; zone: Zone }) {
  switch (capability) {
    case 'video': return <VideoAnalytics zone={zone} />;
    case 'scene': return <SceneUnderstanding zone={zone} />;
    case 'patrol': return <VirtualPatrol zone={zone} />;
    case 'robotics': return <Robotics zone={zone} />;
    case 'aerial': return <Aerial zone={zone} />;
    case 'environmental': return <Environmental zone={zone} />;
    case 'facilities': return <Facilities zone={zone} />;
    case 'cyber': return <Cyber zone={zone} />;
    case 'access': return <Access zone={zone} />;
  }
}
