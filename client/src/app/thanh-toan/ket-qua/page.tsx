import type { Metadata } from 'next';
import { PaymentResult } from '@/features/payment';

export const metadata: Metadata = { title: 'Kết quả thanh toán' };

/** VNPay chuyển trình duyệt về đây kèm `vnp_...` (VNPAY_RETURN_URL) — M07 */
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return <PaymentResult query={params.toString()} />;
}
