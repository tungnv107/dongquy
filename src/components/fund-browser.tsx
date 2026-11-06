'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowUpRight,
  HeartHandshake,
  Users,
  Leaf,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, type Stats } from '@/lib/client';
import { vnd } from '@/lib/money';
import { Badge, Empty, ErrorBox, Loading, SearchBox } from './ui';
export interface FundCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  goalAmount: string;
  group: { name: string; isDemo: boolean };
  stats: Stats | null;
}
export function FundCard({ fund, index = 0 }: { fund: FundCardData; index?: number }) {
  const Icon =
    fund.type === 'CHARITY'
      ? HeartHandshake
      : fund.type === 'ANNUAL'
        ? GraduationCap
        : fund.type === 'EVENT'
          ? Leaf
          : Users;
  return (
    <Link href={`/funds/${fund.slug}`} className={`fund-card fund-theme-${index % 3}`}>
      <div className="fund-card-top">
        <span className="fund-card-icon">
          <Icon size={29} />
        </span>
        <Badge tone="green">
          <span className="live-dot" /> Công khai
        </Badge>
      </div>
      <div className="fund-card-body">
        <small>{fund.group.name}</small>
        <h3>{fund.name}</h3>
        <p>{fund.description}</p>
      </div>
      <div className="fund-card-stats">
        <span>
          Số dư hiện tại<strong>{fund.stats ? vnd(fund.stats.closing) : 'Không công khai'}</strong>
        </span>
        <span className="fund-card-arrow">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="fund-card-bottom">
        <ShieldCheck size={14} />
        {fund.group.isDemo
          ? 'Dữ liệu minh họa · môi trường phát triển'
          : 'Số liệu từ giao dịch đã ghi sổ'}
      </div>
    </Link>
  );
}
export function FundBrowser({ initial }: { initial: { items: FundCardData[]; total: number } }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['public-funds', q, page],
    queryFn: () =>
      api<{ items: FundCardData[]; total: number }>(
        `/api/public/funds?q=${encodeURIComponent(q)}&page=${page}&pageSize=9`,
      ),
    initialData: !q && page === 1 ? initial : undefined,
  });
  return (
    <>
      <div className="directory-toolbar">
        <div>
          <strong>{query.data?.total ?? 0} quỹ công khai</strong>
          <span> · Những cộng đồng đang cùng nhau tạo giá trị</span>
        </div>
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Tìm tên quỹ…"
        />
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} retry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <div className="fund-grid">
          {query.data.items.map((fund, i) => (
            <FundCard key={fund.id} fund={fund} index={i} />
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa tìm thấy quỹ"
          description="Thử tên khác hoặc trở thành người tạo quỹ đầu tiên."
          action={
            <Link href="/register" className="btn btn-primary">
              Tạo quỹ của bạn <ArrowRight size={16} />
            </Link>
          }
        />
      )}
      <div className="directory-pagination">
        {page > 1 && (
          <button className="btn btn-secondary" onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
        )}
        {(query.data?.total ?? 0) > page * 9 && (
          <button className="btn btn-secondary" onClick={() => setPage(page + 1)}>
            Trang tiếp theo
          </button>
        )}
      </div>
    </>
  );
}
