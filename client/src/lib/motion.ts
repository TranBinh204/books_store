/**
 * Điều kiện bật / tắt hiệu ứng — design-system mục 8.3.
 * Chỉ gọi ở client (trong useEffect / handler).
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** Máy có chuột thật (không phải màn cảm ứng) */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function hasFinePointer(): boolean {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

/** Nghiêng 3D, nút nam châm, bụi tiên khi bấm: chỉ khi có chuột và không giảm chuyển động */
export function canUsePointerFx(): boolean {
  return hasFinePointer() && !prefersReducedMotion();
}

/**
 * Phần tử đã được React nhận (hydrate) chưa. HTML server gửi trong <Suspense> có thể chèn vào trang
 * trước khi React hydrate — sửa thuộc tính lúc đó sẽ gây cảnh báo "hydration mismatch".
 * React gắn khóa `__reactFiber$…` lên mỗi phần tử nó quản lý (kể cả phần tử tạo mới ở client).
 */
export function isHydrated(el: Element): boolean {
  return Object.keys(el).some((key) => key.startsWith('__reactFiber$'));
}
