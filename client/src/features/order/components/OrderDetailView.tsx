'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { CART_PATH, useAddToCart } from '@/features/cart';
import { PaymentDueBanner } from '@/features/payment';
import { AccountPanel } from '@/features/profile';
import { OrderItemReview, useHasUnreviewed } from '@/features/review';
import { formatDateTime, formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { ApiError } from '@/lib/http';
import { useOrder } from '../hooks/useOrders';
import {
  canCustomerCancel,
  isAwaitingPayment,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../labels';
import type { OrderDetail } from '../types';
import { CancelOrderDialog } from './CancelOrderDialog';
import styles from './OrderDetailView.module.css';
import { OrderProgress } from './OrderProgress';
import { OrderStatusChip } from './OrderStatusChip';

/** Nhật ký thu gọn sẵn ở màn hẹp (dữ liệu tải ở client nên không lệch khi hydrate) */
function useDefaultOpen() {
  return useState(() => typeof window === 'undefined' || window.innerWidth > 760);
}

function Timeline({ order }: { order: OrderDetail }) {
  return (
    <ol className={styles.timeline}>
      {[...order.history].reverse().map((event, index) => (
        <li key={`${event.toStatus}-${event.createdAt}`} data-latest={index === 0}>
          <strong>{ORDER_STATUS_LABELS[event.toStatus].label}</strong>
          <span>
            {formatDateTime(event.createdAt)}
            {event.note ? ` · ${event.note}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** "Mua lại": thêm lần lượt các sách của đơn vào giỏ (bỏ qua sách hết / ngừng bán) → tới giỏ hàng */
function useBuyAgain(order: OrderDetail | undefined) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const add = useAddToCart();
  const [busy, setBusy] = useState(false);

  const buyAgain = async () => {
    if (!order) return;
    setBusy(true);
    let added = 0;
    for (const item of order.items) {
      try {
        await add.mutateAsync({ bookId: item.bookId, quantity: item.quantity });
        added += 1;
      } catch (error) {
        const reason = error instanceof ApiError || error instanceof Error ? error.message : '';
        enqueueSnackbar(`"${item.title}": ${reason}`, { variant: 'warning' });
      }
    }
    setBusy(false);
    if (added > 0) {
      enqueueSnackbar(`Đã thêm ${added} sản phẩm vào giỏ hàng`, { variant: 'success' });
      router.push(CART_PATH);
    }
  };

  return { buyAgain, busy };
}

/**
 * Vừa vào trang mà đơn VNPay còn "chờ thanh toán" (VNPay đã chuyển về nhưng IPN chưa tới):
 * tải lại đơn mỗi 3 giây, tối đa 30 giây (M07 mục 4.3)
 */
const PAYMENT_POLL_MS = 3000;
const PAYMENT_POLL_WINDOW_MS = 30_000;

/** Khối ghi chú tối (đơn huỷ, hoàn tiền, nhắc đánh giá) */
function Note({ tone, children }: { tone: 'info' | 'warn' | 'gold'; children: React.ReactNode }) {
  return (
    <p className={styles.note} data-tone={tone}>
      {children}
    </p>
  );
}

/** Trang /tai-khoan/don-hang/[id] (F11) */
export function OrderDetailView({ id }: { id: number }) {
  const [historyOpen, setHistoryOpen] = useDefaultOpen();
  const [pollUntil] = useState(() => Date.now() + PAYMENT_POLL_WINDOW_MS);
  const order = useOrder(id, (current) =>
    current && isAwaitingPayment(current) && Date.now() < pollUntil ? PAYMENT_POLL_MS : false,
  );
  const [cancelling, setCancelling] = useState(false);
  const { buyAgain, busy } = useBuyAgain(order.data);
  // Đơn Đã giao: nút đánh giá từng sách + gợi ý (M10 mục 4.3)
  const delivered = order.data?.status === 'DELIVERED';
  const hasUnreviewed = useHasUnreviewed(
    id,
    order.data?.items.map((item) => item.bookId) ?? [],
    delivered,
  );

  if (order.isPending) {
    return (
      <AccountPanel chapter="Đơn hàng" title="Chi tiết đơn hàng">
        <div className={styles.skeletons} aria-busy="true">
          <div className={`o-skel ${styles.skelA}`} />
          <div className={`o-skel ${styles.skelB}`} />
        </div>
      </AccountPanel>
    );
  }
  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <AccountPanel chapter="Đơn hàng" title="Chi tiết đơn hàng">
        <p className={styles.fail} role="alert">
          {notFound ? 'Không tìm thấy đơn hàng.' : errorMessage(order.error)}
        </p>
        <div className={styles.row}>
          {!notFound && (
            <button type="button" className="btn btn-ghost" onClick={() => order.refetch()}>
              <span>Thử lại</span>
            </button>
          )}
          <Link href="/tai-khoan/don-hang" className="btn btn-ghost">
            <span>Về danh sách đơn hàng</span>
          </Link>
        </div>
      </AccountPanel>
    );
  }

  const data = order.data;

  return (
    <>
      <AccountPanel
        chapter="Đơn hàng"
        title={
          <>
            Đơn <em>{data.code}</em>
          </>
        }
        description={`Đặt lúc ${formatDateTime(data.createdAt)}`}
        actions={<OrderStatusChip status={data.status} variant="dark" />}
      >
        <Link href="/tai-khoan/don-hang" className={`more ${styles.back}`}>
          ← Về danh sách đơn
        </Link>

        <div className={styles.stack}>
          {isAwaitingPayment(data) && data.paymentDueAt && (
            <PaymentDueBanner
              orderId={data.id}
              dueAt={data.paymentDueAt}
              failed={data.paymentStatus === 'FAILED'}
            />
          )}
          {data.status === 'CANCELLED' && data.cancelReason && (
            <Note tone="info">
              Đơn đã huỷ{data.cancelledAt ? ` lúc ${formatDateTime(data.cancelledAt)}` : ''} — Lý
              do: {data.cancelReason}
            </Note>
          )}
          {data.status === 'CANCELLED' && data.paymentStatus === 'PAID' && (
            <Note tone="warn">
              Đơn đã huỷ nhưng đã được thanh toán — cửa hàng sẽ liên hệ để hoàn tiền cho bạn.
            </Note>
          )}

          <section className={styles.block} aria-label="Hành trình đơn hàng">
            <OrderProgress order={data} />
          </section>

          <div className={styles.cols}>
            <section className={styles.block}>
              <h2>Địa chỉ nhận hàng</h2>
              <p>
                <strong>{data.recipientName}</strong> · {data.recipientPhone}
              </p>
              <p>{data.shippingAddress}</p>
              {data.note && <p className={styles.muted}>Ghi chú: {data.note}</p>}
              <h2 className={styles.second}>Thanh toán</h2>
              <p>{PAYMENT_METHOD_LABELS[data.paymentMethod]}</p>
              <p className={styles.muted}>
                {PAYMENT_STATUS_LABELS[data.paymentStatus]}
                {data.paidAt ? ` lúc ${formatDateTime(data.paidAt)}` : ''}
              </p>
            </section>
            <section className={styles.block}>
              <details
                className={styles.history}
                open={historyOpen}
                onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
              >
                <summary>
                  <h2>Nhật ký đơn hàng</h2>
                </summary>
                <Timeline order={data} />
              </details>
            </section>
          </div>

          <section className={styles.block}>
            <h2>Sản phẩm</h2>
            {hasUnreviewed && (
              <Note tone="gold">
                ✦ Đơn hàng đã giao — hãy đánh giá sách để giúp người mua khác nhé!
              </Note>
            )}
            <ul className={styles.items}>
              {data.items.map((item) => (
                <li key={item.bookId}>
                  <Link href={`/sach/${item.bookId}`} className={styles.cover}>
                    <BookCover url={item.image} alt={item.title} sizes="64px" seed={item.bookId} />
                  </Link>
                  <div className={styles.info}>
                    <Link href={`/sach/${item.bookId}`} className={styles.name}>
                      {item.title}
                    </Link>
                    <span className={styles.muted}>
                      {item.isFlashSale && <span className={styles.flash}>✦ Flash Sale</span>}
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                  </div>
                  <span className={styles.line}>{formatPrice(item.lineTotal)}</span>
                  {delivered && (
                    <div className={styles.review}>
                      <OrderItemReview
                        orderId={data.id}
                        orderCode={data.code}
                        book={{ id: item.bookId, title: item.title, image: item.image }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <dl className={`panel ${styles.totals}`}>
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatPrice(data.subtotal)}</dd>
              </div>
              <div>
                <dt>Phí vận chuyển</dt>
                <dd>{data.shippingFee > 0 ? formatPrice(data.shippingFee) : 'Miễn phí'}</dd>
              </div>
              {data.discountAmount > 0 && (
                <div>
                  <dt>Giảm giá{data.voucherCode ? ` (${data.voucherCode})` : ''}</dt>
                  <dd>−{formatPrice(data.discountAmount)}</dd>
                </div>
              )}
              <div className={styles.grand}>
                <dt>Tổng cộng</dt>
                <dd>{formatPrice(data.total)}</dd>
              </div>
            </dl>
          </section>

          <div className={styles.actions}>
            <Link href="/tai-khoan/don-hang" className="btn btn-ghost">
              <span>Về danh sách đơn</span>
            </Link>
            {canCustomerCancel(data) && (
              <button type="button" className="btn btn-danger" onClick={() => setCancelling(true)}>
                <span>Huỷ đơn</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-gold"
              onClick={buyAgain}
              aria-busy={busy}
              disabled={busy}
            >
              <span>Mua lại</span>
            </button>
          </div>
        </div>
      </AccountPanel>

      <CancelOrderDialog
        key={cancelling ? 'open' : 'closed'}
        order={cancelling ? { id: data.id, code: data.code } : null}
        onClose={() => setCancelling(false)}
      />
    </>
  );
}
