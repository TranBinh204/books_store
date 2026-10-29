'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { CountUp } from '@/components/fx/CountUp';
import { Fireflies } from '@/components/fx/Fireflies';
import { Silhouette } from '@/components/fx/Silhouette';
import { BookCover } from '@/components/shop/BookCover';
import { Icon } from '@/components/ui/Icon';
import { formatCompact } from '@/lib/format';
import type { BookCardItem } from '../../types/catalog.types';
import type { HomeStats } from '../../types/home.types';
import styles from './HomeHero.module.css';

/** 3 bìa chồng nhau: class vị trí + độ trễ bập bềnh (demo 07) */
const SHELF = [
  { cls: styles.b1, delay: '0s' },
  { cls: styles.b2, delay: '-2.5s' },
  { cls: styles.b3, delay: '-4.5s' },
];

/** Tách chữ thành từng ký tự (gói từng từ nowrap để không ngắt giữa từ), --i chạy tiếp giữa các dòng */
function splitChars(text: string, start: number) {
  let i = start;
  const words = text.split(' ').map((word, w) => (
    <span key={w} className={styles.word}>
      {[...word].map((ch, c) => (
        <span key={c} className={styles.ch} style={{ '--i': i++ } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  ));
  // Chèn khoảng trắng giữa các từ
  const nodes = words.flatMap((node, k) => (k === 0 ? [node] : [' ', node]));
  return { nodes, next: i };
}

const LINE_1 = 'Bước qua trang sách,';
const LINE_2 = 'lạc vào thế giới khác';

/**
 * Hero trang chủ (trang chủ mục 2 khối 1): ảnh rừng + đom đóm + trăng + sương + chữ nền "HUYỀN THOẠI",
 * tiêu đề hiện từng ký tự, 2 nút, 3 số liệu (A4), chồng 3 bìa (3 cuốn đầu "Truyền thuyết") có parallax.
 */
export function HomeHero({ stats, books }: { stats: HomeStats | null; books: BookCardItem[] }) {
  const ref = useRef<HTMLElement>(null);
  const line1 = splitChars(LINE_1, 0);
  const line2 = splitChars(LINE_2, line1.next);

  // Parallax chồng bìa theo chuột: --px / --py từ -0.5 → 0.5
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
    el.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
  };

  return (
    <section
      ref={ref}
      className={styles.hero}
      id="hero"
      onPointerMove={onPointerMove}
      data-pausable
    >
      <Fireflies className={styles.flies} />
      <div className={styles.moon} aria-hidden="true" />
      <div className={styles.bigword} aria-hidden="true">
        HUYỀN
        <br />
        THOẠI
      </div>
      <div className={styles.fog} aria-hidden="true" />
      <div className={`${styles.fog} ${styles.fog2}`} aria-hidden="true" />

      {/* cành cây khô bên trái + dơi */}
      <Silhouette shape="branch" hideOnMobile style={{ left: -40, top: 20, width: 340 }} />
      <Silhouette shape="bat" style={{ right: '18%', top: 110, width: 46 }} />
      <Silhouette
        shape="bat"
        style={{ right: '12%', top: 160, width: 30, animationDelay: '.4s' }}
      />
      <Silhouette
        shape="bat"
        hideOnMobile
        style={{ right: '24%', top: 190, width: 24, animationDelay: '.8s' }}
      />

      <div className={`wrap ${styles.inner}`}>
        <div>
          <p className={styles.kicker}>Hiệu sách của những kẻ mộng mơ</p>
          <h1 className={styles.title} aria-label={`${LINE_1} ${LINE_2}`}>
            <span className={styles.glowy} aria-hidden="true">
              {line1.nodes}
            </span>
            <span className={styles.sub} aria-hidden="true">
              {line2.nodes}
            </span>
          </h1>
          <p className={styles.lead}>
            Những vương quốc đã mất, lời nguyền cổ xưa và các sinh vật ẩn mình trong bóng tối. Chọn
            một cánh cửa, mở một trang, phần còn lại là phép màu.
          </p>
          <div className={styles.cta}>
            <a href="#realms" className="btn btn-gold" data-magnetic>
              Mở cổng thư viện
            </a>
            <a href="#oracle" className="btn btn-ghost" data-magnetic>
              <Icon name="fantasy" />
              Hỏi quả cầu tiên tri
            </a>
          </div>
          {stats && (
            <div className={styles.stats}>
              <div>
                <b>
                  <CountUp value={stats.bookCount} />
                </b>
                <small>đầu sách</small>
              </div>
              <div>
                <b>{formatCompact(stats.customerCount).toUpperCase()}</b>
                <small>độc giả</small>
              </div>
              {stats.avgRating !== null && (
                <div>
                  <b>{stats.avgRating.toFixed(1)}★</b>
                  <small>đánh giá</small>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.shelf}>
          <div className={styles.glow} aria-hidden="true" />
          {books.slice(0, SHELF.length).map((book, i) => (
            <div key={book.id} className={`${styles.bk} ${SHELF[i].cls}`}>
              <div
                className={styles.bkIn}
                style={{ '--dl': SHELF[i].delay } as React.CSSProperties}
              >
                <Link href={`/sach/${book.id}`} className={styles.bkCv}>
                  <BookCover
                    url={book.coverUrl}
                    alt={book.title}
                    sizes="256px"
                    seed={book.id}
                    author={book.authors.map((a) => a.name).join(', ')}
                    priority
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* rặng cây đen dưới đáy hero */}
      <Silhouette shape="treeline" style={{ left: 0, right: 0, bottom: -2, height: 150 }} />
      <a href="#intro" className={styles.hint}>
        Cuộn xuống
        <i />
      </a>
    </section>
  );
}
