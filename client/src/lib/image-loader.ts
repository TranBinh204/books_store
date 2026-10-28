'use client';

import type { ImageLoaderProps } from 'next/image';
import { imageUrl } from './image';

/**
 * Loader cho mọi <Image> của next/image (khai báo ở next.config.ts → images.loaderFile).
 * Không dùng bộ tối ưu ảnh của Next.js: Cloudinary tự thu nhỏ theo `width` mà trình duyệt cần;
 * ảnh local / ảnh tĩnh trong public/ trả nguyên URL (thêm ?w= để mỗi kích thước một URL).
 */
export default function bookImageLoader({ src, width, quality }: ImageLoaderProps) {
  const resized = imageUrl(src, width, quality ?? 'auto');
  if (resized !== src) return resized;
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}
