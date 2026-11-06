'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  WalletCards,
  ArrowRightLeft,
  HandCoins,
  Receipt,
  ClipboardCheck,
  Landmark,
  ChartNoAxesCombined,
  Files,
  Settings,
  History,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  Plus,
  Globe,
  ShieldCheck,
  ArrowRight,
  Activity,
  Shield,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import {
  api,
  type DashboardData,
  type FundInfo,
  type TransactionRow,
  roleNames,
} from '@/lib/client';
import { vnd, dateLabel } from '@/lib/money';
import {
  Logo,
  ThemeButton,
  Loading,
  ErrorBox,
  Empty,
  MoneyStats,
  TransactionTable,
  Badge,
  Modal,
} from './ui';
import { FlowChart, ExpenseChart } from './charts';
import { GroupsView, FundsView, MembersView, SettingsView } from './management';
import { TransactionsView, TransactionEditor, InternalTransaction } from './transactions';
import {
  ContributionsView,
  ReconciliationView,
  ReportsView,
  DocumentsView,
  ActivityView,
  AuditView,
  AdminView,
} from './operations';
const nav = [
  { id: 'overview', path: '', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'groups', path: '/groups', label: 'Nhóm của tôi', icon: Users },
  { id: 'funds', path: '/funds', label: 'Quản lý quỹ', icon: WalletCards },
  { id: 'transactions', path: '/transactions', label: 'Thu chi', icon: ArrowRightLeft },
  { id: 'contributions', path: '/contributions', label: 'Đóng góp', icon: HandCoins },
  { id: 'members', path: '/members', label: 'Thành viên', icon: Users },
  { id: 'expenses', path: '/expenses', label: 'Khoản chi', icon: Receipt },
  { id: 'approvals', path: '/approvals', label: 'Phê duyệt', icon: ClipboardCheck },
  { id: 'reconciliation', path: '/reconciliation', label: 'Đối soát ngân hàng', icon: Landmark },
  { id: 'reports', path: '/reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
  { id: 'documents', path: '/documents', label: 'Chứng từ', icon: Files },
  { id: 'activities', path: '/activities', label: 'Hoạt động', icon: Activity },
];
export interface DashboardContext {
  data: DashboardData;
  fund: FundInfo | null;
  groupId: string;
  roles: string[];
  user: { id: string; name: string; email: string; platformAdmin: boolean };
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}
export function Dashboard({ user, section }: { user: DashboardContext['user']; section: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [groupId, setGroupId] = useState(''),
    [fundId, setFundId] = useState(''),
    [drawer, setDrawer] = useState(false),
    [adding, setAdding] = useState(false),
    [notice, setNotice] = useState(''),
    [notificationOpen, setNotificationOpen] = useState(false),
    [selected, setSelected] = useState<TransactionRow | null>(null);
  const query = useQuery({
    queryKey: ['dashboard', groupId, fundId],
    queryFn: () => api<DashboardData>(`/api/dashboard?groupId=${groupId}&fundId=${fundId}`),
    refetchInterval: 30000,
  });
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api<
        {
          id: string;
          title: string;
          body: string;
          href: string;
          readAt: string | null;
          createdAt: string;
        }[]
      >('/api/notifications'),
  });
  const data = query.data;
  const fund = data?.selectedFund ?? null;
  const group = data?.groups.find((g) => g.id === (fund?.groupId || groupId)) ?? data?.groups[0];
  const roles = group?.roles ?? [];
  const ctx: DashboardContext | undefined = data
    ? {
        data,
        fund,
        groupId: group?.id || '',
        roles,
        user,
        refresh: async () => {
          await queryClient.invalidateQueries();
        },
        notify: (message) => {
          setNotice(message);
          setTimeout(() => setNotice(''), 7000);
        },
      }
    : undefined;
  const canWrite = roles.some((r) => ['OWNER', 'MANAGER', 'TREASURER'].includes(r));
  const title =
    nav.find((n) => n.id === section)?.label ??
    ({ settings: 'Cài đặt', 'audit-logs': 'Nhật ký kiểm toán', admin: 'Quản trị hệ thống' }[
      section
    ] ||
      'Tổng quan');
  return (
    <div className="dashboard-shell">
      {drawer && (
        <button
          className="sidebar-backdrop"
          onClick={() => setDrawer(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside className={`sidebar ${drawer ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setDrawer(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">{group?.name.slice(0, 1) || 'Đ'}</span>
          <div>
            <small>KHÔNG GIAN LÀM VIỆC</small>
            <select
              aria-label="Chọn nhóm"
              value={group?.id || ''}
              onChange={(e) => {
                setGroupId(e.target.value);
                setFundId('');
              }}
            >
              {!data?.groups.length && <option value="">Nhóm của bạn</option>}
              {data?.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="sidebar-label">QUẢN LÝ QUỸ</div>
        <nav aria-label="Quản trị">
          {nav.map(({ id, path, label, icon: Icon }) => (
            <Link
              key={id}
              href={'/dashboard' + path}
              className={section === id ? 'active' : ''}
              onClick={() => setDrawer(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'approvals' && !!data?.pending && <b className="nav-count">{data.pending}</b>}
            </Link>
          ))}
          <div className="sidebar-divider" />
          <Link className={section === 'audit-logs' ? 'active' : ''} href="/dashboard/audit-logs">
            <History size={18} />
            Nhật ký kiểm toán
          </Link>
          <Link className={section === 'settings' ? 'active' : ''} href="/dashboard/settings">
            <Settings size={18} />
            Cài đặt
          </Link>
          {user.platformAdmin && (
            <Link href="/dashboard/admin" className={section === 'admin' ? 'active' : ''}>
              <Shield size={18} />
              Quản trị hệ thống
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-public">
            <Globe size={24} />
            <strong>Minh bạch cùng cộng đồng</strong>
            <p>Chia sẻ hành trình của quỹ với mọi người.</p>
            <Link href={fund ? `/funds/${fund.slug}` : '/funds'}>
              Xem trang công khai <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="user-menu">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleNames[roles[0]] || 'Tài khoản của bạn'}</small>
            </div>
            <button
              className="icon-button"
              title="Đăng xuất"
              aria-label="Đăng xuất"
              onClick={async () => {
                await api('/api/auth/logout', { method: 'POST', body: '{}' });
                router.push('/login');
                router.refresh();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setDrawer(true)}
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>
            <span>Không gian quản lý</span>
            <ChevronDown size={12} className="crumb-chevron" />
            <b>{title}</b>
          </div>
          <div className="topbar-actions">
            <span className="secure-label">
              <ShieldCheck size={14} /> Phiên bảo mật
            </span>
            <ThemeButton />
            <button
              className="icon-button notification-button"
              aria-label="Thông báo"
              onClick={() => setNotificationOpen(true)}
            >
              <Bell size={19} />
              {notifications.data?.some((n) => !n.readAt) && <i />}
            </button>
            <span className="avatar avatar-small">{user.name.slice(0, 1)}</span>
          </div>
        </header>
        <main id="main" className="dashboard-content">
          <div className="dashboard-page-heading">
            <div>
              <span className="eyebrow">
                {section === 'overview' ? 'MỖI ĐÓNG GÓP ĐỀU CÓ Ý NGHĨA' : 'KHÔNG GIAN QUẢN LÝ'}
              </span>
              <h1>
                {section === 'overview'
                  ? `Xin chào, ${user.name.split(' ').slice(-1)[0]} 👋`
                  : title}
              </h1>
              <p>
                {section === 'overview'
                  ? 'Cùng nhìn lại những đóng góp và hoạt động của quỹ hôm nay.'
                  : 'Thông tin rõ ràng, thao tác dễ dàng, cùng nhau quản lý tốt hơn.'}
              </p>
            </div>
            <div className="page-heading-actions">
              {fund && (
                <select
                  aria-label="Chọn quỹ"
                  value={fund.id}
                  onChange={(e) => setFundId(e.target.value)}
                >
                  {data?.funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
              {fund && canWrite && (
                <button className="btn btn-primary" onClick={() => setAdding(true)}>
                  <Plus size={17} />
                  Thêm giao dịch
                </button>
              )}
            </div>
          </div>
          {group?.isDemo && (
            <div className="demo-notice">
              <ShieldCheck size={14} />
              Không gian dữ liệu minh họa · Các thao tác vẫn được lưu vào cơ sở dữ liệu thật của môi
              trường phát triển.
            </div>
          )}
          {notice && (
            <div className="success-toast" role="status">
              <ShieldCheck size={18} />
              {notice}
              <button
                className="icon-button"
                aria-label="Đóng thông báo"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorBox message={query.error.message} retry={() => query.refetch()} />
          ) : (
            ctx && (
              <>
                {section === 'groups' ? (
                  <GroupsView ctx={ctx} />
                ) : section === 'funds' ? (
                  <FundsView ctx={ctx} />
                ) : section === 'admin' ? (
                  <AdminView />
                ) : !fund ? (
                  <Empty
                    title={
                      data?.groups.length
                        ? 'Tạo quỹ đầu tiên cho nhóm'
                        : 'Chào mừng đến với Đồng Quỹ'
                    }
                    description={
                      data?.groups.length
                        ? 'Nhóm đã sẵn sàng. Tạo quỹ để bắt đầu ghi nhận những đóng góp.'
                        : 'Bắt đầu bằng cách tạo một nhóm và mời những người cùng chung mục tiêu.'
                    }
                    action={
                      <Link
                        href={data?.groups.length ? '/dashboard/funds' : '/dashboard/groups'}
                        className="btn btn-primary"
                      >
                        <Plus size={17} />
                        {data?.groups.length ? 'Tạo quỹ đầu tiên' : 'Tạo nhóm của bạn'}
                      </Link>
                    }
                  />
                ) : section === 'overview' ? (
                  <Overview ctx={ctx} onSelect={setSelected} />
                ) : ['transactions', 'expenses', 'approvals'].includes(section) ? (
                  <TransactionsView ctx={ctx} section={section} onSelect={setSelected} />
                ) : section === 'members' ? (
                  <MembersView ctx={ctx} />
                ) : section === 'contributions' ? (
                  <ContributionsView ctx={ctx} />
                ) : section === 'reconciliation' ? (
                  <ReconciliationView ctx={ctx} />
                ) : section === 'reports' ? (
                  <ReportsView ctx={ctx} />
                ) : section === 'documents' ? (
                  <DocumentsView ctx={ctx} />
                ) : section === 'activities' ? (
                  <ActivityView ctx={ctx} />
                ) : section === 'audit-logs' ? (
                  <AuditView ctx={ctx} />
                ) : (
                  <SettingsView ctx={ctx} />
                )}
              </>
            )
          )}
          <footer className="dashboard-footer">
            <span>Đồng Quỹ · Cùng vun đắp niềm tin</span>
            <span>
              <ShieldCheck size={13} /> Số liệu từ sổ giao dịch đã ghi nhận
            </span>
          </footer>
        </main>
      </div>
      {ctx && fund && (
        <>
          <TransactionEditor ctx={ctx} open={adding} onClose={() => setAdding(false)} />
          <InternalTransaction ctx={ctx} selected={selected} onClose={() => setSelected(null)} />
        </>
      )}
      <Modal
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        title="Thông báo"
        description="Hoạt động mới trong các nhóm của bạn."
      >
        <div className="notification-list">
          {notifications.data?.length ? (
            <>
              <button
                className="btn btn-small btn-secondary"
                onClick={async () => {
                  await api('/api/notifications/read', { method: 'POST', body: '{}' });
                  await queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }}
              >
                Đánh dấu tất cả đã đọc
              </button>
              {notifications.data.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  className={`notification-item ${!n.readAt ? 'unread' : ''}`}
                  onClick={() => setNotificationOpen(false)}
                >
                  <Bell size={17} />
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <small>{dateLabel(n.createdAt)}</small>
                  </div>
                </Link>
              ))}
            </>
          ) : (
            <Empty title="Bạn đã cập nhật mọi thứ" />
          )}
        </div>
      </Modal>
    </div>
  );
}
function Overview({
  ctx,
  onSelect,
}: {
  ctx: DashboardContext;
  onSelect: (tx: TransactionRow) => void;
}) {
  const { data, fund } = ctx;
  const stats = data.stats!;
  const required = data.periods
    .flatMap((p) => p.dues)
    .reduce((s, d) => s + BigInt(d.summary.required), 0n);
  const paid = data.periods.flatMap((p) => p.dues).reduce((s, d) => s + BigInt(d.summary.paid), 0n);
  const percent = required > 0n ? Math.min(100, Number((paid * 100n) / required)) : 0;
  return (
    <>
      <div className="overview-context">
        <span>
          <WalletCards size={17} />
          <strong>{fund!.name}</strong>
          <Badge tone={fund!.visibility === 'PRIVATE' ? 'neutral' : 'green'}>
            {fund!.visibility === 'PRIVATE' ? 'Nội bộ' : 'Công khai'}
          </Badge>
        </span>
        <span>
          <CalendarDays size={15} />
          Tổng hợp đến {dateLabel(stats.asOf)}
        </span>
      </div>
      <MoneyStats stats={stats} />
      <div className="attention-grid">
        <Link href="/dashboard/approvals">
          <span className="attention-icon amber">
            <ClipboardCheck size={21} />
          </span>
          <div>
            <b>{data.pending} giao dịch chờ duyệt</b>
            <small>Kiểm tra trước khi ghi nhận vào quỹ</small>
          </div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/dashboard/reconciliation">
          <span className="attention-icon blue">
            <Landmark size={21} />
          </span>
          <div>
            <b>{data.unmatched} khoản chưa đối soát</b>
            <small>Ghép sao kê với giao dịch thực tế</small>
          </div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/dashboard/contributions">
          <span className="attention-icon positive">
            <HandCoins size={21} />
          </span>
          <div>
            <b>Đóng quỹ đạt {percent}%</b>
            <small>
              {vnd(paid)} / {vnd(required)} nghĩa vụ
            </small>
          </div>
          <ArrowRight size={17} />
        </Link>
      </div>
      {BigInt(stats.closing) < BigInt(fund!.lowBalance) && (
        <div className="warning-box">
          <AlertTriangle size={18} />
          Số dư quỹ đang thấp hơn ngưỡng {vnd(fund!.lowBalance)}. Hãy cân đối các khoản chi sắp tới.
        </div>
      )}
      <div className="charts-grid">
        <FlowChart stats={stats} />
        <ExpenseChart stats={stats} />
      </div>
      <div className="overview-bottom">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h3>Giao dịch gần đây</h3>
              <p>Theo dõi dòng tiền của cộng đồng</p>
            </div>
            <Link className="text-link" href="/dashboard/transactions">
              Tất cả giao dịch <ArrowRight size={15} />
            </Link>
          </div>
          <TransactionTable items={data.recent.items} internal onSelect={onSelect} />
        </section>
        <aside className="panel dues-summary">
          <span className="purpose-icon">
            <HandCoins size={24} />
          </span>
          <h3>
            Cùng hoàn thành
            <br />
            mục tiêu đóng quỹ
          </h3>
          <div className="big-percent">
            {percent}
            <span>%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>
            Đã phân bổ <b>{vnd(paid)}</b> vào các kỳ đóng quỹ.
          </p>
          <Link className="btn btn-secondary" href="/dashboard/contributions">
            Chi tiết đóng góp <ArrowUpRight size={16} />
          </Link>
          <small>Khoản phải đóng chưa phải tiền thực nhận.</small>
        </aside>
      </div>
    </>
  );
}
