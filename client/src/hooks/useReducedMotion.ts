'use client';

import { useSyncExternalStore } from 'react';
import { REDUCED_MOTION_QUERY } from '@/lib/motion';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Người dùng bật "giảm chuyển động" trong hệ điều hành — server luôn coi là false */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
