import { useEffect, useState } from 'react';
import { SEARCH_PLACEHOLDERS } from '../constants/searchPlaceholders';

/**
 * Cycles placeholder copy with a short typewriter. Pauses when the field is focused or has text.
 */
export function useRotatingSearchPlaceholder(paused, phrases = SEARCH_PLACEHOLDERS) {
  const [text, setText] = useState(phrases[0] || '');

  useEffect(() => {
    if (paused || !phrases.length) return undefined;
    let phraseIndex = 0;
    let charIndex = 0;
    let timer;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const phrase = phrases[phraseIndex % phrases.length];
      if (charIndex <= phrase.length) {
        setText(phrase.slice(0, Math.max(1, charIndex)));
        charIndex += 1;
        timer = setTimeout(tick, 42);
        return;
      }
      timer = setTimeout(() => {
        phraseIndex += 1;
        charIndex = 0;
        tick();
      }, 1600);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paused, phrases]);

  return paused ? '' : text;
}
