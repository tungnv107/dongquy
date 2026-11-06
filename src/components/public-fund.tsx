'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import {
  ArrowUpRight,
  ChevronRight,
  Globe,
  Share2,
  HeartHandshake,
  Users,
  ShieldCheck,
  CalendarDays,
  Clock3,
  Target,
  FileText,
  ArrowRight,
  Building2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  api,
  type FundInfo,
  type Stats,
  type Page,
  type TransactionRow,
  today,
} from '@/lib/client';
import { vnd, dateLabel } from '@/lib/money';
import {
  Badge,
  MoneyStats,
  TransactionTable,
  Pager,
  SearchBox,
  Modal,
  Loading,
  ErrorBox,
  Empty,
  ExportButtons,
  CopyButton,
  DataForm,
} from './ui';
import { FlowChart, ExpenseChart, BalanceChart } from './charts';
interface PublicData {
  fund: FundInfo;
  stats: Stats | null;
  recent: Page<TransactionRow>;
  contributors: { name: string; amount: string; count: string }[];
  activities: { id: string; title: string; content: string; createdAt: string }[];
  documents: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }[];
}
export function PublicFund({ initial, view = 'overview' }: { initial: PublicData; view?: string }) {
  const query = useQuery({
    queryKey: ['public-fund', initial.fund.slug],
    queryFn: () => api<PublicData>(`/api/public/funds/${initial.fund.slug}`),
    initialData: initial,
    refetchInterval: 60000,
  });
  const data = query.data;
  const fund = data.fund;
  const [selected, setSelected] = useState<TransactionRow | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareQR, setShareQR] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState('all');
  const statsQuery = useQuery({
    queryKey: ['public-stats', fund.slug, from, to],
    queryFn: () => api<Stats>(`/api/public/funds/${fund.slug}/statistics?from=${from}&to=${to}`),
    enabled: fund.showSummary,
    refetchInterval: 30000,
    initialData: !from && !to ? (data.stats ?? undefined) : undefined,
  });
  const stats = statsQuery.data;
  const base = `/funds/${fund.slug}`;
  function changeRange(value: string) {
    setRange(value);
    const now = new Date(`${today()}T00:00:00+07:00`);
    const year = Number(today().slice(0, 4)),
      month = Number(today().slice(5, 7));
    if (value === 'all') {
      setFrom('');
      setTo('');
    } else if (value === 'month') {
      setFrom(`${year}-${String(month).padStart(2, '0')}-01`);
      setTo(today());
    } else if (value === 'last') {
      const d = new Date(Date.UTC(year, month - 2, 1));
      setFrom(d.toISOString().slice(0, 10));
      setTo(new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10));
    } else if (value === 'quarter') {
      setFrom(`${year}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0')}-01`);
      setTo(today());
    } else if (value === 'year') {
      setFrom(`${year}-01-01`);
      setTo(today());
    }
    void now;
  }
  useEffect(() => {
    if (sharing)
      QRCode.toDataURL(window.location.origin + base, {
        width: 240,
        margin: 2,
        color: { dark: '#123d36' },
      })
        .then(setShareQR)
        .catch(() => setShareQR(''));
  }, [sharing, base]);
  return (
    <main id="main" className="public-container fund-page">
      {query.error && (
        <ErrorBox
          message="Chưa lấy được cập nhật mới. Bạn đang xem dữ liệu đã tải trước đó."
          retry={() => query.refetch()}
        />
      )}
      <div className="breadcrumb">
        <Link href="/funds">Khám phá quỹ</Link>
        <ChevronRight size={14} />
        <span>{fund.name}</span>
      </div>
      {fund.group?.coverUrl && (
        <img
          className="group-cover"
          src={fund.group.coverUrl}
          alt={`Ảnh bìa ${fund.group.name}`}
          width={1200}
          height={220}
          referrerPolicy="no-referrer"
        />
      )}
      <div className="fund-heading">
        <div className="fund-identity">
          <span className="fund-avatar">
            {fund.group?.logoUrl ? (
              <img
                src={fund.group.logoUrl}
                alt=""
                width={64}
                height={64}
                referrerPolicy="no-referrer"
              />
            ) : (
              <HeartHandshake size={32} />
            )}
          </span>
          <div>
            <div className="title-with-badge">
              <h1>{fund.name}</h1>
              <Badge tone="green">
                <Globe size={12} />
                {fund.visibility === 'UNLISTED' ? 'Chia sẻ bằng liên kết' : 'Quỹ công khai'}
              </Badge>
            </div>
            <p>{fund.description}</p>
            <div className="fund-meta">
              <span>
                <Users size={14} />
                {fund.group?.name}
              </span>
              <span>
                <CalendarDays size={14} />
                Từ {dateLabel(fund.createdAt)}
              </span>
              {fund.publicManager && (
                <span>
                  <ShieldCheck size={14} />
                  {fund.publicManager}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="fund-heading-actions">
          <button className="btn btn-secondary" onClick={() => setSharing(true)}>
            <Share2 size={16} />
            Chia sẻ
          </button>
          <Link className="btn btn-primary" href={`${base}/contribute`}>
            <HeartHandshake size={17} />
            Đóng góp quỹ
          </Link>
        </div>
      </div>
      {fund.group?.isDemo && (
        <div className="demo-notice">
          <Info size={15} />
          Quỹ minh họa trong môi trường phát triển. Không chuyển tiền theo dữ liệu mẫu.
        </div>
      )}
      <nav className="fund-tabs" aria-label="Các trang của quỹ">
        {[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'transactions', label: 'Lịch sử thu chi' },
          { id: 'contributors', label: 'Người đóng góp' },
          { id: 'reports', label: 'Báo cáo' },
          { id: 'activities', label: 'Hoạt động' },
          { id: 'documents', label: 'Chứng từ' },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.id === 'overview' ? base : `${base}/${t.id}`}
            className={view === t.id ? 'active' : ''}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {(view === 'overview' || view === 'reports') && (
        <>
          <div className="section-bar">
            <div>
              <h2>{view === 'reports' ? 'Báo cáo minh bạch' : 'Bức tranh tài chính'}</h2>
              <span className="updated">
                <span className="live-dot" />
                {stats?.updatedAt
                  ? `Cập nhật ${dateLabel(stats.updatedAt)}`
                  : 'Sẵn sàng ghi nhận hoạt động mới'}
              </span>
            </div>
            <div className="date-controls">
              <CalendarDays size={16} />
              <select
                aria-label="Khoảng thời gian"
                value={range}
                onChange={(e) => changeRange(e.target.value)}
              >
                <option value="all">Toàn bộ thời gian</option>
                <option value="month">Tháng này</option>
                <option value="last">Tháng trước</option>
                <option value="quarter">Quý này</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chọn</option>
              </select>
              {range === 'custom' && (
                <>
                  <input
                    aria-label="Từ ngày"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                  <input
                    aria-label="Đến ngày"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>
          {statsQuery.error ? (
            <ErrorBox message={statsQuery.error.message} />
          ) : stats ? (
            <>
              <MoneyStats
                stats={stats}
                period={range === 'all' ? 'Toàn bộ thời gian' : 'Khoảng thời gian đã chọn'}
              />
              <div className="charts-grid">
                <FlowChart stats={stats} />
                <ExpenseChart stats={stats} />
              </div>
            </>
          ) : fund.showSummary ? (
            <Loading />
          ) : (
            <Empty title="Quỹ chưa công khai số liệu tổng hợp" />
          )}
          {view === 'reports' && stats && (
            <>
              <BalanceChart stats={stats} />
              <div className="report-summary panel">
                <h3>Đối chiếu số dư trong kỳ</h3>
                <div>
                  <span>
                    Đầu kỳ<strong>{vnd(stats.opening)}</strong>
                  </span>
                  <span>
                    Thu − Chi<strong>{vnd(BigInt(stats.income) - BigInt(stats.expense))}</strong>
                  </span>
                  <span>
                    Chuyển quỹ & đầu kỳ bổ sung
                    <strong>{vnd(BigInt(stats.transfers) + BigInt(stats.openingAdded))}</strong>
                  </span>
                  <span>
                    Cuối kỳ<strong>{vnd(stats.closing)}</strong>
                  </span>
                </div>
                {fund.allowExport ? (
                  <ExportButtons
                    base={`/api/public/funds/${fund.slug}/reports?from=${from}&to=${to}`}
                  />
                ) : (
                  <p className="muted">Quỹ chưa cho phép tải báo cáo công khai.</p>
                )}
                <p className="small muted">
                  Báo cáo tải về chỉ chứa giao dịch được phép công khai chi tiết.
                </p>
              </div>
            </>
          )}
          {view === 'overview' && (
            <>
              <div className="overview-bottom">
                <section className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Giao dịch gần đây</h3>
                      <p>Mọi khoản thu chi đều có câu chuyện của riêng mình</p>
                    </div>
                    <Link href={`${base}/transactions`} className="text-link">
                      Xem tất cả <ArrowRight size={15} />
                    </Link>
                  </div>
                  <TransactionTable items={data.recent.items} onSelect={setSelected} />
                </section>
                <aside className="purpose-card">
                  <span className="purpose-icon">
                    <Target size={25} />
                  </span>
                  <h3>
                    Cùng hướng tới
                    <br />
                    mục tiêu chung
                  </h3>
                  <p>{fund.purpose}</p>
                  {BigInt(fund.goalAmount) > 0n && stats && (
                    <>
                      <div className="goal-label">
                        <strong>{vnd(stats.closing)}</strong>
                        <span>/ {vnd(fund.goalAmount)}</span>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(100, (Number(stats.closing) / Number(fund.goalAmount)) * 100))}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                  <Link className="btn btn-primary" href={`${base}/contribute`}>
                    Góp một phần của bạn <ArrowUpRight size={17} />
                  </Link>
                  <small>
                    <ShieldCheck size={13} /> Đóng góp được xác nhận sau đối soát
                  </small>
                </aside>
              </div>
              <div className="transparency-note">
                <ShieldCheck size={19} />
                <div>
                  <strong>Minh bạch để cùng tin tưởng</strong>
                  <p>
                    Số dư tính từ toàn bộ giao dịch đã ghi sổ. Lịch sử chỉ hiển thị các giao dịch
                    được phép công khai; tổng hợp có thể bao gồm khoản không công khai chi tiết.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {view === 'transactions' && (
        <PublicTransactions slug={fund.slug} fund={fund} onSelect={setSelected} />
      )}
      {view === 'contributors' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Những người cùng góp sức</h3>
              <p>
                Chỉ hiển thị các khoản đã ghi sổ và được phép công khai. Tôn trọng lựa chọn ẩn danh.
              </p>
            </div>
            <HeartHandshake size={24} />
          </div>
          {fund.showContributors ? (
            data.contributors.length ? (
              <div className="contributors-grid">
                {data.contributors.map((c, i) => (
                  <div className="contributor" key={i}>
                    <span className="avatar">{c.name.slice(0, 1)}</span>
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.count} lần đóng góp</small>
                    </div>
                    <b>{vnd(c.amount)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Chưa có đóng góp công khai" />
            )
          ) : (
            <Empty
              title="Quỹ không công khai danh sách người đóng góp"
              description="Thông tin thành viên và nghĩa vụ đóng quỹ được bảo vệ theo chính sách riêng tư."
            />
          )}
        </section>
      )}
      {view === 'activities' && (
        <section className="activities-list">
          {data.activities.length ? (
            data.activities.map((a) => (
              <article className="panel activity" key={a.id}>
                <span className="activity-date">
                  <CalendarDays size={15} />
                  {dateLabel(a.createdAt)}
                </span>
                <h2>{a.title}</h2>
                <p>{a.content}</p>
              </article>
            ))
          ) : (
            <Empty title="Chưa có hoạt động được công khai" />
          )}
        </section>
      )}
      {view === 'documents' && (
        <section>
          <div className="section-bar">
            <div>
              <h2>Chứng từ minh bạch</h2>
              <p className="muted">Chỉ bao gồm những tệp đã được rà soát và cho phép công khai.</p>
            </div>
          </div>
          {data.documents?.length ? (
            <div className="document-grid">
              {data.documents.map((document) => (
                <a
                  className="panel document-card"
                  key={document.id}
                  href={`/api/attachments/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="document-preview">
                    {document.mimeType.startsWith('image/') ? (
                      <img
                        src={`/api/attachments/${document.id}`}
                        alt={document.originalName}
                        loading="lazy"
                      />
                    ) : (
                      <FileText size={40} />
                    )}
                  </div>
                  <div className="document-card-body">
                    <h3>{document.originalName}</h3>
                    <p>
                      {dateLabel(document.createdAt)} · {(document.size / 1024).toFixed(1)} KB
                    </p>
                    <span className="text-link">
                      Xem chứng từ <ArrowUpRight size={14} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <Empty
              title="Chưa có chứng từ được công khai"
              description="Người quản lý sẽ bổ sung các bản chứng từ đã kiểm tra quyền riêng tư."
            />
          )}
        </section>
      )}
      {view === 'contribute' && <Contribute fund={fund} />}
      <Modal
        open={sharing}
        onClose={() => setSharing(false)}
        title="Chia sẻ sự minh bạch"
        description="Mời mọi người cùng theo dõi hành trình của quỹ."
      >
        <div className="share-content">
          {shareQR && <img src={shareQR} alt="Mã QR dẫn đến trang quỹ" width={240} height={240} />}
          <p>{fund.name}</p>
          <CopyButton
            value={typeof window !== 'undefined' ? window.location.origin + base : base}
            label="Sao chép liên kết"
          />
          <div className="share-links">
            <a
              className="text-link"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + base : base)}`}
              target="_blank"
              rel="noreferrer"
            >
              Chia sẻ Facebook <ArrowUpRight size={15} />
            </a>
            <button
              className="btn btn-text"
              onClick={async () => {
                if (navigator.share)
                  await navigator
                    .share({ title: fund.name, url: window.location.origin + base })
                    .catch(() => {});
                else await navigator.clipboard.writeText(window.location.origin + base);
              }}
            >
              Chia sẻ qua ứng dụng / Zalo
            </button>
          </div>
        </div>
      </Modal>
      <TransactionDetails slug={fund.slug} selected={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
function PublicTransactions({
  slug,
  fund,
  onSelect,
}: {
  slug: string;
  fund: FundInfo;
  onSelect: (tx: TransactionRow) => void;
}) {
  const [q, setQ] = useState(''),
    [type, setType] = useState(''),
    [categoryId, setCategory] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(1);
  const queryString = new URLSearchParams({
    q,
    type,
    categoryId,
    from,
    to,
    sort,
    page: String(page),
    pageSize: '12',
  }).toString();
  const query = useQuery({
    queryKey: ['public-transactions', slug, queryString],
    queryFn: () =>
      api<Page<TransactionRow>>(`/api/public/funds/${slug}/transactions?${queryString}`),
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Lịch sử thu chi</h3>
          <p>Giao dịch đã ghi sổ và được phép công khai</p>
        </div>
        {fund.allowExport && (
          <ExportButtons base={`/api/public/funds/${slug}/reports?${queryString}`} />
        )}
      </div>
      <div className="filter-bar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        <select
          aria-label="Loại giao dịch"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả thu chi</option>
          <option value="INCOME">Khoản thu</option>
          <option value="EXPENSE">Khoản chi</option>
          <option value="TRANSFER">Chuyển quỹ</option>
          <option value="REVERSAL">Hoàn / điều chỉnh</option>
        </select>
        <select
          aria-label="Danh mục"
          value={categoryId}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {fund.categories?.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Từ ngày"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          aria-label="Đến ngày"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <select aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
        </select>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        query.data && (
          <>
            <TransactionTable items={query.data.items} onSelect={onSelect} />
            <Pager page={page} total={query.data.total} pageSize={12} onChange={setPage} />
          </>
        )
      )}
    </section>
  );
}
function TransactionDetails({
  slug,
  selected,
  onClose,
}: {
  slug: string;
  selected: TransactionRow | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['public-transaction', selected?.id],
    queryFn: () => api<TransactionRow>(`/api/public/funds/${slug}/transactions/${selected!.id}`),
    enabled: !!selected,
  });
  return (
    <Modal
      open={!!selected}
      onClose={onClose}
      title="Chi tiết giao dịch"
      description={selected?.code}
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        query.data && (
          <div className="transaction-detail">
            <span className="detail-amount">{vnd(query.data.amount)}</span>
            <h3>{query.data.description}</h3>
            <div className="detail-grid">
              <span>
                Ngày giao dịch<strong>{dateLabel(query.data.date)}</strong>
              </span>
              <span>
                Danh mục<strong>{query.data.category}</strong>
              </span>
              <span>
                Trạng thái
                <strong className="text-green">
                  <ShieldCheck size={15} /> Đã duyệt và ghi sổ
                </strong>
              </span>
            </div>
            <h4>Chứng từ công khai</h4>
            {query.data.attachments?.length ? (
              query.data.attachments.map((a) => (
                <a
                  className="document-link"
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  key={a.id}
                >
                  <FileText size={19} />
                  {a.name}
                  <ArrowUpRight size={16} />
                </a>
              ))
            ) : (
              <p className="muted">Không có chứng từ được công khai cho giao dịch này.</p>
            )}
          </div>
        )
      )}
    </Modal>
  );
}
function Contribute({ fund }: { fund: FundInfo }) {
  const [request, setRequest] = useState<{
    reference: string;
    amount: string;
    status: string;
  } | null>(null);
  if (!fund.bank)
    return (
      <div className="panel">
        <Empty
          title="Quỹ chưa công khai thông tin nhận đóng góp"
          description="Người quản lý cần cấu hình tài khoản nhận tiền và xác nhận đồng ý công khai trước khi nhận đóng góp qua QR."
        />
      </div>
    );
  const bank = fund.bank;
  return (
    <div className="contribute-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">MỘT ĐÓNG GÓP, MỘT Ý NGHĨA</span>
            <h2>Cùng góp sức cho {fund.name}</h2>
            <p>{fund.purpose}</p>
          </div>
        </div>
        <DataForm
          fields={[
            {
              name: 'amount',
              label: 'Số tiền đóng góp (VND)',
              type: 'number',
              required: true,
              min: 1,
              max: 1000000000000,
              defaultValue: '100000',
            },
            { name: 'publicName', label: 'Tên hoặc biệt danh (tùy chọn)', placeholder: 'Ẩn danh' },
          ]}
          submitLabel="Tạo hướng dẫn chuyển khoản"
          onSubmit={async (values) =>
            setRequest(
              await api(`/api/public/funds/${fund.slug}/contribute`, {
                method: 'POST',
                body: JSON.stringify(values),
              }),
            )
          }
        />
        <div className="bank-details">
          <Building2 size={24} />
          <div>
            <small>Ngân hàng thụ hưởng</small>
            <strong>{bank.name}</strong>
            <small>Chủ tài khoản</small>
            <strong>{bank.holder}</strong>
            <small>Số tài khoản</small>
            <strong>{bank.account}</strong>
            <CopyButton value={bank.account} />
          </div>
        </div>
      </section>
      <section className="panel contribution-instructions">
        {request ? (
          <>
            <Badge tone="amber">
              <Clock3 size={14} /> Chờ đối soát
            </Badge>
            <h3>Quét mã để chuyển khoản</h3>
            <img
              className="payment-qr"
              src={`https://img.vietqr.io/image/${encodeURIComponent(bank.bin)}-${encodeURIComponent(bank.account)}-compact2.png?amount=${request.amount}&addInfo=${encodeURIComponent(request.reference)}&accountName=${encodeURIComponent(bank.holder)}`}
              alt="VietQR chuyển khoản theo số tiền và nội dung đã chọn"
              width={300}
              height={330}
            />
            <strong>{vnd(request.amount)}</strong>
            <div className="reference-box">
              <small>Nội dung chuyển khoản</small>
              <b>{request.reference}</b>
              <CopyButton value={request.reference} />
            </div>
            <p className="info-message">
              <Info size={18} /> Hiển thị mã QR chưa phải thanh toán thành công. Khoản đóng góp chỉ
              được xác nhận sau khi quỹ nhận tiền và đối soát.
            </p>
          </>
        ) : (
          <>
            <span className="large-icon">
              <HeartHandshake size={52} />
            </span>
            <h3>Cảm ơn vì đã cùng góp sức.</h3>
            <p>Chọn số tiền để nhận mã QR và nội dung chuyển khoản riêng của bạn.</p>
            <div className="instruction-step">
              <CheckCircle2 size={20} /> Nhập số tiền đóng góp
            </div>
            <div className="instruction-step">
              <CheckCircle2 size={20} /> Chuyển khoản bằng ứng dụng ngân hàng
            </div>
            <div className="instruction-step">
              <CheckCircle2 size={20} /> Quỹ kiểm tra, đối soát và xác nhận
            </div>
          </>
        )}
      </section>
    </div>
  );
}
