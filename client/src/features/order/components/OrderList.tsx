'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { Pager } from '@/components/ui/Pager';
import { PayNowButton } from '@/features/payment';
import { AccountPanel } from '@/features/profile';
import { formatDateTime, formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { useOrderCounts, useOrders } from '../hooks/useOrders';
import {
  canCustomerCancel,
  isAwaitingPayment,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TABS,
} from '../labels';
import type { OrderStatus, OrderSummary } from '../types';
import { CancelOrderDialog } from './CancelOrderDialog';
import styles from './OrderList.module.css';
import { OrderStatusChip } from './OrderStatusChip';

export const orderHref = (id: number) => `/tai-khoan/don-hang/${id}`;

function OrderCard({
  order,
  index,
  onCancel,
}: {
  order: OrderSummary;
  index: number;
  onCancel: () => void;
}) {
  // Đơn VNPay chưa thanh toán → nhãn + nút Thanh toán ngay (M07 mục 4.4).
  // Quá hạn: server trả PAYMENT_EXPIRED, job sẽ tự huỷ đơn trong ít phút
  const awaitingPayment = isAwaitingPayment(order);
  return (
    <li className={`panel ${styles.card}`} style={{ '--i': Math.min(index, 5) } as never}>
      <div className={styles.head}>
        <span>
          Mã đơn <strong>{order.code}</strong>
          <span className={styles.date}> · {formatDateTime(order.createdAt)}</span>
        </span>
        <span className={styles.tags}>
          {awaitingPayment && (
            <span className={styles.due}>
              {order.paymentStatus === 'FAILED' ? 'Thanh toán thất bại' : 'Chờ thanh toán'}
            </span>
          )}
          <OrderStatusChip status={order.status} variant="dark" />
        </span>
      </div>
      <Link href={orderHref(order.id)} className={styles.body}>
        <ul>
          {order.previewItems.map((item) => (
            <li key={item.bookId}>
              <span className={styles.cover}>
                <BookCover url={item.image} alt={item.title} sizes="56px" seed={item.bookId} />
              </span>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.qty}>
                {item.quantity} × {formatPrice(item.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
        {order.moreCount > 0 && <p className={styles.more}>và {order.moreCount} sản phẩm khác</p>}
      </Link>
      <div className={styles.foot}>
        <span className={styles.sum}>
          {order.itemCount} sản phẩm · Tổng tiền <strong>{formatPrice(order.total)}</strong>
        </span>
        <span className={styles.actions}>
          {canCustomerCancel(order) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              <span>Huỷ đơn</span>
            </button>
          )}
          {awaitingPayment && <PayNowButton orderId={order.id} size="small" />}
          <Link href={orderHref(order.id)} className="btn btn-ghost btn-sm">
            <span>Xem chi tiết</span>
          </Link>
        </span>
      </div>
    </li>
  );
}

/** Trang /tai-khoan/don-hang (F11) — lọc theo trạng thái (?status=), phân trang (?page=) */
export function OrderList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const status = ORDER_STATUS_TABS.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const orders = useOrders(status, page);
  const counts = useOrderCounts();
  const [cancelling, setCancelling] = useState<OrderSummary | null>(null);

  const go = (next: { status?: OrderStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const total = Object.values(counts.data ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
  const tabs: { value?: OrderStatus; label: string; count: number }[] = [
    { label: 'Tất cả', count: total },
    ...ORDER_STATUS_TABS.map((value) => ({
      value,
      label: ORDER_STATUS_LABELS[value].label,
      count: counts.data?.[value] ?? 0,
    })),
  ];

  return (
    <AccountPanel
      chapter="Đơn hàng"
      title={
        <>
          Đơn hàng <em>của tôi</em>
        </>
      }
      description="Theo dõi và quản lý các đơn hàng của bạn"
    >
      <div className={`scroll-x ${styles.filters}`} role="group" aria-label="Lọc theo trạng thái">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className="chip chip-soft"
            aria-pressed={tab.value === status}
            onClick={() => go({ status: tab.value })}
          >
            {tab.label}
            {tab.count > 0 && <span className={styles.count}> ({tab.count})</span>}
          </button>
        ))}
      </div>

      {orders.isPending ? (
        <ul className={styles.list} aria-busy="true">
          {[0, 1].map((index) => (
            <li key={index} className={`o-skel ${styles.skel}`} />
          ))}
        </ul>
      ) : orders.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(orders.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => orders.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : orders.data.items.length === 0 ? (
        <ListingEmpty
          message={status ? 'Không có đơn hàng nào ở trạng thái này' : 'Bạn chưa có đơn hàng nào'}
          action={{ href: '/', label: 'Mua sắm ngay', variant: 'gold' }}
        />
      ) : (
        <>
          <ul className={`${styles.list} ${orders.isPlaceholderData ? styles.stale : ''}`}>
            {orders.data.items.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onCancel={() => setCancelling(order)}
              />
            ))}
          </ul>
          <Pager
            page={page}
            totalPages={orders.data.meta?.totalPages ?? 1}
            onChange={(next) => go({ status, page: next })}
          />
        </>
      )}

      <CancelOrderDialog
        key={cancelling?.id ?? 'none'}
        order={cancelling}
        onClose={() => setCancelling(null)}
      />
    </AccountPanel>
  );
}
