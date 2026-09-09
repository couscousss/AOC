import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { BEATS, replayTo } from './script';
import { DUTY_OFFICER } from '@/governance/AutonomyControl';

/** Imperative scenario API. Components call these; the controller drives the clock. */
export const scenario = {
  start(mode: 'play' | 'step' = 'play') {
    const s = useStore.getState();
    s.resetAll();
    s.setScenario({ status: 'running', beat: -1, startedAt: Date.now(), elapsed: 0, waitingFor: null, mode });
    s.pushAudit({ actor: DUTY_OFFICER, actorKind: 'human', action: 'Started scripted scenario', target: 'INC-0342 rehearsal', record: { mode } });
    scenario.applyNext();
  },
  pause() {
    const s = useStore.getState();
    if (s.scenario.status === 'running') s.setScenario({ status: 'paused' });
  },
  resume() {
    const s = useStore.getState();
    if (s.scenario.status === 'paused') s.setScenario({ status: 'running' });
  },
  setMode(mode: 'play' | 'step') {
    useStore.getState().setScenario({ mode });
  },
  applyNext() {
    const s = useStore.getState();
    const n = s.scenario.beat + 1;
    if (n >= BEATS.length) { s.setScenario({ status: 'complete', waitingFor: null }); return; }
    const b = BEATS[n];
    b.apply(useStore.getState());
    useStore.getState().setScenario({ beat: n, elapsed: b.t, waitingFor: b.waitFor && !b.waitFor.done(useStore.getState()) ? b.waitFor.key : null });
    if (n === BEATS.length - 1) useStore.getState().setScenario({ status: 'complete' });
  },
  next() {
    const s = useStore.getState();
    if (s.scenario.status === 'idle') { scenario.start('step'); return; }
    if (s.scenario.waitingFor) {
      // The presenter chose to move on: that is the approval.
      s.approve(s.scenario.waitingFor, DUTY_OFFICER);
      s.setScenario({ waitingFor: null });
    }
    scenario.applyNext();
  },
  prev() {
    const s = useStore.getState();
    const n = s.scenario.beat - 1;
    if (n < 0) { scenario.reset(); return; }
    const mode = s.scenario.mode;
    replayTo(n);
    useStore.getState().setScenario({ status: mode === 'play' ? 'paused' : 'running', beat: n, elapsed: BEATS[n].t, waitingFor: null, mode, startedAt: Date.now() });
  },
  jump(n: number) {
    const s = useStore.getState();
    const mode = s.scenario.mode;
    replayTo(n);
    useStore.getState().setScenario({ status: n >= BEATS.length - 1 ? 'complete' : mode === 'play' ? 'paused' : 'running', beat: n, elapsed: BEATS[n].t, waitingFor: null, mode, startedAt: Date.now() });
  },
  reset() {
    const s = useStore.getState();
    s.resetAll();
    s.setScenario({ status: 'idle', beat: -1, elapsed: 0, waitingFor: null, startedAt: 0, mode: 'play' });
    s.setSummaryCard(null);
    s.setFocusReport(false);
  },
};

/** Drives elapsed time in play mode and fires beats on schedule. */
export function ScenarioController() {
  useEffect(() => {
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const s = useStore.getState();
      const sc = s.scenario;
      if (sc.status !== 'running' || sc.mode !== 'play') return;
      if (sc.waitingFor) {
        const b = BEATS[sc.beat];
        if (b?.waitFor && b.waitFor.done(s)) s.setScenario({ waitingFor: null });
        return;
      }
      const elapsed = sc.elapsed + dt;
      const next = BEATS[sc.beat + 1];
      if (next && elapsed >= next.t) scenario.applyNext();
      else s.setScenario({ elapsed });
    }, 100);
    return () => clearInterval(t);
  }, []);
  return null;
}
