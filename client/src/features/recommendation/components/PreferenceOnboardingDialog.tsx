'use client';

import { usePathname } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { Modal } from '@/components/ui/Modal';
import { errorMessage } from '@/lib/form';
import { PREFERENCES_PATH, usePreferences, useSkipPreferences } from '../hooks/useRecommendation';
import { PreferenceForm } from './PreferenceForm';
import styles from './PreferenceForm.module.css';

/**
 * Hộp thoại "Bạn thích đọc gì?" — tự hiện với khách hàng CHƯA từng lưu / bỏ qua sở thích
 * (lần đăng nhập đầu). Lưu hoặc Bỏ qua → không hỏi lại; sửa sau ở /tai-khoan/so-thich.
 */
export function PreferenceOnboardingDialog() {
  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();
  const preferences = usePreferences();
  const skip = useSkipPreferences();

  // Đang ở trang Sở thích thì không cần hộp thoại
  const data = preferences.data;
  if (!data || data.onboarded || pathname.startsWith(PREFERENCES_PATH)) return null;

  const handleSkip = () =>
    skip.mutate(undefined, {
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });

  return (
    <Modal
      open
      onClose={handleSkip}
      dismissible={!skip.isPending}
      chapter="✦ Chào mừng"
      title={
        <>
          Bạn thích <em>đọc gì</em>?
        </>
      }
    >
      <p className={styles.intro}>
        Cho chúng tôi biết gu đọc của bạn để AI gợi ý những cuốn sách phù hợp. Bạn có thể sửa lại
        bất cứ lúc nào trong mục Tài khoản → Sở thích đọc sách.
      </p>
      <PreferenceForm
        initial={data}
        submitLabel="Lưu & nhận gợi ý"
        alwaysEnabled
        secondaryAction={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleSkip}
            disabled={skip.isPending}
            aria-busy={skip.isPending}
          >
            <span>Bỏ qua</span>
          </button>
        }
      />
    </Modal>
  );
}
