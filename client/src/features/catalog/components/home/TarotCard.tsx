'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { hueFromId } from '@/lib/format';
import { categoryHref } from '../../routes';
import type { PublicCategoryNode } from '../../types/catalog.types';
import styles from './RealmGrid.module.css';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
/** Danh mục con hiện ở mặt sau */
const BACK_CHILDREN = 2;

/**
 * Lá bài tarot danh mục (components.md 2.12): rê chuột / focus → lật.
 * Màn cảm ứng: chạm lần 1 lật, chạm lần 2 mới mở danh mục.
 */
export function TarotCard({ category, index }: { category: PublicCategoryNode; index: number }) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = (event: React.MouseEvent) => {
    if (!flipped && window.matchMedia('(hover: none)').matches) {
      event.preventDefault();
      setFlipped(true);
    }
  };

  return (
    <Link
      href={categoryHref(category.id)}
      className={styles.tarot}
      style={{ '--h': hueFromId(category.id), '--i': index } as React.CSSProperties}
      data-flipped={flipped ? '' : undefined}
      onClick={handleClick}
      onBlur={() => setFlipped(false)}
      aria-label={`${category.name} — ${category.bookCount} cuốn sách`}
    >
      <div className={styles.inner}>
        <div className={`${styles.face} ${styles.front}`}>
          <span className={styles.num}>{ROMAN[index] ?? index + 1}</span>
          <Icon name={category.iconKey} />
          <b>{category.name.replace(/^Sách /, '')}</b>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <b>{category.bookCount}</b>
          <small>
            cuốn sách
            {category.children.length > 0 && (
              <>
                <br />
                {category.children
                  .slice(0, BACK_CHILDREN)
                  .map((child) => child.name)
                  .join(' · ')}
              </>
            )}
          </small>
          <span>Bước vào →</span>
        </div>
      </div>
    </Link>
  );
}
