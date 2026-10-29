'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { BookCard } from '@/components/shop/BookCard';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { useCurrentUser } from '@/features/auth';
import {
  RECOMMENDATIONS_PATH,
  usePreferences,
  useRecommendations,
} from '../hooks/useRecommendation';
import styles from './HomeRecommendations.module.css';
import shared from './Oracle.module.css';
import { OracleOrb } from './OracleOrb';

/** Số sách hiện ở khối trang chủ — đủ xem tại /goi-y-sach */
const HOME_LIMIT = 4;
/** Số tag sở thích tối đa */
const TAG_LIMIT = 6;

const subscribeNoop = () => () => {};

/**
 * Chương V · "Quả cầu tiên tri" (M15, trang chủ khối 8 + mục 5):
 * chưa đăng nhập → mời đăng nhập · Admin → ẩn · khách hàng → **bấm vào quả cầu** mới gọi AI
 * (tiết kiệm lượt AI, khác demo tự chạy). Đang tiên tri: quả cầu phập phồng, khung chờ nhấp nháy;
 * xong: 4 thẻ sách rơi xuống như chia bài.
 */
export function HomeRecommendations() {
  // Server & lúc hydrate → false (khớp HTML server) · sau hydrate → true
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const { data: user, isPending: userPending } = useCurrentUser();
  const [requested, setRequested] = useState(false);
  const recommendations = useRecommendations(requested);
  const preferences = usePreferences();

  if (hydrated && user?.role === 'ADMIN') return null;

  const isCustomer = hydrated && !userPending && user?.role === 'CUSTOMER';
  const isGuest = hydrated && !userPending && !user;
  const thinking = requested && recommendations.isFetching;
  const items =
    requested && recommendations.data ? recommendations.data.items.slice(0, HOME_LIMIT) : [];
  const ask = () => (requested ? recommendations.refetch() : setRequested(true));

  let status: string;
  let done = false;
  if (isGuest) status = 'Quả cầu chỉ đọc được vận mệnh của lữ khách đã xưng danh…';
  else if (!isCustomer) status = 'Quả cầu đang đọc vận mệnh đọc sách của bạn…';
  else if (thinking) status = 'Quả cầu đang đọc vận mệnh đọc sách của bạn…';
  else if (recommendations.isError)
    status = 'Màn sương quá dày, quả cầu chưa thấy gì. Bạn hỏi lại nhé.';
  else if (!requested) status = 'Chạm vào quả cầu để nghe lời tiên tri dành riêng cho bạn…';
  else if (items.length === 0)
    status = 'Chưa có lời tiên tri nào hợp với bạn, hãy quay lại sau nhé.';
  else {
    done = true;
    const reason = items.find((item) => item.reason)?.reason;
    status = `✦ Lời tiên tri: ${reason ? reason.charAt(0).toLowerCase() + reason.slice(1) : 'những cuốn sách hợp gu của bạn'}`;
  }

  const tags = preferences.data
    ? [...preferences.data.categories, ...preferences.data.authors].slice(0, TAG_LIMIT)
    : [];

  return (
    <section className="sec" id="oracle" data-pausable>
      <div className="wrap">
        <SectionTitle
          chapter="Chương V · Gợi ý AI"
          title={
            <>
              Quả cầu <em>tiên tri</em>
            </>
          }
        />
        <div className={shared.oracle}>
          <OracleOrb
            thinking={thinking}
            onClick={isCustomer && !thinking ? ask : undefined}
            label="Bấm vào quả cầu để nhận gợi ý sách"
          />
          <div>
            <p className={`${shared.status} ${done ? shared.done : ''}`} aria-live="polite">
              <i aria-hidden="true" />
              <span>{status}</span>
            </p>
            {isCustomer && tags.length > 0 && (
              <div className={shared.tags}>
                {tags.map((tag) => (
                  <span key={`${tag.id}-${tag.name}`}>{tag.name}</span>
                ))}
              </div>
            )}
            {isGuest && (
              <div className={styles.action}>
                <Link href="/dang-nhap" className="btn btn-gold btn-sm">
                  Đăng nhập để hỏi quả cầu
                </Link>
              </div>
            )}
            {isCustomer && !thinking && (!requested || recommendations.isError) && (
              <div className={styles.action}>
                <button type="button" onClick={ask} className="btn btn-ghost btn-sm">
                  Chạm vào quả cầu
                </button>
              </div>
            )}

            {items.length > 0 && !thinking ? (
              <>
                <div className={styles.grid} data-stagger="deal">
                  {items.map((item) => (
                    <BookCard key={item.book.id} book={item.book} />
                  ))}
                </div>
                <div className={styles.more}>
                  <Link href={RECOMMENDATIONS_PATH} className="more">
                    Xem thêm lời tiên tri →
                  </Link>
                </div>
              </>
            ) : (
              <div
                className={`${styles.grid} ${thinking ? shared.blinking : ''}`}
                aria-hidden="true"
              >
                {Array.from({ length: HOME_LIMIT }, (_, i) => (
                  <div key={i} className={shared.skel} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
