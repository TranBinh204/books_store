'use client';

import { useState } from 'react';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { AccountPanel } from '@/features/profile';
import { errorMessage } from '@/lib/form';
import { useMarkAllRead, useNotificationList, useUnreadCount } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationList.module.css';

type Filter = 'all' | 'unread';

/** Trang /tai-khoan/thong-bao (M13 mục 4.2) */
export function NotificationList() {
  const [filter, setFilter] = useState<Filter>('all');
  const unreadOnly = filter === 'unread';
  const unread = useUnreadCount();
  const list = useNotificationList(unreadOnly);
  const markAllRead = useMarkAllRead();
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <AccountPanel
      chapter="Tin chim bồ câu"
      title={
        <>
          Thông <em>báo</em>
        </>
      }
      description="Cập nhật về đơn hàng, thanh toán và khuyến mãi dành cho bạn"
      actions={
        <button
          type="button"
          className="more"
          onClick={() => markAllRead.mutate()}
          disabled={unread === 0 || markAllRead.isPending}
        >
          Đánh dấu tất cả đã đọc
        </button>
      }
    >
      <div className={styles.filter}>
        <ChoiceChips<Filter>
          label="Lọc thông báo"
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'unread', label: `Chưa đọc${unread ? ` (${unread})` : ''}` },
          ]}
          value={filter}
          onChange={(value) => value && setFilter(value)}
          clearable={false}
        />
      </div>

      {list.isPending ? (
        <div className={styles.skeletons} aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={`o-skel ${styles.skel}`} />
          ))}
        </div>
      ) : list.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(list.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => list.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" aria-hidden="true">
            <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          <p>{unreadOnly ? 'Bạn đã đọc hết thông báo' : 'Bạn chưa có thông báo nào'}</p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationItem notification={notification} />
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <div className={styles.more}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
                aria-busy={list.isFetchingNextPage}
              >
                <span>Xem thêm</span>
              </button>
            </div>
          )}
        </>
      )}
    </AccountPanel>
  );
}
