import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { Dashboard } from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Không gian quản lý', robots: { index: false, follow: false } };
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { section } = await params;
  const name = section?.[0] || 'overview';
  if (
    (section?.length || 0) > 1 ||
    ![
      'overview',
      'groups',
      'funds',
      'transactions',
      'contributions',
      'members',
      'expenses',
      'approvals',
      'reconciliation',
      'reports',
      'documents',
      'activities',
      'settings',
      'audit-logs',
      'admin',
    ].includes(name)
  )
    notFound();
  return <Dashboard user={user} section={name} />;
}
