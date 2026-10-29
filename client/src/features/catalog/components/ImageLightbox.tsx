'use client';

import { Modal } from '@mui/material';
import { useState } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Keyboard } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { BookCover } from '@/components/shop/BookCover';
import { IconChevron, IconClose } from '@/components/ui/icons';
import type { PublicBookDetail } from '../types/catalog.types';

const toolbarButton =
  'flex h-11 w-11 cursor-pointer items-center justify-center text-bone-2 transition-colors hover:bg-gold/15 hover:text-gold-hi';
const arrowButton =
  'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center bg-night/60 text-bone-2 transition-colors hover:bg-night hover:text-gold-hi md:flex';

/**
 * Xem ảnh phóng to toàn màn hình (như azvietnam): nền tối, mũi tên qua lại, số thứ tự,
 * hàng ảnh nhỏ. Vuốt trên mobile · phím ← → để chuyển, Esc để đóng.
 * Mở mới mỗi lần (render khi `open`) → bắt đầu đúng ảnh `startIndex`.
 */
export function ImageLightbox({
  images,
  title,
  startIndex,
  onClose,
}: {
  images: PublicBookDetail['images'];
  title: string;
  startIndex: number;
  /** Trả về ảnh đang xem để ảnh lớn ở trang đồng bộ theo */
  onClose: (index: number) => void;
}) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [active, setActive] = useState(startIndex);
  const many = images.length > 1;

  return (
    <Modal
      open
      onClose={() => onClose(active)}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(8, 11, 10, 0.94)' } } }}
      aria-label={`Ảnh ${title}`}
    >
      <div className="fixed inset-0 flex flex-col outline-none">
        <div className="flex shrink-0 items-center justify-between pl-4 text-sm text-bone-2">
          <span>{many && `${active + 1} / ${images.length}`}</span>
          <button
            type="button"
            onClick={() => onClose(active)}
            aria-label="Đóng"
            className={toolbarButton}
          >
            <IconClose width="22" height="22" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <Swiper
            modules={[Keyboard]}
            keyboard={{ enabled: true }}
            initialSlide={startIndex}
            onSwiper={setSwiper}
            onSlideChange={(instance) => setActive(instance.activeIndex)}
            className="h-full w-full"
          >
            {images.map((image, index) => (
              <SwiperSlide key={image.id}>
                {/* Bấm vùng trống quanh ảnh → đóng */}
                <div
                  className="flex h-full w-full items-center justify-center px-2 md:px-20"
                  onClick={(event) => event.target === event.currentTarget && onClose(active)}
                >
                  <div className="relative h-full w-full max-w-5xl">
                    <BookCover
                      url={image.url}
                      alt={`${title} – ảnh ${index + 1}`}
                      sizes="(min-width: 1024px) 1024px, 100vw"
                      priority={index === startIndex}
                      fit="contain"
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {many && (
            <>
              <button
                type="button"
                onClick={() => swiper?.slidePrev()}
                disabled={active === 0}
                aria-label="Ảnh trước"
                className={`${arrowButton} left-0 disabled:cursor-default disabled:opacity-30`}
              >
                <IconChevron width="24" height="24" className="rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => swiper?.slideNext()}
                disabled={active === images.length - 1}
                aria-label="Ảnh sau"
                className={`${arrowButton} right-0 disabled:cursor-default disabled:opacity-30`}
              >
                <IconChevron width="24" height="24" className="-rotate-90" />
              </button>
            </>
          )}
        </div>

        {many && (
          <div className="flex shrink-0 justify-center gap-2 overflow-x-auto p-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => swiper?.slideTo(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === active}
                className={`relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded border-2 bg-night-2 transition-opacity ${
                  index === active
                    ? 'border-gold-hi'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <BookCover url={image.url} alt="" sizes="56px" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
