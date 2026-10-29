'use client';

import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { Parchment } from '@/components/shop/Parchment';
import { ApiError } from '@/lib/http';
import { errorMessage } from '@/lib/form';
import * as newsletterApi from '../api/newsletter.api';
import styles from './OwlLetter.module.css';

/**
 * "Nhận thư cú mỗi tuần" (A7, trang chủ khối 15): giấy da + con cú bập bềnh + form email + dấu sáp.
 * Gửi xong: cú bay đi, form đổi thành lời cảm ơn. Email sai → báo dưới ô nhập.
 */
export function OwlLetter() {
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const subscribe = useMutation({
    mutationFn: newsletterApi.subscribe,
    onSuccess: () => enqueueSnackbar('Cú đã mang thư của bạn đi', { variant: 'success' }),
    onError: (error) => {
      const detail =
        error instanceof ApiError ? error.details?.find((d) => d.field === 'email') : undefined;
      if (detail) setFieldError(detail.message);
      else enqueueSnackbar(errorMessage(error), { variant: 'error' });
    },
  });
  const ok = subscribe.isSuccess;

  return (
    <section className="sec">
      <div className="wrap">
        <Parchment
          className={`${styles.paper} ${ok ? styles.ok : ''}`}
          contentClassName={styles.content}
          data-reveal=""
        >
          <svg className={styles.owl} aria-hidden="true">
            <use href="#owl" />
          </svg>
          <h2>Nhận thư cú mỗi tuần</h2>
          <p>Cú mèo sẽ mang tới hộp thư của bạn 3 cuốn sách đáng đọc và một mã giảm giá bí mật.</p>
          {ok ? (
            <p className={styles.okMsg} role="status">
              ✦ Cú đã cất cánh! Hãy chờ lá thư đầu tiên vào đêm Chủ nhật.
            </p>
          ) : (
            <>
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  setFieldError(null);
                  subscribe.mutate(email.trim());
                }}
                noValidate
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Địa chỉ thư của bạn"
                  aria-label="Email"
                  aria-invalid={fieldError ? true : undefined}
                  className="field field-parch"
                />
                <button type="submit" className="btn btn-gold" aria-busy={subscribe.isPending}>
                  <span>Gửi cú</span>
                </button>
              </form>
              {fieldError && (
                <p className={styles.error} role="alert">
                  {fieldError}
                </p>
              )}
            </>
          )}
          <div className={styles.seal} aria-hidden="true">
            B
          </div>
        </Parchment>
      </div>
    </section>
  );
}
