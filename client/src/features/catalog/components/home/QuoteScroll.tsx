'use client';

import { useEffect, useRef, useState } from 'react';
import { Parchment } from '@/components/shop/Parchment';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './QuoteScroll.module.css';

/** Câu trích tĩnh — lấy từ data.js của demo 07 (trang chủ mục 4.3) */
const QUOTES = [
  {
    text: 'Khi bạn khao khát một điều gì, cả vũ trụ sẽ hợp lực giúp bạn đạt được điều đó.',
    by: 'Paulo Coelho',
    book: 'Nhà Giả Kim',
  },
  {
    text: 'Người ta chỉ nhìn thấy thật rõ ràng bằng trái tim. Điều cốt yếu thì mắt thường không thấy được.',
    by: 'Antoine de Saint-Exupéry',
    book: 'Hoàng Tử Bé',
  },
  {
    text: 'Chúng ta là những gì chúng ta lặp đi lặp lại. Xuất sắc không phải một hành động, mà là một thói quen.',
    by: 'James Clear',
    book: 'Thói Quen Nguyên Tử',
  },
  {
    text: 'Ai có lý do để sống thì có thể chịu đựng được hầu hết mọi hoàn cảnh.',
    by: 'Viktor E. Frankl',
    book: 'Đi Tìm Lẽ Sống',
  },
];

const TYPE_MS = 28;
const HOLD_MS = 5000;
const START_DELAY_MS = 900;

/**
 * Trích dẫn (trang chủ khối 11): giấy da mở cuộn khi cuộn tới, câu trích gõ từng chữ
 * (28ms/ký tự) rồi hiện tác giả, 5 giây sau đổi câu. Giảm chuyển động → hiện ngay cả câu.
 */
export function QuoteScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const quote = QUOTES[index];
  // Giảm chuyển động → hiện ngay cả câu
  const shown = reduce ? quote.text.length : typed;
  const done = shown >= quote.text.length;

  // Bắt đầu gõ khi khối hiện 40% trên màn hình
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        setVisible(true);
        window.setTimeout(() => setStarted(true), START_DELAY_MS);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = done
      ? window.setTimeout(() => {
          setIndex((i) => (i + 1) % QUOTES.length);
          setTyped(0);
        }, HOLD_MS)
      : window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [started, typed, done]);

  return (
    <section className="sec">
      <div className="wrap" ref={ref}>
        <Parchment
          className={`${styles.quote} ${visible ? styles.unroll : ''}`}
          contentClassName={styles.content}
        >
          <p aria-live="off">
            “{quote.text.slice(0, shown)}
            {done ? '”' : <span className={styles.caret} aria-hidden="true" />}
          </p>
          <cite>{done ? `${quote.by} · ${quote.book}` : ''}</cite>
        </Parchment>
      </div>
    </section>
  );
}
