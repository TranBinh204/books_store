'use client';

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const TYPE_MS = 75;
const DELETE_MS = 35;
const HOLD_MS = 1600;
const NEXT_MS = 300;

/**
 * Placeholder tự gõ rồi xoá lần lượt các cụm (demo 07: BS.typePlaceholder).
 * Giảm chuyển động → đứng yên ở cụm đầu. Tạm dừng khi `paused` (vd. ô đang có chữ).
 */
export function useTypingPlaceholder(
  phrases: readonly string[],
  prefix = '',
  paused = false,
): string {
  const [text, setText] = useState(prefix + (phrases[0] ?? ''));

  useEffect(() => {
    if (paused || phrases.length === 0 || prefersReducedMotion()) return;
    let p = 0;
    let c = 0;
    let deleting = false;
    let timer = 0;
    const loop = () => {
      const word = phrases[p];
      c += deleting ? -1 : 1;
      setText(prefix + word.slice(0, c));
      let wait = deleting ? DELETE_MS : TYPE_MS;
      if (!deleting && c === word.length) {
        deleting = true;
        wait = HOLD_MS;
      } else if (deleting && c === 0) {
        deleting = false;
        p = (p + 1) % phrases.length;
        wait = NEXT_MS;
      }
      timer = window.setTimeout(loop, wait);
    };
    loop();
    return () => window.clearTimeout(timer);
  }, [phrases, prefix, paused]);

  return text;
}
