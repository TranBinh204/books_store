'use client';

import Image from 'next/image';
import { useState } from 'react';
import { hueFromId } from '@/lib/format';
import styles from './BookCover.module.css';

interface BookCoverProps {
  url: string | null;
  alt: string;
  /** Gợi ý bề rộng hiển thị cho trình duyệt chọn ảnh Cloudinary vừa đủ (thuộc tính `sizes`) */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** id sách → màu bìa tự vẽ (cùng sách luôn cùng màu) */
  seed?: number;
  /** Tác giả in trên bìa tự vẽ */
  author?: string;
  /** `cover` (mặc định, như demo): lấp đầy khung 2/3 · `contain`: giữ trọn ảnh (ảnh trang chi tiết) */
  fit?: 'cover' | 'contain';
}

/**
 * Ảnh bìa sách (khung cha phải `relative` + có kích thước).
 * Không có ảnh hoặc ảnh lỗi → **bìa tự vẽ** như demo 07: gradient theo màu của sách,
 * tác giả · tên sách · "BookStore" (components.md 2.12).
 */
export function BookCover({
  url,
  alt,
  sizes,
  priority,
  className = '',
  seed = 0,
  author,
  fit = 'cover',
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={`${styles.gen} ${className}`}
        style={{ '--h': hueFromId(seed) } as React.CSSProperties}
        role="img"
        aria-label={alt}
      >
        <i>{author ?? ''}</i>
        <b>{alt}</b>
        <i>BookStore</i>
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`${fit === 'contain' ? styles.contain : styles.img} ${className}`}
    />
  );
}
