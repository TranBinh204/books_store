'use client';

import { useState, type ReactNode } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { BookCover } from '@/components/shop/BookCover';
import type { PublicBookDetail } from '../types/catalog.types';
import styles from './BookDetail.module.css';
import { ImageLightbox } from './ImageLightbox';

/** Ảnh lớn ~460px trên desktop, cả màn hình trên mobile */
const MAIN_SIZES = '(min-width: 1181px) 460px, 100vw';

/**
 * Bộ ảnh trang chi tiết: ảnh lớn (vuốt được trên mobile) + hàng ảnh nhỏ bên dưới,
 * bấm ảnh nhỏ để đổi ảnh lớn. Rê chuột vào ảnh lớn → nút kính lúp; bấm ảnh / nút → xem phóng to.
 * `seal`: tem tròn góc ảnh (-x% / Mới / Đã hết).
 */
export function BookGallery({
  images,
  title,
  seal,
}: {
  images: PublicBookDetail['images'];
  title: string;
  seal?: ReactNode;
}) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className={styles.gallery}>
        <div className={`${styles.stage} aspect-square`}>
          <BookCover url={null} alt={title} sizes={MAIN_SIZES} />
          {seal}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <Swiper
          modules={[Pagination]}
          pagination={images.length > 1 ? { clickable: true } : false}
          onSwiper={setSwiper}
          onSlideChange={(instance) => setActive(instance.activeIndex)}
          className={styles.slides}
        >
          {images.map((image, index) => (
            <SwiperSlide key={image.id}>
              <div className={styles.slide} onClick={() => setLightboxOpen(true)}>
                <BookCover
                  url={image.url}
                  alt={`${title} – ảnh ${index + 1}`}
                  sizes={MAIN_SIZES}
                  priority={index === 0}
                  fit="contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {seal}
        {/* Kính lúp giữa ảnh — hiện khi rê chuột (desktop); mobile chạm vào ảnh để xem to */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Xem ảnh phóng to"
          className={`ic ${styles.zoom}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" />
          </svg>
        </button>
      </div>

      {images.length > 1 && (
        <div className={`scroll-x ${styles.thumbs}`}>
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => swiper?.slideTo(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={index === active}
              className={styles.thumb}
            >
              <BookCover url={image.url} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          title={title}
          startIndex={active}
          onClose={(index) => {
            setLightboxOpen(false);
            swiper?.slideTo(index, 0);
          }}
        />
      )}
    </div>
  );
}
