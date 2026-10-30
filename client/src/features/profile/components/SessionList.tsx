'use client';

import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { IconDesktop, IconPhone, IconTablet } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { useRevokeOtherSessions, useRevokeSession, useSessions } from '../hooks/useProfile';
import type { ActiveSession } from '../types';
import { AccountPanel } from './AccountShell';
import styles from './SessionList.module.css';

const DEVICE_ICONS = {
  DESKTOP: IconDesktop,
  MOBILE: IconPhone,
  TABLET: IconTablet,
};

/** "Chrome trên Windows" · thiếu thông tin → rút gọn / "Thiết bị không xác định" */
export function deviceLabel({ browser, os }: Pick<ActiveSession, 'browser' | 'os'>) {
  if (browser && os) return `${browser} trên ${os}`;
  return browser ?? os ?? 'Thiết bị không xác định';
}

/** Trang /tai-khoan/thiet-bi (F08) — phiên đang đăng nhập, đăng xuất từ xa */
export function SessionList() {
  const { enqueueSnackbar } = useSnackbar();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const [confirmOthers, setConfirmOthers] = useState(false);
  const onError = (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' });

  const others = (sessions.data ?? []).filter((session) => !session.isCurrent);

  const handleRevoke = (session: ActiveSession) =>
    revoke.mutate(session.id, {
      onSuccess: () =>
        enqueueSnackbar(`Đã đăng xuất ${deviceLabel(session)}`, {
          variant: 'success',
        }),
      onError,
    });

  const handleRevokeOthers = () =>
    revokeOthers.mutate(undefined, {
      onSuccess: ({ revoked }) => {
        setConfirmOthers(false);
        enqueueSnackbar(`Đã đăng xuất ${revoked} thiết bị khác`, { variant: 'success' });
      },
      onError,
    });

  return (
    <AccountPanel
      chapter="Bảo mật"
      title={
        <>
          Thiết bị <em>đăng nhập</em>
        </>
      }
      description="Các trình duyệt / thiết bị đang đăng nhập tài khoản của bạn"
      actions={
        others.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOthers(true)}>
            <span>Đăng xuất tất cả thiết bị khác</span>
          </button>
        )
      }
    >
      {sessions.isPending ? (
        <ul className={styles.list} aria-busy="true">
          {[0, 1].map((index) => (
            <li key={index} className={`o-skel ${styles.skel}`} />
          ))}
        </ul>
      ) : sessions.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(sessions.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => sessions.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {sessions.data.map((session) => {
              const Icon = DEVICE_ICONS[session.deviceType];
              return (
                <li
                  key={session.id}
                  className={`panel ${styles.card}`}
                  data-current={session.isCurrent}
                >
                  <Icon width="36" height="36" className={styles.icon} />
                  <div className={styles.info}>
                    <strong>
                      {deviceLabel(session)}
                      {session.isCurrent && <span className={styles.badge}>Thiết bị này</span>}
                    </strong>
                    <span>
                      {session.ip ? `IP ${session.ip} · ` : ''}Hoạt động lần cuối{' '}
                      <time
                        dateTime={session.lastActiveAt}
                        title={formatDateTime(session.lastActiveAt)}
                      >
                        {formatRelativeTime(session.lastActiveAt)}
                      </time>
                    </span>
                  </div>
                  {!session.isCurrent && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRevoke(session)}
                      disabled={revoke.isPending}
                    >
                      <span>Đăng xuất</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {others.length === 0 && (
            <p className={styles.alone}>Bạn chỉ đăng nhập trên thiết bị này.</p>
          )}
          <aside className={`panel ${styles.hint}`}>
            <p>
              <strong>✦ Thấy thiết bị lạ?</strong> Hãy đăng xuất nó và đổi mật khẩu ngay.
            </p>
            <Link href="/tai-khoan/doi-mat-khau" className="more">
              Đổi mật khẩu
            </Link>
          </aside>
        </>
      )}

      <Modal
        open={confirmOthers}
        onClose={() => setConfirmOthers(false)}
        dismissible={!revokeOthers.isPending}
        size="sm"
        chapter="✦ Bảo mật"
        title={
          <>
            Đăng xuất <em>thiết bị khác</em>?
          </>
        }
      >
        <div className={styles.confirm}>
          <p>
            {others.length} thiết bị khác sẽ phải đăng nhập lại. Thiết bị này vẫn giữ đăng nhập.
          </p>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmOthers(false)}
              disabled={revokeOthers.isPending}
            >
              <span>Giữ lại</span>
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleRevokeOthers}
              disabled={revokeOthers.isPending}
              aria-busy={revokeOthers.isPending}
            >
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </Modal>
    </AccountPanel>
  );
}
