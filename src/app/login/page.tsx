import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Đăng nhập', robots: { index: false } };
export default async function Login() {
  if (await currentUser()) redirect('/dashboard');
  return (
    <AuthForm
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
    />
  );
}
