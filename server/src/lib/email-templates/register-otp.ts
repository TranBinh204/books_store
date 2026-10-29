import type { MailOptions } from '../mailer';
import { emailLayout, escapeHtml } from './shared';

interface RegisterOtpEmailData {
  to: string;
  fullName: string;
  otp: string;
  expiresInMinutes: number;
}

export function registerOtpEmail(data: RegisterOtpEmailData): MailOptions {
  return {
    to: data.to,
    subject: `BookStore – Mã xác minh đăng ký: ${data.otp}`,
    text: [
      `Xin chào ${data.fullName},`,
      '',
      'Mã xác minh đăng ký tài khoản BookStore của bạn là:',
      data.otp,
      '',
      `Mã hết hạn sau ${data.expiresInMinutes} phút. Không chia sẻ mã này cho bất kỳ ai.`,
      'Nếu bạn không đăng ký, hãy bỏ qua email này.',
    ].join('\n'),
    html: emailLayout(`
  <p>Xin chào <strong>${escapeHtml(data.fullName)}</strong>,</p>
  <p>Mã xác minh đăng ký tài khoản BookStore của bạn là:</p>
  <p style="margin:24px 0;font-size:32px;font-weight:bold;letter-spacing:8px;color:#ff8a3d">${data.otp}</p>
  <p>Mã hết hạn sau <strong>${data.expiresInMinutes} phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
  <p style="color:#757575;font-size:13px">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>`),
  };
}
