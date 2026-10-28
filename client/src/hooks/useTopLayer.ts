import { useEffect, type RefObject } from 'react';

const LIFT_EVENT = 'top-layer:lift';

/**
 * Hộp thoại `<dialog>.showModal()` nằm ở "lớp trên cùng" của trình duyệt — `z-index` không vượt lên được,
 * nên bụi tiên khi bấm (ClickDust) và toast sẽ bị chìm dưới nó. Đưa các phần tử đó vào cùng lớp (popover thủ công),
 * và mỗi khi có hộp thoại mở thì gọi `liftTopLayer()` để chúng được xếp lại lên trên cùng.
 */
export function liftTopLayer() {
  window.dispatchEvent(new Event(LIFT_EVENT));
}

/** Hiện phần tử `popover="manual"` trong lớp trên cùng; trả hàm gỡ */
function attach(el: HTMLElement) {
  if (typeof el.showPopover !== 'function') return undefined;
  const show = () => {
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  };
  show();
  window.addEventListener(LIFT_EVENT, show);
  return () => {
    window.removeEventListener(LIFT_EVENT, show);
    if (el.matches(':popover-open')) el.hidePopover();
  };
}

/** Phần tử (qua ref) có `popover="manual"`: hiện trong lớp trên cùng, tự xếp lại khi có hộp thoại mở */
export function useTopLayer(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const el = ref.current;
    return active && el ? attach(el) : undefined;
  }, [ref, active]);
}

/** Như `useTopLayer` nhưng nhận phần tử đã lưu trong state (vd. qua callback ref) */
export function useTopLayerElement(el: HTMLElement | null) {
  useEffect(() => (el ? attach(el) : undefined), [el]);
}
