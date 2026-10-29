import type { CSSProperties, ReactNode } from 'react';
import { Silhouette } from '@/components/fx/Silhouette';
import { Icon } from '@/components/ui/Icon';
import styles from './ListingHero.module.css';

/** Icon danh mục trong đĩa sáng (bập bềnh như lá tarot) */
export function HeroIcon({ name }: { name: string | null | undefined }) {
  return (
    <div className={styles.icon}>
      <Icon name={name} />
    </div>
  );
}

/** Dòng phụ dưới tiêu đề: "N tác phẩm"… */
export function HeroMeta({ children }: { children: ReactNode }) {
  return <p className={styles.meta}>{children}</p>;
}

export function HeroDescription({ children }: { children: ReactNode }) {
  return <p className={styles.desc}>{children}</p>;
}

export function HeroHint({ children }: { children: ReactNode }) {
  return <span className={styles.hint}>{children}</span>;
}

/**
 * Đầu trang danh mục / tìm kiếm (shop/02, 03): `lead` (icon hoặc huy hiệu) bên trái,
 * nhãn phụ `.orn` + H1 tên thật + phần phụ bên phải. `hue` đổi màu nền theo danh mục / tác giả.
 */
export function ListingHero({
  hue,
  lead,
  kicker,
  title,
  children,
}: {
  hue: number;
  lead?: ReactNode;
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header
      className={`surface corners ${styles.hero}`}
      style={{ '--h': hue } as CSSProperties}
      data-reveal=""
    >
      <Silhouette shape="branch" hideOnMobile className={styles.decor} />
      {lead && <div className={styles.lead}>{lead}</div>}
      <div className={styles.text}>
        <p className={`orn ${styles.orn}`}>{kicker}</p>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </header>
  );
}
