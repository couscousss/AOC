import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { StatusBar } from '@/chrome/StatusBar';
import { NavRail } from '@/chrome/NavRail';
import { AlertRail } from '@/chrome/AlertRail';
import { TimelineScrubber } from '@/chrome/TimelineScrubber';
import { CommandBar } from '@/chrome/CommandBar';
import { WhyPanel } from '@/agents/ReasoningChain';
import { Stage } from './Stage';
import { Ticker } from './Ticker';
import { ScenarioController } from '@/scenario/ScenarioController';
import { AgentDrawer } from '@/agents/AgentDrawer';
import { AgentFeed } from '@/agents/AgentFeed';
import { Toasts } from './Toasts';
import { BEST_VIEWED } from '@/data/copy';

export function App() {
  const posture = useStore((s) => s.posture);
  const goUp = useStore((s) => s.goUp);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const feedOpen = useStore((s) => s.feedOpen);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1280);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen(!useStore.getState().commandOpen); return; }
      if (e.key === 'Escape') { const t = e.target as HTMLElement; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !useStore.getState().commandOpen) { (t as HTMLInputElement).blur(); return; } goUp(); }
    };
    window.addEventListener('keydown', onKey);
    const onResize = () => setNarrow(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [goUp, setCommandOpen]);

  return (
    <div className={`h-full flex flex-col bg-surface-deep ${posture === 'elevated' ? 'posture-elevated' : posture === 'alarm' ? 'posture-alarm' : ''}`} style={{ transition: 'box-shadow 600ms ease' }}>
      <Ticker />
      <ScenarioController />
      <StatusBar />
      <div className="flex-1 min-h-0 flex">
        <NavRail />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col relative" id="stage">
          <div className="flex-1 min-h-0 relative">
            <Stage />
            {feedOpen && <AgentFeed />}
          </div>
          <TimelineScrubber />
        </main>
        <AlertRail />
      </div>
      <CommandBar />
      <WhyPanel />
      <AgentDrawer />
      <Toasts />
      {narrow && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 panel px-3 py-1.5 text-12 text-advisory shadow-xl" role="status">{BEST_VIEWED}</div>
      )}
    </div>
  );
}
