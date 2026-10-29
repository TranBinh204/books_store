'use client';

import { useEffect, useState } from 'react';
import { BookReviews } from '@/features/review';
import styles from './BookDetail.module.css';

/** Phần tử tab ở trang sách — link "N đánh giá" dưới tên sách cuộn tới đây */
export const REVIEWS_ANCHOR = 'danh-gia';
/** Sự kiện mở tab Đánh giá (phát từ BookRatingLink) */
export const OPEN_REVIEWS_EVENT = 'bookstore:open-reviews';

type TabKey = 'description' | 'reviews';

/** Tab "Mô tả sản phẩm" · "Đánh giá" (M10) — đặt trên giấy da */
export function BookTabs({
  book,
  description,
  ratingCount,
}: {
  book: { id: number; title: string; image: string | null };
  description: string | null;
  ratingCount: number;
}) {
  const [tab, setTab] = useState<TabKey>('description');

  useEffect(() => {
    const open = () => setTab('reviews');
    window.addEventListener(OPEN_REVIEWS_EVENT, open);
    return () => window.removeEventListener(OPEN_REVIEWS_EVENT, open);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'description', label: 'Mô tả sản phẩm' },
    { key: 'reviews', label: `Đánh giá (${ratingCount})` },
  ];

  return (
    <section id={REVIEWS_ANCHOR} className={`parchment ${styles.tabs}`} data-reveal="">
      <div className="paper" aria-hidden="true" />
      <div className={`content ${styles.tabsInner}`}>
        <div className={styles.tabList} role="tablist" aria-label="Thông tin sách">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              className={styles.tab}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className={styles.panelBody}
        >
          {tab === 'description' ? (
            description ? (
              // Giữ xuống dòng như Admin nhập; React tự escape nội dung (không chèn HTML thô)
              <p className={styles.desc}>{description}</p>
            ) : (
              <p className={styles.muted}>Nội dung đang được cập nhật.</p>
            )
          ) : (
            <BookReviews book={book} />
          )}
        </div>
      </div>
    </section>
  );
}
