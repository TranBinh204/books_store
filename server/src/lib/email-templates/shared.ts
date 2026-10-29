// Tiện ích dùng chung cho các email template

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 118300 → "118.300₫" */
export const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`;

/** Khung email chung: tiêu đề BookStore + nội dung + nút (tuỳ chọn) */
export function emailLayout(body: string, button?: { url: string; label: string }) {
  const action = button
    ? `<p style="margin:24px 0">
    <a href="${button.url}"
       style="background:#ff8a3d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      ${escapeHtml(button.label)}
    </a>
  </p>`
    : '';
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#212121">
  <h2 style="color:#ff8a3d">BookStore</h2>
  ${body}
  ${action}
</div>`;
}
