import type { ReactNode } from 'react';

export type AdminTagTone = 'muted' | 'ok' | 'gold' | 'warn' | 'bad' | 'info';

const TONE_CLASS: Record<AdminTagTone, string> = {
  muted: '',
  ok: 'a-tag-ok',
  gold: 'a-tag-gold',
  warn: 'a-tag-warn',
  bad: 'a-tag-bad',
  info: 'a-tag-info',
};

/** Nhãn trạng thái nhỏ của Admin (Đang bán, Hết hàng, Nhập hàng...) — màu theo ý nghĩa */
export function AdminTag({ tone = 'muted', children }: { tone?: AdminTagTone; children: ReactNode }) {
  return <span className={`a-tag ${TONE_CLASS[tone]}`}>{children}</span>;
}
