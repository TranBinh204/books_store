import type { Metadata } from 'next';
import { Cormorant_Garamond, Grenze_Gotisch, Judson } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { SvgDefs } from '@/components/fx/SvgDefs';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

// Font Dark Fantasy (docs/06-ui-ux/design-system.md mục 3) — đều có dấu tiếng Việt
const display = Grenze_Gotisch({
  variable: '--nf-display',
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '700', '900'],
  display: 'swap',
});
const heading = Cormorant_Garamond({
  variable: '--nf-heading',
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const body = Judson({
  variable: '--nf-body',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  // Gốc cho các URL tương đối trong metadata (Open Graph...) — đặt ở NEXT_PUBLIC_SITE_URL
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'BookStore – Nhà sách trực tuyến',
    template: '%s | BookStore',
  },
  description: 'Mua sách trực tuyến, giao hàng miễn phí toàn quốc.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      className={`${display.variable} ${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Bộ lọc giấy rách + icon dùng lại cho cả cửa hàng và Admin */}
        <SvgDefs />
        {/* enableCssLayer: đặt style MUI vào @layer mui để class Tailwind ghi đè được */}
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
