import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="fixed right-[calc(var(--rail-w)+12px)] top-[calc(var(--status-h)+12px)] z-40 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="panel px-3 py-2 text-12 max-w-sm pointer-events-auto shadow-xl"
            style={{ borderLeft: `3px solid ${t.kind === 'agent' ? 'var(--agent)' : t.kind === 'advisory' ? 'var(--advisory)' : t.kind === 'alarm' ? 'var(--alarm)' : 'var(--human)'}` }}
            onClick={() => dismiss(t.id)}
            role="status"
          >
            <span className={t.kind === 'agent' ? 'agent-text' : ''}>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
