import { env } from '../../config/env';

// Chính sách cửa hàng cho chatbox (M16 mục 6.4) — nội dung tĩnh, lấy từ quy tắc đã chốt ở M01, M06, M07.
// Dùng cho: công cụ get_store_policy của AI + câu hỏi có sẵn (trả lời ngay, không gọi AI).

export const POLICY_TOPICS = ['shipping', 'payment', 'cancel', 'return', 'account'] as const;
export type PolicyTopic = (typeof POLICY_TOPICS)[number];

export function getPolicy(topic: PolicyTopic): string {
  switch (topic) {
    case 'shipping':
      return 'BookStore miễn phí giao hàng toàn quốc cho mọi đơn hàng.';
    case 'payment':
      return env.vnpayEnabled
        ? `Bạn có thể thanh toán khi nhận hàng (COD) hoặc thanh toán online qua VNPay. Đơn VNPay cần thanh toán trong ${env.VNPAY_PAYMENT_TTL_MINUTES} phút sau khi đặt, quá hạn đơn sẽ tự huỷ.`
        : 'Hiện cửa hàng nhận thanh toán khi nhận hàng (COD).';
    case 'cancel':
      return 'Bạn tự huỷ được đơn khi đơn còn "Chờ xác nhận" và chưa thanh toán: vào Tài khoản → Đơn hàng của tôi → chọn đơn → Huỷ đơn. Đơn đã thanh toán VNPay hoặc đã được xác nhận thì bạn vui lòng liên hệ cửa hàng để được hỗ trợ.';
    case 'return':
      return 'Bạn vui lòng liên hệ cửa hàng để được hỗ trợ đổi trả.';
    case 'account':
      return 'Đăng ký tài khoản cần nhập mã xác minh (OTP) gửi về email. Quên mật khẩu: bấm "Quên mật khẩu" ở trang đăng nhập, cửa hàng sẽ gửi email đặt lại mật khẩu.';
  }
}

/** Câu hỏi có sẵn trong khung chat (Q10) — trả lời tĩnh, không tốn lượt AI */
export function getFaqs() {
  const faqs: { id: PolicyTopic; question: string }[] = [
    { id: 'shipping', question: 'Phí giao hàng?' },
    { id: 'payment', question: 'Có những cách thanh toán nào?' },
    { id: 'cancel', question: 'Huỷ đơn thế nào?' },
  ];
  return faqs.map((faq) => ({ ...faq, answer: getPolicy(faq.id) }));
}
