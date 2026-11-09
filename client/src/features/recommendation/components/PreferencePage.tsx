'use client';

import Link from 'next/link';
import { IconSparkle } from '@/components/ui/icons';
import { AccountPanel } from '@/features/profile';
import { errorMessage } from '@/lib/form';
import { RECOMMENDATIONS_PATH, usePreferences } from '../hooks/useRecommendation';
import { PreferenceForm } from './PreferenceForm';
import styles from './PreferenceForm.module.css';

/** Trang /tai-khoan/so-thich — sửa sở thích bất cứ lúc nào (M15) */
export function PreferencePage() {
  const preferences = usePreferences();

  return (
    <AccountPanel
      chapter="Gu đọc"
      title={
        <>
          Gu đọc <em>của bạn</em>
        </>
      }
      description="Dùng để gợi ý những cuốn sách hợp với bạn"
      actions={
        <Link href={RECOMMENDATIONS_PATH} className="btn btn-ghost">
          <span className={styles.link}>
            <IconSparkle width="18" height="18" /> Xem gợi ý
          </span>
        </Link>
      }
    >
      {preferences.isPending ? (
        <div className={`o-skel ${styles.skelPage}`} aria-busy="true" />
      ) : preferences.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(preferences.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => preferences.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : (
        // key: dữ liệu mới từ server → khởi tạo lại form
        <PreferenceForm key={JSON.stringify(preferences.data)} initial={preferences.data} />
      )}
    </AccountPanel>
  );
}
