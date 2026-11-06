'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Logo, ThemeButton } from './ui';
export function PublicHeader() {
  const pathname = usePathname();
  return (
    <header className="public-header">
      <div className="public-container header-inner">
        <Logo />
        <nav aria-label="Điều hướng chính">
          <Link
            className={pathname === '/funds' || pathname.startsWith('/funds/') ? 'active' : ''}
            href="/funds"
          >
            Khám phá quỹ
          </Link>
          <Link href="/#how-it-works">Cách hoạt động</Link>
          <Link href="/#transparency">Vì sao Đồng Quỹ?</Link>
        </nav>
        <div className="header-actions">
          <ThemeButton />
          <Link className="btn btn-secondary" href="/login">
            Đăng nhập <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container">
        <Logo small />
        <p>Cùng góp quỹ. Cùng vun đắp niềm tin.</p>
        <span>
          <ShieldCheck size={16} /> Minh bạch từ từng khoản nhỏ
        </span>
      </div>
    </footer>
  );
}
