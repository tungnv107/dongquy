'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Users,
  ArrowUpRight,
  WalletCards,
  Settings,
  Mail,
  ShieldCheck,
  UserRound,
  Copy,
  Globe,
} from 'lucide-react';
import { api, roleNames, type MemberInfo } from '@/lib/client';
import { vnd } from '@/lib/money';
import { Badge, DataForm, Modal, Empty, Loading, ErrorBox, CopyButton, type Field } from './ui';
import type { DashboardContext } from './dashboard';
const groupFields: Field[] = [
  { name: 'name', label: 'Tên nhóm', required: true, placeholder: 'Cộng đồng của chúng ta' },
  {
    name: 'slug',
    label: 'Đường dẫn nhóm',
    required: true,
    placeholder: 'cong-dong-cua-chung-ta',
    hint: 'Chữ thường, số và dấu gạch ngang.',
  },
  { name: 'description', label: 'Giới thiệu nhóm', type: 'textarea' },
  { name: 'representative', label: 'Người đại diện' },
  {
    name: 'logoUrl',
    label: 'Đường dẫn ảnh logo',
    placeholder: 'https://...',
    hint: 'Chỉ sử dụng ảnh đã được phép công khai trên các trang quỹ.',
  },
  {
    name: 'coverUrl',
    label: 'Đường dẫn ảnh bìa',
    placeholder: 'https://...',
    hint: 'Ảnh HTTPS được hiển thị trên trang quỹ công khai của nhóm.',
  },
  { name: 'foundedAt', label: 'Ngày thành lập', type: 'date' },
];
const fundFields: Field[] = [
  { name: 'name', label: 'Tên quỹ', required: true, placeholder: 'Quỹ hoạt động chung' },
  {
    name: 'slug',
    label: 'Đường dẫn công khai',
    required: true,
    placeholder: 'quy-hoat-dong-chung',
  },
  {
    name: 'type',
    label: 'Loại quỹ',
    type: 'select',
    options: [
      { value: 'GENERAL', label: 'Quỹ chung' },
      { value: 'REGULAR', label: 'Thường xuyên' },
      { value: 'EVENT', label: 'Sự kiện' },
      { value: 'CHARITY', label: 'Thiện nguyện' },
      { value: 'RESERVE', label: 'Dự phòng' },
      { value: 'ANNUAL', label: 'Theo năm / chiến dịch' },
    ],
  },
  {
    name: 'visibility',
    label: 'Quyền truy cập',
    type: 'select',
    defaultValue: 'PRIVATE',
    options: [
      { value: 'PRIVATE', label: 'Riêng tư — chỉ thành viên' },
      { value: 'UNLISTED', label: 'Chia sẻ bằng liên kết' },
      { value: 'PUBLIC', label: 'Công khai với mọi người' },
    ],
  },
  { name: 'description', label: 'Giới thiệu quỹ', type: 'textarea' },
  { name: 'purpose', label: 'Mục tiêu sử dụng quỹ', type: 'textarea' },
  {
    name: 'goalAmount',
    label: 'Mục tiêu tài chính (VND)',
    type: 'number',
    min: 0,
    defaultValue: '0',
  },
  {
    name: 'lowBalance',
    label: 'Cảnh báo số dư dưới (VND)',
    type: 'number',
    min: 0,
    defaultValue: '1000000',
  },
  {
    name: 'dualControl',
    label: 'Yêu cầu người tạo và người duyệt khác nhau',
    type: 'checkbox',
    defaultValue: true,
    hint: 'Mặc định bật để kiểm soát hai người.',
  },
];
function cleanDates(v: Record<string, string | boolean>) {
  return Object.fromEntries(Object.entries(v).filter(([k, value]) => k !== 'foundedAt' || value));
}
export function GroupsView({ ctx }: { ctx: DashboardContext }) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(false);
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Không gian của cộng đồng</h2>
          <p className="muted">Mỗi nhóm độc lập, mỗi thành viên có vai trò riêng.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          Tạo nhóm
        </button>
      </div>
      <div className="management-grid">
        {ctx.data.groups.map((g) => (
          <article className="panel management-card" key={g.id}>
            <span className="management-icon">
              {g.logoUrl ? (
                <img src={g.logoUrl} alt="" width={48} height={48} referrerPolicy="no-referrer" />
              ) : (
                <Users size={28} />
              )}
            </span>
            <h3>{g.name}</h3>
            <p>{g.description || 'Một không gian để cùng đóng góp và quản lý minh bạch.'}</p>
            <div className="badges">
              {g.roles.map((r) => (
                <Badge key={r}>{roleNames[r]}</Badge>
              ))}
            </div>
            <div className="management-card-footer">
              <small>/{g.slug}</small>
              {g.id === ctx.groupId && g.roles.includes('OWNER') && (
                <button className="btn btn-small btn-secondary" onClick={() => setEditing(true)}>
                  <Settings size={14} />
                  Chỉnh sửa
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!ctx.data.groups.length && (
        <Empty
          title="Nhóm đầu tiên bắt đầu từ bạn"
          description="Tạo nhóm để cùng bạn bè, đồng nghiệp hoặc cộng đồng quản lý quỹ chung."
        />
      )}
      <Modal
        open={open || editing}
        onClose={() => {
          setOpen(false);
          setEditing(false);
        }}
        title={editing ? 'Chỉnh sửa nhóm' : 'Tạo nhóm mới'}
      >
        <DataForm
          fields={groupFields}
          defaults={
            editing
              ? (ctx.data.groups.find((g) => g.id === ctx.groupId) as unknown as Record<
                  string,
                  unknown
                >)
              : undefined
          }
          onSubmit={async (v) => {
            await api(editing ? `/api/groups/${ctx.groupId}` : '/api/groups', {
              method: editing ? 'PATCH' : 'POST',
              body: JSON.stringify(cleanDates(v)),
            });
            setOpen(false);
            setEditing(false);
            await ctx.refresh();
            ctx.notify(
              editing ? 'Đã cập nhật thông tin nhóm.' : 'Đã tạo nhóm. Hãy tạo quỹ để bắt đầu.',
            );
          }}
        />
      </Modal>
    </>
  );
}
export function FundsView({ ctx }: { ctx: DashboardContext }) {
  const [open, setOpen] = useState(false);
  const canManage = ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r));
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Các quỹ trong nhóm</h2>
          <p className="muted">Số dư độc lập, quản lý tập trung.</p>
        </div>
        {ctx.groupId && canManage && (
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Tạo quỹ
          </button>
        )}
      </div>
      {!ctx.groupId ? (
        <Empty
          title="Cần có nhóm trước khi tạo quỹ"
          action={
            <Link href="/dashboard/groups" className="btn btn-primary">
              Tạo nhóm
            </Link>
          }
        />
      ) : (
        <div className="management-grid">
          {ctx.data.funds.map((f) => (
            <article key={f.id} className="panel management-card">
              <div className="management-card-top">
                <span className="management-icon">
                  <WalletCards size={28} />
                </span>
                <Badge tone={f.visibility === 'PRIVATE' ? 'neutral' : 'green'}>
                  {f.visibility === 'PUBLIC'
                    ? 'Công khai'
                    : f.visibility === 'UNLISTED'
                      ? 'Bằng liên kết'
                      : 'Riêng tư'}
                </Badge>
              </div>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <span className="muted small">Số dư hiện tại</span>
              <strong className="fund-balance">{vnd(f.balance)}</strong>
              <div className="management-card-footer">
                <Badge tone={f.dualControl ? 'green' : 'amber'}>
                  <ShieldCheck size={12} />
                  {f.dualControl ? 'Kiểm soát hai người' : 'Duyệt một người'}
                </Badge>
                <Link
                  href={`/funds/${f.slug}`}
                  className="icon-button"
                  aria-label={`Xem công khai ${f.name}`}
                >
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {ctx.groupId && !ctx.data.funds.length && (
        <Empty
          title="Chưa có quỹ trong nhóm"
          description="Tạo quỹ đầu tiên để ghi nhận các khoản đóng góp."
        />
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo quỹ mới"
        description="Quỹ mới bắt đầu với số dư 0. Muốn bổ sung đầu kỳ, hãy tạo giao dịch có chứng từ."
      >
        <DataForm
          fields={fundFields}
          onSubmit={async (v) => {
            await api('/api/funds', {
              method: 'POST',
              body: JSON.stringify({ ...v, groupId: ctx.groupId }),
            });
            setOpen(false);
            await ctx.refresh();
            ctx.notify('Đã tạo quỹ mới với số dư 0.');
          }}
        />
      </Modal>
    </>
  );
}
export function MembersView({ ctx }: { ctx: DashboardContext }) {
  const query = useQuery({
    queryKey: ['members', ctx.groupId],
    queryFn: () => api<MemberInfo[]>(`/api/groups/${ctx.groupId}/members`),
  });
  const [mode, setMode] = useState<'add' | 'invite' | 'edit' | null>(null),
    [selected, setSelected] = useState<MemberInfo | null>(null),
    [inviteLink, setInviteLink] = useState('');
  const owner = ctx.roles.includes('OWNER');
  const roleFields: Field[] = Object.entries(roleNames).map(([value, label]) => ({
    name: `role_${value}`,
    label,
    type: 'checkbox',
    defaultValue: value === 'MEMBER',
  }));
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Những người cùng góp sức</h2>
          <p className="muted">Vai trò rõ ràng, trách nhiệm được chia sẻ.</p>
        </div>
        {owner && (
          <div className="button-row">
            <button className="btn btn-secondary" onClick={() => setMode('invite')}>
              <Mail size={16} />
              Mời thành viên
            </button>
            <button className="btn btn-primary" onClick={() => setMode('add')}>
              <Plus size={16} />
              Thêm thành viên
            </button>
          </div>
        )}
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Mã</th>
                <th>Vai trò</th>
                <th>Quyền riêng tư</th>
                <th>Trạng thái</th>
                {owner && <th />}
              </tr>
            </thead>
            <tbody>
              {query.data?.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <span className="avatar">{m.user.name[0]}</span>
                      <div>
                        <strong>{m.user.name}</strong>
                        <small>{m.user.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{m.code}</td>
                  <td>
                    <div className="badges">
                      {m.roles.map((r) => (
                        <Badge key={r}>{roleNames[r]}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>{m.publicConsent ? m.publicName : 'Ẩn danh'}</td>
                  <td>
                    <Badge tone={m.active ? 'green' : 'neutral'}>
                      {m.active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </td>
                  {owner && (
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => {
                          setSelected(m);
                          setMode('edit');
                        }}
                        aria-label={`Chỉnh ${m.user.name}`}
                      >
                        <Settings size={17} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!mode}
        onClose={() => {
          setMode(null);
          setSelected(null);
        }}
        title={
          mode === 'invite'
            ? 'Mời tham gia nhóm'
            : mode === 'edit'
              ? 'Vai trò và quyền truy cập'
              : 'Thêm thành viên đã có tài khoản'
        }
        description={
          mode === 'invite'
            ? 'Tạo liên kết mời để bạn tự gửi cho người nhận. Liên kết có hiệu lực 7 ngày.'
            : mode === 'edit'
              ? selected?.user.name
              : 'Nhập email tài khoản đã đăng ký Đồng Quỹ.'
        }
      >
        <DataForm
          key={mode ?? 'none'}
          fields={[
            ...(mode !== 'edit'
              ? [
                  {
                    name: 'email',
                    label: 'Email thành viên',
                    type: 'email' as const,
                    required: true,
                  },
                ]
              : []),
            ...roleFields,
            ...(mode === 'edit'
              ? [
                  {
                    name: 'approvalLimit',
                    label: 'Hạn mức phê duyệt (VND)',
                    type: 'number' as const,
                    min: 1,
                    hint: 'Bỏ trống để không giới hạn.',
                  },
                  { name: 'phone', label: 'Số điện thoại (nội bộ)' },
                  { name: 'notes', label: 'Ghi chú nội bộ', type: 'textarea' as const },
                  {
                    name: 'active',
                    label: 'Thành viên đang hoạt động',
                    type: 'checkbox' as const,
                    defaultValue: true,
                  },
                ]
              : []),
          ]}
          defaults={
            selected
              ? {
                  ...Object.fromEntries(
                    Object.keys(roleNames).map((r) => [`role_${r}`, selected.roles.includes(r)]),
                  ),
                  approvalLimit: selected.approvalLimit || '',
                  phone: selected.phone || '',
                  notes: selected.notes || '',
                  active: selected.active,
                }
              : undefined
          }
          onSubmit={async (values) => {
            const roles = Object.keys(roleNames).filter((r) => values[`role_${r}`]);
            if (!roles.length) throw new Error('Chọn ít nhất một vai trò.');
            const payload =
              mode === 'edit'
                ? {
                    roles,
                    active: values.active,
                    approvalLimit: values.approvalLimit || null,
                    phone: values.phone,
                    notes: values.notes,
                  }
                : { email: values.email, roles };
            const path =
              mode === 'invite'
                ? `/api/groups/${ctx.groupId}/invitations`
                : mode === 'edit'
                  ? `/api/groups/${ctx.groupId}/members/${selected!.id}`
                  : `/api/groups/${ctx.groupId}/members`;
            const result = await api<{ link?: string }>(path, {
              method: mode === 'edit' ? 'PATCH' : 'POST',
              body: JSON.stringify(payload),
            });
            if (result.link) setInviteLink(result.link);
            setMode(null);
            setSelected(null);
            await ctx.refresh();
            ctx.notify(mode === 'invite' ? 'Đã tạo liên kết mời.' : 'Đã cập nhật thành viên.');
          }}
        />
      </Modal>
      <Modal open={!!inviteLink} onClose={() => setInviteLink('')} title="Liên kết mời đã sẵn sàng">
        <div className="share-content">
          <Copy size={36} />
          <p>
            Sao chép và gửi liên kết này cho người được mời. Họ cần đăng nhập bằng đúng email nhận
            lời mời.
          </p>
          <code className="break-word">{inviteLink}</code>
          <CopyButton value={inviteLink} label="Sao chép lời mời" />
        </div>
      </Modal>
    </>
  );
}
export function SettingsView({ ctx }: { ctx: DashboardContext }) {
  const fund = ctx.fund!;
  const [tab, setTab] = useState('fund');
  const canManage = ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r));
  const members = useQuery({
    queryKey: ['members', ctx.groupId],
    queryFn: () => api<MemberInfo[]>(`/api/groups/${ctx.groupId}/members`),
  });
  const me = members.data?.find((m) => m.userId === ctx.user.id);
  const categories = useQuery({
    queryKey: ['categories', fund.id],
    queryFn: () =>
      api<{ id: string; name: string; type: string }[]>(`/api/funds/${fund.id}/categories`),
  });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const submit = async (v: Record<string, string | boolean>) => {
    await api(`/api/funds/${fund.id}`, { method: 'PATCH', body: JSON.stringify(v) });
    await ctx.refresh();
    ctx.notify('Đã lưu cài đặt quỹ.');
  };
  return (
    <>
      <nav className="local-tabs">
        {[
          { id: 'fund', title: 'Thông tin quỹ' },
          { id: 'privacy', title: 'Công khai & riêng tư' },
          { id: 'bank', title: 'Tài khoản nhận tiền' },
          { id: 'profile', title: 'Hồ sơ của tôi' },
          { id: 'categories', title: 'Danh mục' },
        ].map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.title}
          </button>
        ))}
      </nav>
      <section className="panel settings-panel">
        {!canManage && tab !== 'profile' ? (
          <Empty title="Chỉ người quản lý được thay đổi cài đặt quỹ" />
        ) : tab === 'fund' ? (
          <>
            <div className="panel-heading">
              <div>
                <h3>Thông tin quỹ</h3>
                <p>Giúp các thành viên hiểu rõ mục tiêu chung.</p>
              </div>
              <WalletCards size={23} />
            </div>
            <DataForm
              key={fund.id}
              fields={fundFields.filter(
                (f) => ctx.roles.includes('OWNER') || f.name !== 'dualControl',
              )}
              defaults={fund as unknown as Record<string, unknown>}
              onSubmit={submit}
            />
          </>
        ) : tab === 'privacy' ? (
          <>
            <div className="panel-heading">
              <div>
                <h3>Minh bạch có lựa chọn</h3>
                <p>Chỉ công khai những thông tin bạn có quyền chia sẻ.</p>
              </div>
              <Globe size={23} />
            </div>
            <DataForm
              fields={[
                fundFields.find((f) => f.name === 'visibility')!,
                {
                  name: 'showSummary',
                  label: 'Công khai số dư và số liệu tổng hợp',
                  type: 'checkbox',
                  hint: 'Tổng hợp gồm toàn bộ giao dịch đã ghi sổ, kể cả giao dịch không công khai chi tiết.',
                },
                {
                  name: 'showContributors',
                  label: 'Hiển thị người đóng góp công khai',
                  type: 'checkbox',
                  hint: 'Thành viên chưa đồng ý công khai tên luôn hiển thị ẩn danh. Không hiển thị khoản còn nợ.',
                },
                {
                  name: 'allowExport',
                  label: 'Cho phép tải CSV, Excel và PDF công khai',
                  type: 'checkbox',
                },
                {
                  name: 'allowIndex',
                  label: 'Cho phép công cụ tìm kiếm lập chỉ mục',
                  type: 'checkbox',
                  hint: 'Chỉ áp dụng quỹ Public; quỹ Unlisted vẫn không được lập chỉ mục.',
                },
                { name: 'publicManager', label: 'Tên người phụ trách được phép công khai' },
                { name: 'active', label: 'Quỹ đang hoạt động', type: 'checkbox' },
              ]}
              defaults={fund as unknown as Record<string, unknown>}
              onSubmit={submit}
            />
            <p className="info-message">
              Unlisted chỉ ẩn quỹ khỏi danh sách; bất kỳ ai có đường dẫn vẫn truy cập được.
            </p>
          </>
        ) : tab === 'bank' ? (
          <>
            <div className="panel-heading">
              <div>
                <h3>Tài khoản nhận đóng góp</h3>
                <p>Thông tin này chỉ được hiển thị khi chủ tài khoản đã đồng ý.</p>
              </div>
              <ShieldCheck size={23} />
            </div>
            <DataForm
              fields={[
                {
                  name: 'bankName',
                  label: 'Tên ngân hàng',
                  required: true,
                  placeholder: 'Vietcombank',
                },
                {
                  name: 'bankBin',
                  label: 'Mã BIN ngân hàng',
                  required: true,
                  placeholder: '970436',
                  hint: 'Mã 6 chữ số dùng để tạo VietQR.',
                },
                { name: 'bankAccount', label: 'Số tài khoản', required: true },
                { name: 'bankHolder', label: 'Tên chủ tài khoản', required: true },
                {
                  name: 'bankPublicConsent',
                  label: 'Tôi có quyền và đồng ý công khai thông tin nhận tiền này',
                  type: 'checkbox',
                  hint: 'Người xem có thể dùng thông tin này để tạo VietQR qua img.vietqr.io.',
                },
              ]}
              defaults={fund as unknown as Record<string, unknown>}
              onSubmit={submit}
            />
            <div className="info-message">
              QR chỉ hướng dẫn chuyển khoản. Không xác nhận thanh toán trước khi có bằng chứng nhận
              tiền và đối soát.
            </div>
          </>
        ) : tab === 'profile' ? (
          <>
            <div className="panel-heading">
              <div>
                <h3>Thông tin cá nhân & quyền riêng tư</h3>
                <p>Bạn quyết định tên nào xuất hiện khi đóng góp.</p>
              </div>
              <UserRound size={23} />
            </div>
            <DataForm
              fields={[{ name: 'name', label: 'Họ tên', required: true }]}
              defaults={{ name: ctx.user.name }}
              onSubmit={async (v) => {
                await api('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(v) });
                ctx.notify('Đã cập nhật họ tên. Tải lại trang để cập nhật thanh điều hướng.');
              }}
            />
            {me && (
              <DataForm
                fields={[
                  { name: 'publicName', label: 'Tên công khai hoặc biệt danh', required: true },
                  {
                    name: 'publicConsent',
                    label: 'Tôi đồng ý hiển thị tên này trong danh sách đóng góp công khai',
                    type: 'checkbox',
                  },
                ]}
                defaults={{ publicName: me.publicName, publicConsent: me.publicConsent }}
                onSubmit={async (v) => {
                  await api(`/api/groups/${ctx.groupId}/members/${me.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(v),
                  });
                  await ctx.refresh();
                  ctx.notify('Đã lưu lựa chọn riêng tư.');
                }}
              />
            )}
          </>
        ) : (
          <>
            <div className="panel-heading">
              <div>
                <h3>Danh mục thu chi</h3>
                <p>Phân loại dòng tiền để báo cáo rõ ràng.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setCategoryOpen(true)}>
                <Plus size={16} />
                Thêm danh mục
              </button>
            </div>
            <div className="category-settings">
              {categories.data?.map((c) => (
                <div key={c.id}>
                  <strong>{c.name}</strong>
                  <Badge tone={c.type === 'INCOME' ? 'green' : 'neutral'}>
                    {c.type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <Modal open={categoryOpen} onClose={() => setCategoryOpen(false)} title="Thêm danh mục">
        <DataForm
          fields={[
            { name: 'name', label: 'Tên danh mục', required: true },
            {
              name: 'type',
              label: 'Loại',
              type: 'select',
              options: [
                { value: 'INCOME', label: 'Khoản thu' },
                { value: 'EXPENSE', label: 'Khoản chi' },
              ],
            },
          ]}
          onSubmit={async (v) => {
            await api(`/api/funds/${fund.id}/categories`, {
              method: 'POST',
              body: JSON.stringify(v),
            });
            setCategoryOpen(false);
            await ctx.refresh();
            ctx.notify('Đã thêm danh mục.');
          }}
        />
      </Modal>
    </>
  );
}
