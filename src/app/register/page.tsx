import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Tạo tài khoản', robots: { index: false } };
export default async function Register() {
  if (await currentUser()) redirect('/dashboard');
  return (
    <AuthForm
      register
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
    />
  );
}
