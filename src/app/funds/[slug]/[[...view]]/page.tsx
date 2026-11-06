import { notFound } from 'next/navigation';
import { publicDetail } from '@/lib/queries';
import { visibleFund } from '@/lib/policy';
import { serialize } from '@/lib/client';
import { PublicHeader, PublicFooter } from '@/components/public-header';
import { PublicFund } from '@/components/public-fund';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string; view?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const { slug, view } = await params;
  try {
    const fund = await visibleFund(slug);
    return {
      title: fund.name,
      description: fund.description,
      alternates: { canonical: `/funds/${slug}${view?.length ? '/' + view.join('/') : ''}` },
      robots: {
        index: fund.visibility === 'PUBLIC' && fund.allowIndex,
        follow: fund.visibility === 'PUBLIC' && fund.allowIndex,
      },
      openGraph: {
        title: fund.name,
        description: fund.description,
        url: `/funds/${slug}`,
        images: ['/og-image.svg'],
      },
    };
  } catch {
    return { title: 'Không tìm thấy quỹ', robots: { index: false } };
  }
}
export default async function FundPage({ params }: Props) {
  const { slug, view } = await params;
  const section = view?.[0] || 'overview';
  if (
    (view?.length || 0) > 1 ||
    ![
      'overview',
      'transactions',
      'contributors',
      'reports',
      'activities',
      'contribute',
      'documents',
    ].includes(section)
  )
    notFound();
  let data;
  try {
    data = await publicDetail(slug);
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    throw error;
  }
  return (
    <>
      <PublicHeader />
      <PublicFund initial={serialize(data)} view={section} />
      <PublicFooter />
    </>
  );
}
