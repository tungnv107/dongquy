import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { Invite } from '@/components/invite';
export const metadata = { title: 'Lời mời tham gia nhóm', robots: { index: false } };
export default async function Invitation({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await currentUser();
  return (
    <main id="main" className="center-page">
      <h1>Cùng tham gia một hành trình.</h1>
      <p>Đăng nhập bằng đúng email nhận lời mời, sau đó chấp nhận để vào nhóm.</p>
      {user && token ? (
        <Invite token={token} />
      ) : (
        <>
          <Link className="btn btn-primary" href="/login">
            Đăng nhập
          </Link>
          <Link href="/register">Tạo tài khoản mới</Link>
          <p className="small muted">Sau khi đăng nhập, mở lại liên kết lời mời này.</p>
        </>
      )}
    </main>
  );
}
