'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { useCurrentUser } from '@/features/auth';
import { CART_PATH, useCart } from '@/features/cart';
import { createVnpayPayment } from '@/features/payment';
import { useAddresses, type Address } from '@/features/profile';
import { useVoucherCheck, voucherCheckKey, VoucherInput } from '@/features/voucher';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/http';
import { uuid } from '@/lib/uuid';
import { useCreateOrder } from '../hooks/useOrders';
import type { PaymentMethod } from '../types';
import { CheckoutAddressPicker } from './CheckoutAddressPicker';
import choices from './CheckoutChoices.module.css';
import styles from './CheckoutPage.module.css';
import { CheckoutSummary } from './CheckoutSummary';
import { ChoiceCard } from './ChoiceCard';
import { PaymentMethodPicker } from './PaymentMethodPicker';

const NOTE_MAX = 500;

/** Lỗi khi tạo đơn mà khách cần quay lại giỏ hàng để xử lý */
const CART_ERRORS = new Set([
  'OUT_OF_STOCK',
  'CART_HAS_ISSUES',
  'CART_EMPTY',
  'PRICE_CHANGED',
  'FLASH_SALE_LIMIT',
]);

/** Một chương của trang: khung `.surface`, đầu chương có số */
function Section({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <section className={`surface ${styles.section}`}>
      <h2>
        <span>{no}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Chọn địa chỉ: người dùng chọn → giữ nguyên; vừa mở "Giao đến địa chỉ khác" → tự chọn địa chỉ
 * mới hơn (id lớn hơn lúc mở) khi danh sách cập nhật; mặc định → địa chỉ mặc định.
 */
type AddressSelection = { id: number } | { newerThan: number; fallbackId: number | null } | null;

function resolveAddressId(addresses: Address[], selection: AddressSelection): number | null {
  const has = (id: number | null) => id !== null && addresses.some((a) => a.id === id);
  if (selection && 'id' in selection && has(selection.id)) return selection.id;
  if (selection && 'newerThan' in selection) {
    const added = addresses.filter((a) => a.id > selection.newerThan);
    if (added.length > 0) return Math.max(...added.map((a) => a.id));
    if (has(selection.fallbackId)) return selection.fallbackId;
  }
  return addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
}

/** Trang /thanh-toan (F11) — đặt toàn bộ giỏ hàng, như checkout Haravan của azvietnam */
export function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useCurrentUser();
  const isCustomer = user?.role === 'CUSTOMER';
  const { cart, isPending: cartPending } = useCart();
  const addresses = useAddresses({ enabled: isCustomer });
  const createOrder = useCreateOrder();

  // 1 khoá chống tạo trùng cho mỗi lần mở trang (gửi lại cùng khoá → server trả đơn cũ)
  const [idempotencyKey] = useState(uuid);
  const [selection, setSelection] = useState<AddressSelection>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [note, setNote] = useState('');
  const [error, setError] = useState<{
    message: string;
    details: string[];
    backToCart: boolean;
  } | null>(null);
  /** Đã tạo đơn: 'order' → sang chi tiết đơn · 'vnpay' → đang chuyển sang VNPay */
  const [placed, setPlaced] = useState<'order' | 'vnpay' | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  /** Mã giảm giá khách đã bấm "Sử dụng" (M11) — hợp lệ hay không do useVoucherCheck */
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const voucherCheck = useVoucherCheck(voucherCode, cart.subtotal);

  const addressList = addresses.data ?? [];
  const selectedAddressId = resolveAddressId(addressList, selection);

  // Chưa đăng nhập → đăng nhập rồi về giỏ hàng (gộp giỏ ở đó) · Admin → trang chủ · giỏ trống → giỏ hàng
  useEffect(() => {
    if (userPending || placed) return;
    if (!user) router.replace(`/dang-nhap?next=${encodeURIComponent(CART_PATH)}`);
    else if (user.role !== 'CUSTOMER') router.replace('/');
    else if (!cartPending && cart.items.length === 0) router.replace(CART_PATH);
  }, [userPending, user, cartPending, cart.items.length, placed, router]);

  if (placed || userPending || !user || !isCustomer || cartPending || cart.items.length === 0) {
    return (
      <div className={styles.wait} role="status">
        <span className={styles.spin} aria-hidden="true">
          ✦
        </span>
        {placed === 'vnpay' && <p>Đang chuyển sang cổng thanh toán VNPay...</p>}
      </div>
    );
  }

  // Chỉ tính giảm khi kết quả kiểm tra khớp tạm tính hiện tại (giỏ đổi → đang kiểm tra lại)
  const voucherChecking = voucherCode !== null && voucherCheck.isFetching;
  const voucherResult =
    voucherCode !== null && !voucherChecking && voucherCheck.data?.subtotal === cart.subtotal
      ? voucherCheck.data
      : null;
  const voucherError =
    voucherCode !== null && voucherCheck.isError ? voucherCheck.error.message : null;
  const discount = voucherResult
    ? { code: voucherResult.code, amount: voucherResult.discountAmount }
    : null;
  const total = cart.subtotal - (discount?.amount ?? 0);

  const voucherSlot = (
    <VoucherInput
      code={voucherCode}
      checking={voucherChecking}
      discountAmount={discount?.amount ?? null}
      error={voucherError}
      onApply={(code) => {
        if (code === voucherCode) void voucherCheck.refetch();
        else setVoucherCode(code);
      }}
      onRemove={() => setVoucherCode(null)}
    />
  );

  const blocked = cart.hasIssues;
  const submitLabel = paymentMethod === 'VNPAY' ? 'Thanh toán qua VNPay' : 'Hoàn tất đơn hàng';
  const canSubmit =
    !blocked && selectedAddressId !== null && !createOrder.isPending && !voucherChecking;

  const submit = () => {
    if (selectedAddressId === null) return;
    setError(null);
    createOrder.mutate(
      {
        payload: {
          addressId: selectedAddressId,
          paymentMethod,
          note: note.trim() || null,
          // Mã đang báo lỗi → đặt không dùng mã
          voucherCode: discount?.code ?? null,
          expectedTotal: total,
        },
        idempotencyKey,
      },
      {
        onSuccess: (order) => {
          const orderPath = `/tai-khoan/don-hang/${order.id}`;
          if (order.paymentMethod !== 'VNPAY') {
            setPlaced('order');
            router.replace(`/thanh-toan/thanh-cong?don=${order.id}`);
            return;
          }
          // VNPay (M07): xin link thanh toán → sang cổng VNPay. Lỗi → chi tiết đơn (Thanh toán ngay)
          setPlaced('vnpay');
          createVnpayPayment(order.id)
            .then(({ paymentUrl }) => window.location.assign(paymentUrl))
            .catch(() => router.replace(orderPath));
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : '';
          if (CART_ERRORS.has(code)) void queryClient.invalidateQueries({ queryKey: ['cart'] });
          // Mã không còn dùng được (hết lượt, Admin tắt...) → kiểm tra lại để ô mã hiện lý do
          if (code.startsWith('VOUCHER_') || code === 'PRICE_CHANGED') {
            void queryClient.invalidateQueries({ queryKey: voucherCheckKey });
          }
          setError({
            message: err.message,
            details: err instanceof ApiError ? (err.details ?? []).map((d) => d.message) : [],
            backToCart: CART_ERRORS.has(code) && code !== 'PRICE_CHANGED',
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
    );
  };

  const summary = <CheckoutSummary cart={cart} voucherSlot={voucherSlot} discount={discount} />;
  const cartLink = (
    <Link href={CART_PATH} className={styles.alertLink}>
      Về giỏ hàng
    </Link>
  );

  return (
    <div className={`wrap ${styles.page}`}>
      <SectionTitle
        compact
        chapter="Thanh toán"
        title={
          <>
            Chốt <em>hành trình</em>
          </>
        }
        subtitle="Kiểm tra lại nơi nhận và cách thanh toán"
      />

      {/* Mobile: phiếu đơn hàng thu gọn ở trên */}
      <div className={styles.fold} data-open={summaryOpen}>
        <button
          type="button"
          onClick={() => setSummaryOpen((open) => !open)}
          aria-expanded={summaryOpen}
        >
          <span>{summaryOpen ? 'Ẩn' : 'Hiển thị'} thông tin đơn hàng ▾</span>
          <b>{formatPrice(total)}</b>
        </button>
        <div className={styles.foldBody}>
          <div>{summary}</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {error && (
            <div className={styles.alert} role="alert">
              <div>
                <p>{error.message}</p>
                {error.details.length > 0 && (
                  <ul>
                    {error.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
              {error.backToCart && cartLink}
            </div>
          )}
          {blocked && !error && (
            <div className={styles.alert} role="alert">
              <p>
                Giỏ hàng có sản phẩm hết hàng / ngừng kinh doanh / vượt tồn kho — vui lòng cập nhật
                giỏ hàng trước khi đặt.
              </p>
              {cartLink}
            </div>
          )}

          <Section no="01" title="Nơi nhận sách">
            <p className={styles.who}>
              {user.fullName} ({user.email})
            </p>
            {addresses.isPending ? (
              <div className={`o-skel ${choices.skel}`} />
            ) : (
              <CheckoutAddressPicker
                addresses={addressList}
                selectedId={selectedAddressId}
                onSelect={(id) => setSelection({ id })}
                onAddStart={() =>
                  setSelection({
                    newerThan: Math.max(0, ...addressList.map((a) => a.id)),
                    fallbackId: selectedAddressId,
                  })
                }
              />
            )}
          </Section>

          <Section no="02" title="Vận chuyển">
            <ChoiceCard name="shipping" checked>
              <span className={choices.row}>
                <span>
                  <span className={choices.name}>Giao hàng tiêu chuẩn toàn quốc</span>
                </span>
                <span className={choices.free}>Miễn phí</span>
              </span>
            </ChoiceCard>
          </Section>

          <Section no="03" title="Thanh toán">
            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          </Section>

          <Section no="04" title="Ghi chú đơn hàng">
            <textarea
              className={`field ${styles.note}`}
              rows={3}
              placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
              aria-label="Ghi chú đơn hàng"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
            />
            <span className={styles.count}>
              {note.length}/{NOTE_MAX}
            </span>
          </Section>

          <div className={styles.actions}>
            <Link href={CART_PATH} className="more">
              ← Quay về giỏ hàng
            </Link>
            <button
              type="button"
              className="btn btn-gold"
              onClick={submit}
              disabled={!canSubmit}
              aria-busy={createOrder.isPending}
            >
              <span>{submitLabel}</span>
            </button>
          </div>
        </div>

        {/* Desktop: phiếu đơn hàng cột phải, dính khi cuộn */}
        <aside className={styles.aside}>{summary}</aside>
      </div>

      {/* Mobile: tổng cộng + nút Hoàn tất dính đáy */}
      <div className={`buybar ${styles.barOn}`} data-show="true">
        <div className="buybar-price">
          <small>Tổng cộng</small>
          <b>{formatPrice(total)}</b>
        </div>
        <button
          type="button"
          className="btn btn-gold"
          onClick={submit}
          disabled={!canSubmit}
          aria-busy={createOrder.isPending}
        >
          <span>{submitLabel}</span>
        </button>
      </div>
    </div>
  );
}
