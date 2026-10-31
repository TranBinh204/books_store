'use client';

import { Alert, Button, Skeleton, Tooltip, useMediaQuery } from '@mui/material';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { AdminTag } from '@/components/ui/AdminTag';
import { IconBolt } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { ORDER_STATUS_LABELS, OrderStatusChip, PAYMENT_METHOD_LABELS } from '@/features/order';
import { errorMessage } from '@/lib/form';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useAdminOrder } from '../hooks/useAdminOrders';
import { ADMIN_CANCELLABLE, NEXT_ACTION, needsRefund } from '../labels';
import type { AdminOrderDetail as Order } from '../types';
import styles from './AdminOrderDetail.module.css';
import { OrderActionDialog, type OrderAction } from './OrderActionDialog';
import { PaymentAttemptTable } from './PaymentAttemptTable';
import { PaymentStatusChip } from './PaymentStatusChip';

const ORDERS_PATH = '/admin/don-hang';

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  /** Vị trí khi xếp 1 cột (`order` trong module CSS) */
  className: string;
}) {
  return (
    <section className={`a-panel ${styles.card} ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function actorOf(event: Order['history'][number]) {
  if (!event.changedBy) return 'Hệ thống';
  return event.changedBy.role === 'ADMIN' ? `Admin ${event.changedBy.fullName}` : 'Khách hàng';
}

/** Nút thao tác theo trạng thái đơn (M08 mục 4.2) */
function OrderActions({
  order,
  onAction,
}: {
  order: Order;
  onAction: (action: OrderAction) => void;
}) {
  const next = NEXT_ACTION[order.status];
  // Quy tắc 3: đơn VNPay chưa thanh toán không xác nhận được
  const waitingPayment =
    next?.status === 'CONFIRMED' &&
    order.paymentMethod === 'VNPAY' &&
    order.paymentStatus !== 'PAID';

  return (
    <>
      {ADMIN_CANCELLABLE.includes(order.status) && (
        <Button variant="outlined" color="error" onClick={() => onAction({ type: 'cancel' })}>
          Huỷ đơn
        </Button>
      )}
      {next && (
        <Tooltip
          title={
            waitingPayment && order.paymentDueAt
              ? `Chờ khách thanh toán VNPay (hạn ${formatDateTime(order.paymentDueAt)})`
              : ''
          }
        >
          <span>
            <Button
              variant="contained"
              disabled={waitingPayment}
              onClick={() => onAction({ type: 'status', to: next.status, label: next.label })}
              fullWidth
            >
              {next.label}
            </Button>
          </span>
        </Tooltip>
      )}
      {needsRefund(order) && (
        <Button variant="contained" color="error" onClick={() => onAction({ type: 'refund' })}>
          Xác nhận đã hoàn tiền
        </Button>
      )}
    </>
  );
}

/** Trang /admin/don-hang/[id] */
export function AdminOrderDetail({ id }: { id: number }) {
  const order = useAdminOrder(id);
  const [action, setAction] = useState<OrderAction | null>(null);
  // Dưới 1180px: nút thao tác dính đáy màn hình (docs/06-ui-ux/admin/09-chi-tiet-don-hang.md Q1)
  const narrow = useMediaQuery('(max-width: 1179px)');

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={300} />
      </div>
    );
  }
  if (order.isError) {
    return (
      <>
        <PageHeader title="Chi tiết đơn hàng" back={{ href: ORDERS_PATH, label: 'Đơn hàng' }} />
        <Alert severity="error">{errorMessage(order.error)}</Alert>
      </>
    );
  }

  const data = order.data;
  const actions = <OrderActions order={data} onAction={setAction} />;
  const hasActions =
    ADMIN_CANCELLABLE.includes(data.status) ||
    Boolean(NEXT_ACTION[data.status]) ||
    needsRefund(data);

  return (
    <>
      <PageHeader
        title={`Đơn hàng ${data.code}`}
        back={{ href: ORDERS_PATH, label: 'Đơn hàng' }}
        description={
          <span className={styles.meta}>
            <OrderStatusChip status={data.status} />
            <PaymentStatusChip method={data.paymentMethod} status={data.paymentStatus} />
            <span>Đặt lúc {formatDateTime(data.createdAt)}</span>
          </span>
        }
        actions={narrow ? undefined : actions}
      />

      {needsRefund(data) && (
        <Alert severity="error" className="mb-4">
          Đơn đã huỷ nhưng khách đã thanh toán {formatPrice(data.total)} — hoàn tiền trên cổng VNPay
          rồi bấm <strong>Xác nhận đã hoàn tiền</strong>.
        </Alert>
      )}
      {data.status === 'CANCELLED' && data.cancelReason && (
        <Alert severity="info" className="mb-4">
          Đã huỷ{data.cancelledAt ? ` lúc ${formatDateTime(data.cancelledAt)}` : ''} — Lý do:{' '}
          {data.cancelReason}
        </Alert>
      )}

      <div className={styles.grid}>
        <div className={styles.col}>
          <Card title="Sản phẩm" className={styles.items}>
            <ul className={styles.lines}>
              {data.items.map((item) => (
                <li key={item.bookId}>
                  <span className="a-cover">
                    <BookCover url={item.image} alt={item.title} sizes="44px" />
                  </span>
                  <div className={styles.lineInfo}>
                    <Link href={`/admin/sach/${item.bookId}`} className={styles.lineTitle}>
                      {item.title}
                    </Link>
                    <span className={styles.lineSub}>
                      {item.isFlashSale && (
                        <AdminTag tone="warn">
                          <IconBolt width={12} className="mr-1 inline" />
                          Flash Sale
                        </AdminTag>
                      )}
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                  </div>
                  <span className={styles.lineTotal}>{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className={styles.sums}>
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatPrice(data.subtotal)}</dd>
              </div>
              <div>
                <dt>Vận chuyển</dt>
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
          </Card>

          <Card title="Thanh toán" className={styles.pay}>
            <div className={styles.facts}>
              <span>
                <span>Phương thức: </span>
                {PAYMENT_METHOD_LABELS[data.paymentMethod]}
              </span>
              <span>
                <span>Trạng thái: </span>
                <PaymentStatusChip status={data.paymentStatus} />
              </span>
              {data.paidAt && (
                <span>
                  <span>Thanh toán lúc: </span>
                  {formatDateTime(data.paidAt)}
                </span>
              )}
              {data.refundedAt && (
                <span>
                  <span>Hoàn tiền lúc: </span>
                  {formatDateTime(data.refundedAt)}
                </span>
              )}
              {data.paymentDueAt && data.paymentStatus !== 'PAID' && data.status === 'PENDING' && (
                <span>
                  <span>Hạn thanh toán: </span>
                  {formatDateTime(data.paymentDueAt)}
                </span>
              )}
            </div>
            <PaymentAttemptTable payments={data.payments} />
          </Card>
        </div>

        <div className={styles.col}>
          <Card title="Khách hàng" className={styles.customer}>
            <p>
              <Link href={`/admin/khach-hang/${data.customer.id}`} className={styles.name}>
                {data.customer.fullName}
              </Link>
              {!data.customer.isActive && (
                <span className="ml-2">
                  <AdminTag tone="bad">Đã khoá</AdminTag>
                </span>
              )}
            </p>
            <p className={styles.lines2}>{data.customer.email}</p>
            {data.customer.phone && <p className={styles.lines2}>{data.customer.phone}</p>}
          </Card>

          <Card title="Giao hàng" className={styles.ship}>
            <p className="text-[15px] text-bone">
              <b>{data.recipientName}</b> · {data.recipientPhone}
            </p>
            <p className={styles.lines2}>{data.shippingAddress}</p>
            {data.note && <p className={styles.note}>Ghi chú của khách: {data.note}</p>}
          </Card>

          <Card title="Lịch sử" className={styles.history}>
            <ol className={styles.timeline}>
              {[...data.history].reverse().map((event, index) => (
                <li key={`${event.createdAt}-${index}`}>
                  <span className={`${styles.dot} ${index === 0 ? styles.dotNow : ''}`} />
                  <div className={`${styles.evt} ${index === 0 ? styles.evtNow : ''}`}>
                    {ORDER_STATUS_LABELS[event.toStatus].label}
                  </div>
                  <div className={styles.evtMeta}>
                    {formatDateTime(event.createdAt)} · {actorOf(event)}
                  </div>
                  {event.note && <div className={styles.evt}>{event.note}</div>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {narrow && hasActions && (
        <>
          <div className={styles.barSpace} />
          <div className={styles.bar}>{actions}</div>
        </>
      )}

      <OrderActionDialog
        key={action ? JSON.stringify(action) : 'closed'}
        order={data}
        action={action}
        onClose={() => setAction(null)}
      />
    </>
  );
}
