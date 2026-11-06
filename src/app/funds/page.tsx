import { db } from '@/lib/db';
import { statistics } from '@/lib/queries';
import { serialize } from '@/lib/client';
import { PublicHeader, PublicFooter } from '@/components/public-header';
import { FundBrowser } from '@/components/fund-browser';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Khám phá quỹ công khai' };
export default async function Funds() {
  const where = { visibility: 'PUBLIC' as const, active: true, group: { active: true } };
  const [total, funds] = await Promise.all([
    db.fund.count({ where }),
    db.fund.findMany({
      where,
      include: { group: { select: { name: true, isDemo: true } } },
      take: 9,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const items = await Promise.all(
    funds.map(async (f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      type: f.type,
      goalAmount: f.goalAmount,
      group: f.group,
      stats: f.showSummary ? await statistics(f.id) : null,
    })),
  );
  return (
    <>
      <PublicHeader />
      <main id="main" className="public-container directory-page">
        <span className="eyebrow">MỖI CỘNG ĐỒNG, MỘT HÀNH TRÌNH</span>
        <h1>Khám phá các quỹ chung.</h1>
        <p className="page-description">
          Những đóng góp nhỏ, cùng tạo nên thay đổi lớn. Theo dõi công khai, không cần đăng nhập.
        </p>
        <FundBrowser initial={serialize({ items, total })} />
      </main>
      <PublicFooter />
    </>
  );
}
