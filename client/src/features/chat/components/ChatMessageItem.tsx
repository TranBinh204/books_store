'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BookCardItem } from '@/features/catalog';
import styles from './Chat.module.css';
import { ChatBookCard } from './ChatBookCard';

const ORDERS_PATH = '/tai-khoan/don-hang';
const ORDERS_LABEL = /(Đơn hàng của tôi)/i;

/** Tin hiển thị trong khung: tin đã lưu (server) hoặc tin tạm ở client (câu hỏi có sẵn, gợi ý, "đang bận") */
export interface ChatItem {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  books: BookCardItem[];
  /** Lý do gợi ý theo id sách (nút "Gợi ý sách cho tôi" — M15) */
  reasons?: Record<number, string | null>;
  /** Tin của khách chưa gửi được (AI bận / lỗi) */
  failed?: boolean;
}

/** Văn bản thường; cụm "Đơn hàng của tôi" thành link tới trang đơn hàng */
function renderText(text: string, onNavigate?: () => void): ReactNode[] {
  return text.split(ORDERS_LABEL).map((part, index) =>
    index % 2 === 1 ? (
      <Link key={index} href={ORDERS_PATH} onClick={onNavigate}>
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

/** 1 tin nhắn: pháp sư (nền rêu) · khách (nền vàng) — demo 07 (.msg) */
export function ChatMessageItem({
  item,
  onRetry,
  onNavigate,
}: {
  item: ChatItem;
  onRetry?: () => void;
  onNavigate?: () => void;
}) {
  if (item.role === 'user') {
    return (
      <>
        <p className={`${styles.msg} ${styles.user} ${item.failed ? styles.failedMsg : ''}`}>
          {item.content}
        </p>
        {item.failed && (
          <span className={styles.failed}>
            Chưa gửi được
            {onRetry && (
              <button type="button" onClick={onRetry}>
                Gửi lại
              </button>
            )}
          </span>
        )}
      </>
    );
  }

  return (
    <>
      <p className={`${styles.msg} ${styles.bot}`}>{renderText(item.content, onNavigate)}</p>
      {item.books.length > 0 && (
        <ul className={styles.books}>
          {item.books.map((book) => (
            <li key={book.id}>
              <ChatBookCard book={book} reason={item.reasons?.[book.id]} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "Pháp sư đang soạn…" — 3 chấm vàng nhấp nháy (Q4: không hiện chữ chạy dần) */
export function TypingIndicator() {
  return (
    <p
      className={`${styles.msg} ${styles.bot} ${styles.typing}`}
      role="status"
      aria-label="Pháp sư đang soạn câu trả lời"
    >
      <span />
      <span />
      <span />
    </p>
  );
}
