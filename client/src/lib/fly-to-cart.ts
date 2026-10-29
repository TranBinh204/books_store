import { prefersReducedMotion } from './motion';

const FLY_MS = 850;
const FLY_EASING = 'cubic-bezier(.5,0,.3,1)';
/** Ảnh bìa trong thẻ: <img> hoặc bìa tự vẽ (role="img") nằm trong phần tử có data-cover */
const COVER_SELECTOR = '[data-cover] img, [data-cover] [role="img"]';

/**
 * Hiệu ứng "sách bay vào giỏ" (demo 07: BS.addToCart): nhân bản ảnh bìa trong thẻ chứa nút,
 * bay theo đường cong tới icon giỏ đang hiện ([data-cart-target]), xong thì icon giỏ lắc.
 * Trả về Promise xong khi bay xong — không bay được (giảm chuyển động, không thấy bìa / giỏ) thì xong ngay.
 */
export function flyToCart(from: Element): Promise<void> {
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find(
    (el) => el.offsetParent !== null,
  );
  const src = from.closest('[data-book]')?.querySelector<HTMLElement>(COVER_SELECTOR);
  if (!target || !src || prefersReducedMotion()) return Promise.resolve();

  const a = src.getBoundingClientRect();
  const z = target.getBoundingClientRect();
  const fly = src.cloneNode(true) as HTMLElement;
  Object.assign(fly.style, {
    position: 'fixed',
    zIndex: '9999',
    pointerEvents: 'none',
    margin: '0',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    borderRadius: '6px',
    boxShadow: '0 12px 30px rgba(0,0,0,.35)',
    objectFit: 'cover',
  });
  document.body.append(fly);

  const dx = z.left + z.width / 2 - (a.left + a.width / 2);
  const dy = z.top + z.height / 2 - (a.top + a.height / 2);

  return new Promise((resolve) => {
    fly.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        {
          transform: `translate(${dx * 0.4}px,${dy * 0.4 - 120}px) scale(.6) rotate(-12deg)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(${dx}px,${dy}px) scale(.08) rotate(20deg)`, opacity: 0.4 },
      ],
      { duration: FLY_MS, easing: FLY_EASING },
    ).onfinish = () => {
      fly.remove();
      // Chạy lại hiệu ứng lắc (gỡ class, ép trình duyệt vẽ lại, gắn lại)
      target.classList.remove('shake');
      void target.offsetWidth;
      target.classList.add('shake');
      resolve();
    };
  });
}
