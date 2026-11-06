import { db } from '@/lib/db';
import type { MetadataRoute } from 'next';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const funds = await db.fund.findMany({
    where: { visibility: 'PUBLIC', allowIndex: true, active: true, group: { active: true } },
    select: { slug: true },
  });
  return [
    { url: base },
    { url: base + '/funds' },
    ...funds.map((f) => ({ url: `${base}/funds/${f.slug}` })),
  ];
}
