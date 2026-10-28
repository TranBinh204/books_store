'use client';

import { usePauseOffscreen } from '@/hooks/usePauseOffscreen';
import { usePointerFx } from '@/hooks/usePointerFx';
import { useReveal } from '@/hooks/useReveal';
import { useScrollFx } from '@/hooks/useScrollFx';

/**
 * Gắn MỘT lần ở layout cửa hàng: mọi hiệu ứng dùng chung của demo 07 chạy qua thuộc tính data-*,
 * nên Server Component chỉ cần viết markup (data-reveal, data-stagger, data-pausable, data-tilt,
 * data-magnetic). Không sửa thuộc tính HTML trước khi hydrate xong. Không vẽ gì ra màn hình.
 */
export function MotionRoot() {
  useReveal();
  usePauseOffscreen();
  usePointerFx();
  useScrollFx();
  return null;
}
