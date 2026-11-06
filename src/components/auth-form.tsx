'use client';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  BookOpenCheck,
  Users,
} from 'lucide-react';
import { api } from '@/lib/client';
import { Logo, ErrorBox, ThemeButton } from './ui';
export function AuthForm({
  register = false,
  googleEnabled = false,
}: {
  register?: boolean;
  googleEnabled?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <main id="main" className="auth-page">
      <section className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">CÙNG NHAU TẠO NÊN GIÁ TRỊ</span>
          <h1>
            Một quỹ chung.
            <br />
            Nhiều điều
            <br />
            <em>tốt đẹp.</em>
          </h1>
          <p>
            Chăm chút từng khoản đóng góp.
            <br />
            Vun đắp sự tin tưởng trong cộng đồng.
          </p>
          <div className="auth-features">
            <span>
              <BookOpenCheck size={20} /> Thu chi rõ ràng, có kiểm chứng
            </span>
            <span>
              <Users size={20} /> Quản lý nhiều nhóm và quỹ
            </span>
            <span>
              <ShieldCheck size={20} /> Minh bạch và tôn trọng riêng tư
            </span>
          </div>
        </div>
        <small>Đồng Quỹ · Minh bạch từ từng khoản nhỏ.</small>
      </section>
      <section className="auth-main">
        <div className="auth-top">
          <Link href="/">← Về trang chủ</Link>
          <ThemeButton />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">CHÀO MỪNG ĐẾN VỚI ĐỒNG QUỸ</span>
          <h2>{register ? 'Bắt đầu hành trình chung.' : 'Rất vui được gặp lại bạn.'}</h2>
          <p>
            {register
              ? 'Tạo tài khoản để quản lý nhóm và những mục tiêu chung.'
              : 'Đăng nhập để tiếp tục chăm chút cho quỹ của bạn.'}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setPending(true);
              const form = new FormData(e.currentTarget);
              try {
                await api(`/api/auth/${register ? 'register' : 'login'}`, {
                  method: 'POST',
                  body: JSON.stringify(Object.fromEntries(form)),
                });
                // Authentication changes HttpOnly cookies; start a fresh document without stale RSC cache.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign('/dashboard');
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            {register && (
              <label className="field">
                <span>Họ và tên</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Nguyễn Minh Anh"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="field">
              <span>Địa chỉ email</span>
              <input
                type="email"
                name="email"
                required
                placeholder="ban@example.com"
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span>Mật khẩu</span>
              <div className="password-input">
                <input
                  name="password"
                  type={show ? 'text' : 'password'}
                  required
                  minLength={register ? 12 : 1}
                  maxLength={128}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'Tối thiểu 12 ký tự' : 'Nhập mật khẩu của bạn'}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              disabled={pending || !ready}
              className="btn btn-primary btn-large auth-submit"
            >
              {pending ? <LoaderCircle size={18} className="spin" /> : null}
              {register ? 'Tạo tài khoản' : 'Đăng nhập'}
              <ArrowRight size={18} />
            </button>
          </form>
          {googleEnabled && (
            <>
              <div className="auth-divider">hoặc tiếp tục với</div>
              <Link
                prefetch={false}
                className="btn btn-secondary auth-submit"
                href="/api/auth/google"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6zM12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.6c-.9.6-2.1.9-3.5.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22zM6.3 13.7a6 6 0 0 1 0-3.4V7.7H3a10 10 0 0 0 0 8.6l3.3-2.6zM12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.7l3.3 2.6A6 6 0 0 1 12 6.1z"
                  />
                </svg>
                Google
              </Link>
            </>
          )}
          <p className="auth-switch">
            {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Link>
          </p>
          <div className="auth-public-note">
            <ShieldCheck size={18} />
            <p>
              Chỉ muốn xem tình hình quỹ?
              <br />
              <Link href="/funds">Khám phá quỹ công khai không cần đăng nhập →</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
