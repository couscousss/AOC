import { useStore } from '@/store/useStore';
import type { View } from '@/lib/types';

const ITEMS: { id: View; label: string; icon: JSX.Element }[] = [
  { id: 'map', label: 'Camp map', icon: <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7zM9 4v13M15 7v13" /> },
  { id: 'agents', label: 'Agents', icon: <><circle cx="12" cy="8" r="3.5" /><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" /><path d="M18 4l2 2M6 4L4 6" /></> },
  { id: 'approvals', label: 'Approvals', icon: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12l3 3 5-6" /></> },
  { id: 'incidents', label: 'Incidents', icon: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 10v4M12 17v.5" /></> },
  { id: 'governance', label: 'Governance', icon: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></> },
  { id: 'health', label: 'Health', icon: <path d="M3 12h4l2-5 3 10 3-8 2 3h4" /> },
];

export function NavRail() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const selectZone = useStore((s) => s.selectZone);
  const pending = useStore((s) => s.actions.reduce((n, a) => n + (a.approvalState === 'pending' ? 1 : 0), 0));
  const navOpen = useStore((s) => s.navOpen);
  const setNavOpen = useStore((s) => s.setNavOpen);
  const feedOpen = useStore((s) => s.feedOpen);
  const setFeedOpen = useStore((s) => s.setFeedOpen);
  const setCommandOpen = useStore((s) => s.setCommandOpen);

  return (
    <nav
      className="shrink-0 border-r hairline bg-surface-raised flex flex-col py-2 overflow-hidden"
      style={{ width: navOpen ? 'var(--nav-w-open)' : 'var(--nav-w)', transition: 'width 140ms ease-out' }}
      onMouseEnter={() => setNavOpen(true)}
      onMouseLeave={() => setNavOpen(false)}
      aria-label="Primary"
    >
      {ITEMS.map((it) => {
        const active = view === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => { if (it.id === 'map') selectZone(null); setView(it.id); }}
            className={`relative flex items-center gap-3 h-11 px-[20px] text-14 whitespace-nowrap ${active ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
            aria-current={active ? 'page' : undefined}
            title={it.label}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-agent rounded-r" />}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              {it.icon}
            </svg>
            <span className={`transition-opacity ${navOpen ? 'opacity-100' : 'opacity-0'}`}>{it.label}</span>
            {it.id === 'approvals' && pending > 0 && (
              <span className="absolute left-[34px] top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-advisory text-surface-deep text-11 font-semibold flex items-center justify-center" aria-label={`${pending} pending approvals`}>
                {pending}
              </span>
            )}
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => setFeedOpen(!feedOpen)}
        className={`flex items-center gap-3 h-11 px-[20px] text-14 whitespace-nowrap ${feedOpen ? 'text-agent' : 'text-text-muted hover:text-text-primary'}`}
        title="Agent activity feed"
        aria-pressed={feedOpen}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0"><path d="M4 6h16M4 12h10M4 18h13" /></svg>
        <span className={`transition-opacity ${navOpen ? 'opacity-100' : 'opacity-0'}`}>Agent feed</span>
      </button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex items-center gap-3 h-11 px-[20px] text-14 whitespace-nowrap text-text-muted hover:text-text-primary"
        title="Command bar (⌘K)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
        <span className={`transition-opacity ${navOpen ? 'opacity-100' : 'opacity-0'}`}>Ask anything</span>
      </button>
    </nav>
  );
}
