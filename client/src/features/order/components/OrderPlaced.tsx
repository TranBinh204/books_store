'use client';

import Link from 'next/link';
import { ResultActions, ResultCard, ResultMsg, ResultTicket } from '@/features/payment';
import { formatPrice } from '@/lib/format';
import { useOrder } from '../hooks/useOrders';
import { PAYMENT_METHOD_LABELS } from '../labels';

/**
 * Trang /thanh-toan/thanh-cong?don=ID — đặt hàng xong (COD). Dùng khung kết quả của màn 09
 * để luồng mua hàng giữ nguyên một giao diện; chi tiết đơn nằm ở khu Tài khoản.
 */
export function OrderPlaced({ id }: { id: number }) {
  const order = useOrder(id);
  const data = order.data;

  if (order.isPending) {
    return (
      <ResultCard tone="wait" chapter="Đặt hàng" title="Đang tải đơn hàng...">
        <ResultMsg>Vui lòng chờ trong giây lát.</ResultMsg>
      </ResultCard>
    );
  }

  if (!data) {
    return (
      <ResultCard
        tone="unknown"
        chapter="Đặt hàng"
        title={
          <>
            Không tìm thấy <em>đơn hàng</em>
          </>
        }
      >
        <ResultMsg>Bạn có thể xem đơn của mình trong mục Đơn hàng của tôi.</ResultMsg>
        <ResultActions>
          <Link href="/tai-khoan/don-hang" className="btn btn-gold">
            <span>Đơn hàng của tôi</span>
          </Link>
        </ResultActions>
      </ResultCard>
    );
  }

  return (
    <ResultCard
      tone="ok"
      chapter="Đặt hàng"
      title={
        <>
          Đặt hàng <em>thành công</em>
        </>
      }
    >
      <ResultMsg>
        {data.paymentMethod === 'COD'
          ? 'Cảm ơn bạn! Chúng tôi sẽ liên hệ xác nhận đơn sớm. Email xác nhận đã được gửi tới bạn.'
          : data.paymentStatus === 'PAID'
            ? 'Đã thanh toán qua VNPay. Chúng tôi sẽ xác nhận đơn sớm, email xác nhận đã được gửi tới bạn.'
            : 'Đơn hàng đã được ghi nhận, đang chờ thanh toán.'}
      </ResultMsg>
      <ResultTicket
        rows={[
          { label: 'Mã đơn hàng', value: data.code },
          { label: 'Thanh toán', value: PAYMENT_METHOD_LABELS[data.paymentMethod] },
          { label: 'Giao đến', value: `${data.recipientName} · ${data.recipientPhone}` },
          { label: 'Tổng tiền', value: formatPrice(data.total), strong: true },
        ]}
      />
      <ResultActions>
        <Link href={`/tai-khoan/don-hang/${data.id}`} className="btn btn-gold">
          <span>Xem chi tiết đơn</span>
        </Link>
        <Link href="/" className="btn btn-ghost">
          <span>Tiếp tục mua sắm</span>
        </Link>
      </ResultActions>
    </ResultCard>
  );
}
