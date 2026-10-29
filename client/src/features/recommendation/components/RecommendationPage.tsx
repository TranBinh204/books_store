'use client';

import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { useCurrentUser } from '@/features/auth';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { errorMessage } from '@/lib/form';
import {
  PREFERENCES_PATH,
  usePreferences,
  useRecommendations,
  useRefreshRecommendations,
} from '../hooks/useRecommendation';
import shared from './Oracle.module.css';
import { OracleOrb } from './OracleOrb';
import { RecommendationList } from './RecommendationList';
import styles from './RecommendationPage.module.css';

const HOME_ACTION = { href: '/', label: 'Về trang chủ', variant: 'gold' } as const;
/** Số tag sở thích tối đa */
const TAG_LIMIT = 6;
/** Số ô chờ khi AI đang đọc */
const SKELETON_COUNT = 8;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Trang /goi-y-sach — "Quả cầu tiên tri" (M15). Bọc RequireAuth ở page. Admin không dùng gợi ý */
export function RecommendationPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={`wrap ${styles.page}`}>
      <Breadcrumb items={[{ label: 'Gợi ý sách cho bạn' }]} />
      <SectionTitle
        compact
        chapter="Gợi ý AI"
        title={
          <>
            Quả cầu <em>tiên tri</em>
          </>
        }
        subtitle="AI chỉ chọn trong sách đang bán, dựa trên sở thích và những cuốn bạn đã mua, yêu thích, đánh giá cao"
      />
      {isAdmin ? (
        <div className={styles.empty}>
          <ListingEmpty message="Gợi ý sách dành cho tài khoản khách hàng." action={HOME_ACTION} />
        </div>
      ) : (
        <Oracle />
      )}
    </div>
  );
}

function Oracle() {
  const { enqueueSnackbar } = useSnackbar();
  const recommendations = useRecommendations();
  const refresh = useRefreshRecommendations();
  const preferences = usePreferences();
  const prefs = preferences.data;
  const hasPreferences =
    !!prefs && (prefs.categories.length > 0 || prefs.authors.length > 0 || !!prefs.note);
  const tags = prefs ? [...prefs.categories, ...prefs.authors].slice(0, TAG_LIMIT) : [];

  const ask = () =>
    refresh.mutate(undefined, {
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });

  const thinking = recommendations.isPending || refresh.isPending;
  const data = recommendations.data;
  const items = data?.items ?? [];

  let status: string;
  let done = false;
  if (thinking) status = 'Quả cầu đang đọc vận mệnh đọc sách của bạn…';
  else if (recommendations.isError)
    status = `Màn sương quá dày, quả cầu chưa thấy gì. ${errorMessage(recommendations.error)}`;
  else if (items.length === 0)
    status = 'Chưa có lời tiên tri nào hợp với bạn, hãy quay lại sau nhé.';
  else if (data?.source === 'fallback')
    status =
      'Quả cầu đang mờ sương nên chưa nói được lý do — đây vẫn là những cuốn hợp gu bạn nhất. Hỏi lại sau ít phút nhé.';
  else {
    done = true;
    const reason = items.find((item) => item.reason)?.reason;
    status = `✦ Lời tiên tri: ${reason ? reason.charAt(0).toLowerCase() + reason.slice(1) : 'những cuốn sách hợp gu của bạn'}`;
  }

  return (
    <>
      <div className={`${shared.oracle} ${styles.info}`}>
        <OracleOrb
          thinking={thinking}
          onClick={thinking ? undefined : ask}
          label="Bấm vào quả cầu để gợi ý lại"
        />
        <div>
          <p className={`${shared.status} ${done ? shared.done : ''}`} aria-live="polite">
            <i aria-hidden="true" />
            <span>{status}</span>
          </p>
          {tags.length > 0 && (
            <div className={shared.tags}>
              {tags.map((tag) => (
                <span key={`${tag.id}-${tag.name}`}>{tag.name}</span>
              ))}
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={ask}
              disabled={thinking}
              aria-busy={refresh.isPending}
            >
              Gợi ý lại
            </button>
            <Link href={PREFERENCES_PATH} className="btn btn-ghost btn-sm">
              Chỉnh sở thích
            </Link>
          </div>
          {data && !thinking && (
            <p className={styles.meta}>Cập nhật lúc {formatTime(data.generatedAt)}</p>
          )}
        </div>
      </div>

      {prefs && !hasPreferences && (
        <p className={styles.hint}>
          Bạn chưa kể sở thích đọc sách cho quả cầu.{' '}
          <Link href={PREFERENCES_PATH}>Khai báo ngay →</Link>
        </p>
      )}

      {thinking ? (
        <div className={`${styles.list} ${shared.blinking}`} aria-hidden="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className={`${shared.skel} ${styles.skeleton}`} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <RecommendationList items={items} />
      ) : (
        !recommendations.isError && (
          <div className={styles.empty}>
            <ListingEmpty
              message="Chưa có sách phù hợp để gợi ý. Cửa hàng đang cập nhật thêm sách, bạn quay lại sau nhé!"
              action={HOME_ACTION}
            />
          </div>
        )
      )}
    </>
  );
}
