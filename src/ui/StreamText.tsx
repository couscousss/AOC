import { useEffect, useState } from 'react';

type Props = {
  text: string;
  /** ms per character */
  speed?: number;
  className?: string;
  onDone?: () => void;
  /** Change to restart the stream */
  streamKey?: string | number;
  instant?: boolean;
  as?: 'span' | 'p' | 'div';
};

/** Streams text in character by character. Cheap to fake, reads as live. */
export function StreamText({ text, speed = 40, className = '', onDone, streamKey, instant, as = 'span' }: Props) {
  const [n, setN] = useState(instant ? text.length : 0);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (instant || reduced) { setN(text.length); onDone?.(); return; }
    setN(0);
    let i = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      // burst a few chars at a time for long texts to keep it lively but not slow
      const burst = text.length > 400 ? 3 : text.length > 200 ? 2 : 1;
      i = Math.min(text.length, i + burst);
      setN(i);
      if (i < text.length) setTimeout(step, speed);
      else onDone?.();
    };
    const t = setTimeout(step, speed);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, streamKey, speed, instant]);

  const Tag = as;
  const done = n >= text.length;
  return (
    <Tag className={`${className} ${done ? '' : 'caret'}`} style={{ whiteSpace: 'pre-wrap' }}>
      {text.slice(0, n)}
    </Tag>
  );
}
