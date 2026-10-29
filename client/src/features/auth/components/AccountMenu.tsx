'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState, type ComponentType, type SVGProps } from 'react';
import { HoverMenu } from '@/components/ui/HoverMenu';
import {
  IconBell,
  IconDesktop,
  IconHeart,
  IconLogout,
  IconPin,
  IconPlus,
  IconReceipt,
  IconUser,
} from '@/components/ui/icons';
import { errorMessage } from '@/lib/form';
import { useCurrentUser, useLogout } from '../hooks/useAuth';
import styles from './AccountMenu.module.css';

type MenuIcon = ComponentType<SVGProps<SVGSVGElement>>;

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: MenuIcon;
  onClick: () => void;
  children: string;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <Icon />
      {children}
    </Link>
  );
}

/**
 * Nút tài khoản trên Header: rê chuột là sổ hộp thả xuống (chạm / bàn phím: bấm icon).
 * Chưa đăng nhập → Đăng nhập / Đăng ký; đã đăng nhập → thông tin + các trang tài khoản + Đăng xuất
 * (Admin có thêm Trang quản trị).
 */
export function AccountMenu({ className = '' }: { className?: string }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        enqueueSnackbar('Đã đăng xuất', { variant: 'info' });
        router.replace('/');
      },
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });
  };

  return (
    <HoverMenu
      open={open}
      onOpenChange={setOpen}
      panelClassName={styles.menu}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={className}
          disabled={isPending}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={user ? `Tài khoản: ${user.fullName}` : 'Đăng nhập / Đăng ký'}
        >
          <IconUser />
        </button>
      )}
    >
      {(close) =>
        user ? (
          <>
            <div className="menu-who">
              <b>{user.fullName}</b>
              <span>{user.email}</span>
            </div>
            <nav className="menu-list" aria-label="Tài khoản">
              <MenuLink href="/tai-khoan" icon={IconUser} onClick={close}>
                Tài khoản của tôi
              </MenuLink>
              {user.role === 'CUSTOMER' && (
                <>
                  <MenuLink href="/tai-khoan/don-hang" icon={IconReceipt} onClick={close}>
                    Đơn hàng của tôi
                  </MenuLink>
                  <MenuLink href="/tai-khoan/dia-chi" icon={IconPin} onClick={close}>
                    Sổ địa chỉ
                  </MenuLink>
                  <MenuLink href="/tai-khoan/thong-bao" icon={IconBell} onClick={close}>
                    Thông báo
                  </MenuLink>
                  <MenuLink href="/tai-khoan/yeu-thich" icon={IconHeart} onClick={close}>
                    Sách yêu thích
                  </MenuLink>
                </>
              )}
              {user.role === 'ADMIN' && (
                <MenuLink href="/admin" icon={IconDesktop} onClick={close}>
                  Trang quản trị
                </MenuLink>
              )}
              <div className="menu-sep" />
              <button type="button" onClick={handleLogout} disabled={logout.isPending}>
                <IconLogout />
                Đăng xuất
              </button>
            </nav>
          </>
        ) : (
          <nav className="menu-list" aria-label="Tài khoản">
            <MenuLink href="/dang-nhap" icon={IconUser} onClick={close}>
              Đăng nhập
            </MenuLink>
            <MenuLink href="/dang-ky" icon={IconPlus} onClick={close}>
              Đăng ký
            </MenuLink>
          </nav>
        )
      }
    </HoverMenu>
  );
}
