import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Link quay lại (vd danh sách) */
  back?: { href: string; label: string };
  actions?: ReactNode;
}

/** Tiêu đề trang Admin: tiêu đề + mô tả bên trái, nút thao tác bên phải */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && (
          <Link href={back.href} className="more mb-1 inline-block text-base">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-gold-hi">
          {title}
        </h1>
        {description && <p className="mt-1 text-base text-bone-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
