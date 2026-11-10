'use client';

import { useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';

// Bong bóng kéo được như nút AssistiveTouch của iPhone: kéo tự do, thả ra tự dính vào cạnh trái / phải
// gần nhất, nhớ vị trí (localStorage). Kéo khác bấm: di chuyển quá DRAG_THRESHOLD px mới tính là kéo.

export type BubbleSide = 'left' | 'right';

interface BubblePosition {
  side: BubbleSide;
  /** Vị trí dọc trong vùng được phép: 0 = trên cùng, 1 = dưới cùng */
  yRatio: number;
}

const STORAGE_KEY = 'bookstore.chat-bubble';
const DRAG_THRESHOLD = 6;
const DEFAULT_POSITION: BubblePosition = { side: 'right', yRatio: 1 };

function readPosition(): BubblePosition {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as BubblePosition | null;
    if (
      value &&
      (value.side === 'left' || value.side === 'right') &&
      typeof value.yRatio === 'number' &&
      value.yRatio >= 0 &&
      value.yRatio <= 1
    ) {
      return value;
    }
  } catch {
    // localStorage bị chặn / dữ liệu hỏng → vị trí mặc định
  }
  return DEFAULT_POSITION;
}

function savePosition(position: BubblePosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // không lưu được thì thôi — chỉ là tiện ích
  }
}

const subscribeResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};
const getViewport = () => `${window.innerWidth}x${window.innerHeight}`;
const getServerViewport = () => '0x0';

interface DragStart {
  pointerX: number;
  pointerY: number;
  left: number;
  top: number;
  moved: boolean;
}

/**
 * Chỉ dùng trong component vẽ sau khi hydrate (đọc window / localStorage ngay lần render đầu).
 * `topInset` / `bottomInset`: khoảng chừa trên (header) / dưới (thanh mua hàng mobile).
 */
export function useDraggableBubble({
  size,
  margin,
  topInset,
  bottomInset,
}: {
  size: number;
  margin: number;
  topInset: number;
  bottomInset: number;
}) {
  const [viewportWidth, viewportHeight] = useSyncExternalStore(
    subscribeResize,
    getViewport,
    getServerViewport,
  )
    .split('x')
    .map(Number);
  const [position, setPosition] = useState(readPosition);
  const [dragPoint, setDragPoint] = useState<{ left: number; top: number } | null>(null);
  const dragStart = useRef<DragStart | null>(null);
  const suppressClick = useRef(false);

  const minTop = topInset;
  const maxTop = Math.max(minTop, viewportHeight - size - bottomInset);
  const clampTop = (top: number) => Math.min(Math.max(top, minTop), maxTop);
  const clampLeft = (left: number) => Math.min(Math.max(left, 0), viewportWidth - size);

  const restingLeft = position.side === 'left' ? margin : viewportWidth - size - margin;
  const restingTop = clampTop(minTop + position.yRatio * (maxTop - minTop));
  const left = dragPoint?.left ?? restingLeft;
  const top = dragPoint?.top ?? restingTop;

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      left,
      top,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    if (!start) return;
    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    start.moved = true;
    setDragPoint({ left: clampLeft(start.left + dx), top: clampTop(start.top + dy) });
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start?.moved) return;
    // Vừa kéo xong → bỏ qua cú "click" trình duyệt bắn ra ngay sau đó
    suppressClick.current = true;
    const finalLeft = clampLeft(start.left + event.clientX - start.pointerX);
    const finalTop = clampTop(start.top + event.clientY - start.pointerY);
    const next: BubblePosition = {
      side: finalLeft + size / 2 < viewportWidth / 2 ? 'left' : 'right',
      yRatio: maxTop > minTop ? (finalTop - minTop) / (maxTop - minTop) : 1,
    };
    setPosition(next);
    savePosition(next);
    setDragPoint(null);
  };

  const onPointerCancel = () => {
    dragStart.current = null;
    setDragPoint(null);
  };

  /** Gọi trong onClick: true = cú click do vừa kéo → không mở khung chat */
  const consumeDragClick = () => {
    const wasDrag = suppressClick.current;
    suppressClick.current = false;
    return wasDrag;
  };

  return {
    side: position.side,
    dragging: dragPoint !== null,
    style: {
      left,
      top,
      width: size,
      height: size,
      transition: dragPoint ? 'none' : 'left 0.25s ease, top 0.25s ease',
    },
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    consumeDragClick,
  };
}
