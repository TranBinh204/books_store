import type { SVGProps } from 'react';

/**
 * Icon giao diện nét mảnh của demo 07 (viewBox 24, stroke theo currentColor) — design-system mục 7.
 * Thay cho @mui/icons-material ở phần cửa hàng.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  'aria-hidden': true,
  focusable: false,
} as const;

export const IconMenu = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconHeart = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </svg>
);

export const IconUser = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);

export const IconBag = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 9h12l-1 11H7Z" />
    <path d="M9 9a3 3 0 0 1 6 0" />
    <path d="M4 9h16" />
  </svg>
);

/** Thêm vào giỏ (nút thoi trên thẻ sách) */
export const IconBagAdd = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M6 9h12l-1 11H7Z" />
    <path d="M9 9a3 3 0 0 1 6 0" />
  </svg>
);

/** Chuông thông báo — demo không có, vẽ cùng kiểu nét */
export const IconBell = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const IconSend = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...p}>
    <path d="M3 20 21 12 3 4v6l12 2-12 2z" />
  </svg>
);

/** Logo: cuốn sách mở + ngôi sao */
export const IconLogoBook = (p: IconProps) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden
    focusable={false}
    {...p}
  >
    <path d="M4 7c5-2 9-1 12 2 3-3 7-4 12-2v18c-5-2-9-1-12 2-3-3-7-4-12-2Z" />
    <path d="M16 9v18" />
    <path d="M16 3l1 2.5L19.5 6 17 7l-1 2.5L15 7l-2.5-1L15 5.5Z" fill="currentColor" />
  </svg>
);

/* ---- Menu tài khoản & thao tác (cùng kiểu nét mảnh) ---- */
export const IconReceipt = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const IconPin = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export const IconLock = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconDevices = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="14" height="10" rx="1.5" />
    <path d="M8 19h4M10 15v4" />
    <rect x="17" y="9" width="4" height="9" rx="1" />
  </svg>
);

export const IconSparkle = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
    <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
  </svg>
);

export const IconLogout = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M10 4H5v16h5" />
    <path d="M15 8l4 4-4 4M19 12H9" />
  </svg>
);

export const IconEdit = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20l1-4 11-11 3 3L8 19Z" />
    <path d="M14 7l3 3" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevron = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* ---- Biểu tượng thông báo, thiết bị, đánh giá ---- */
export const IconCard = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </svg>
);

export const IconAlert = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4 2.5 20h19Z" />
    <path d="M12 10v4M12 17.2v.3" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconTruck = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const IconCancel = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
  </svg>
);

export const IconBolt = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M13 3 5 14h6l-1 7 8-11h-6Z" />
  </svg>
);

export const IconDesktop = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const IconPhone = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18.5h2" />
  </svg>
);

export const IconTablet = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M11 18h2" />
  </svg>
);

/** Ngôi sao đánh giá: `fill="currentColor"` để tô đặc */
export const IconStar = (p: IconProps) => (
  <svg {...base} strokeLinejoin="round" {...p}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8Z" />
  </svg>
);

/* ---------- Icon menu quản trị (cùng kiểu nét) ---------- */

export const IconDashboard = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 4h6.5v7H4ZM13.5 4H20v4h-6.5ZM4 14h6.5v6H4ZM13.5 11H20v9h-6.5Z" />
  </svg>
);

export const IconBook = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 6C9.5 4.5 6.5 4.3 4 5v13c2.5-.7 5.5-.5 8 1 2.5-1.5 5.5-1.7 8-1V5c-2.5-.7-5.5-.5-8 1ZM12 6v13" />
  </svg>
);

export const IconCategory = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5h7v7H4ZM13 12h7v7h-7Z" />
    <circle cx="16.5" cy="8.5" r="3.5" />
  </svg>
);

/** Nhà xuất bản: toà nhà */
export const IconBuilding = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 20V5l8-2v17M13 9h6v11M3 20h18M8 8h2M8 12h2M8 16h2M15.5 13h.01M15.5 17h.01" />
  </svg>
);

export const IconInventory = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16ZM3.5 8 12 12.5 20.5 8M12 12.5v8" />
  </svg>
);

export const IconUsers = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1-3.6 3.5-5.5 6.5-5.5s5.5 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.6.7 2.7 2.2 3.5 5.2" />
  </svg>
);

export const IconReview = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5h16v11H9l-5 4Z" />
    <path d="M8 9h8M8 12.5h5" />
  </svg>
);

export const IconVoucher = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3Z" />
    <path d="M14 6v12" strokeDasharray="2 2.4" />
  </svg>
);


export const IconStore = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 9.5ZM5.5 12v8h13v-8M10 20v-5h4v5" />
  </svg>
);

/** Thu gọn / mở rộng thanh bên (mũi tên đôi, xoay bằng CSS) */
export const IconCollapse = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m11 7-5 5 5 5M18 7l-5 5 5 5" />
  </svg>
);

export const IconRefresh = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
  </svg>
);

export const IconDownload = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </svg>
);

export const IconChevronRight = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconEye = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconImage = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m4 18 5-5 4 4 3-3 4 4" />
  </svg>
);

export const IconTune = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const IconAddPhoto = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8" />
    <path d="m4 18 5-5 4 4 2-2M18 3v6M15 6h6" />
  </svg>
);

export const IconFilter = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5h16l-6 8v6l-4-2v-4Z" />
  </svg>
);

export const IconExternal = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
