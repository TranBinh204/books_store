import type { MailOptions } from '../mailer';
import { escapeHtml } from './shared';

interface ResetPasswordEmailData {
  to: string;
  fullName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function resetPasswordEmail(data: ResetPasswordEmailData): MailOptions {
  const name = escapeHtml(data.fullName);

  return {
    to: data.to,
    subject: 'BookStore – Đặt lại mật khẩu',
    text: [
      `Xin chào ${data.fullName},`,
      '',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản BookStore của bạn.',
      `Mở đường dẫn sau để đặt mật khẩu mới (hết hạn sau ${data.expiresInMinutes} phút):`,
      data.resetUrl,
      '',
      'Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.',
    ].join('\n'),
    html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#212121">
  <h2 style="color:#1565c0">BookStore</h2>
  <p>Xin chào <strong>${name}</strong>,</p>
  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản BookStore của bạn.</p>
  <p style="margin:24px 0">
    <a href="${data.resetUrl}"
       style="background:#1565c0;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      Đặt lại mật khẩu
    </a>
  </p>
  <p>Đường dẫn hết hạn sau <strong>${data.expiresInMinutes} phút</strong> và chỉ dùng được một lần.</p>
  <p style="color:#757575;font-size:13px">
    Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
  </p>
</div>`,
  };
}
