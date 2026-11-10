'use client';

import { useMediaQuery } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { useChatUser } from '../hooks/useChat';
import { useDraggableBubble } from '../hooks/useDraggableBubble';
import { useChatWidget } from '../store/chat-widget.store';
import styles from './Chat.module.css';
import { ChatLoginPrompt } from './ChatLoginPrompt';
import { ChatPanel } from './ChatPanel';

/** Quả cầu chat 66px — demo 07 (.chat-fab) */
const BUBBLE_SIZE = 66;
const EDGE_MARGIN = 24;
/** Chừa phần header (thanh chữ + logo + ô tìm kiếm) */
const TOP_INSET = 120;
/** Trang có thanh "Thanh toán" dính đáy trên mobile / tablet (giỏ hàng, thanh toán) → đẩy bong bóng lên */
const PAGES_WITH_BOTTOM_BAR = ['/gio-hang', '/thanh-toan'];
const BOTTOM_BAR_INSET = 88;

/** Khung chat = toàn màn hình ở màn ≤ 640px (khớp Chat.module.css) */
const MOBILE_QUERY = '(max-width: 640px)';
/** Thanh mua hàng dính đáy hiện dưới mốc `lg` (1024px) */
const BELOW_LG_QUERY = '(max-width: 1023.95px)';

const subscribeNoop = () => () => {};

/**
 * Chatbox tư vấn AI "Pháp sư thủ thư" (M16, giao diện demo 07) — gắn ở layout cửa hàng.
 * Quả cầu tím kéo được (như AssistiveTouch); bấm → khách hàng: khung chat · chưa đăng nhập: mời đăng nhập.
 * Admin không thấy. Chỉ vẽ sau khi hydrate (phụ thuộc đăng nhập & localStorage — bài học M15).
 */
export function ChatWidget() {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const { isAdmin, isPending } = useChatUser();
  if (!hydrated || isPending || isAdmin) return null;
  return <ChatWidgetInner />;
}

function ChatWidgetInner() {
  const { user } = useChatUser();
  const { open, setOpen } = useChatWidget();
  const pathname = usePathname();
  const isMobile = useMediaQuery(MOBILE_QUERY, { noSsr: true });
  const belowLg = useMediaQuery(BELOW_LG_QUERY, { noSsr: true });
  const hasBottomBar = belowLg && PAGES_WITH_BOTTOM_BAR.includes(pathname);

  const bubble = useDraggableBubble({
    size: BUBBLE_SIZE,
    margin: isMobile ? 16 : EDGE_MARGIN,
    topInset: TOP_INSET,
    bottomInset: hasBottomBar ? BOTTOM_BAR_INSET : isMobile ? 16 : EDGE_MARGIN,
  });

  const close = () => setOpen(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Mở trợ lý Pháp sư thủ thư"
          title="Pháp sư thủ thư — kéo để di chuyển"
          {...bubble.handlers}
          onClick={() => {
            if (!bubble.consumeDragClick()) setOpen(true);
          }}
          style={bubble.style}
          className={`${styles.fab} ${bubble.dragging ? styles.dragging : ''}`}
          data-wand-hover
        >
          ✦
        </button>
      )}

      {open &&
        (user ? (
          <ChatPanel user={user} side={bubble.side} isMobile={isMobile} onClose={close} />
        ) : (
          <ChatLoginPrompt side={bubble.side} onClose={close} />
        ))}
    </>
  );
}
