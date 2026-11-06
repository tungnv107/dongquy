import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'Đồng Quỹ — Cùng góp quỹ, cùng tin tưởng', template: '%s | Đồng Quỹ' },
  description:
    'Quản lý quỹ nhóm minh bạch. Theo dõi từng khoản đóng góp, từng hoạt động và mọi giao dịch thu chi.',
  openGraph: { locale: 'vi_VN', type: 'website', siteName: 'Đồng Quỹ', images: ['/og-image.svg'] },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Bỏ qua điều hướng
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
