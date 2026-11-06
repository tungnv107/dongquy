'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ArrowUpRight,
  Send,
  Check,
  Undo2,
  Upload,
  ShieldCheck,
  BookCheck,
} from 'lucide-react';
import {
  api,
  type Page,
  type TransactionRow,
  type MemberInfo,
  typeNames,
  today,
  statusNames,
} from '@/lib/client';
import { vnd, dateLabel } from '@/lib/money';
import {
  DataForm,
  Modal,
  TransactionTable,
  SearchBox,
  Pager,
  Loading,
  ErrorBox,
  Status,
  ExportButtons,
  type Field,
} from './ui';
import type { DashboardContext } from './dashboard';
export function TransactionEditor({
  ctx,
  open,
  onClose,
}: {
  ctx: DashboardContext;
  open: boolean;
  onClose: () => void;
}) {
  const fund = ctx.fund!;
  const [type, setType] = useState('INCOME');
  const key = useRef('');
  useEffect(() => {
    if (open) key.current = crypto.randomUUID();
  }, [open]);
  const categories = useQuery({
    queryKey: ['categories', fund.id],
    queryFn: () =>
      api<{ id: string; name: string; type: string }[]>(`/api/funds/${fund.id}/categories`),
    enabled: open,
  });
  const members = useQuery({
    queryKey: ['members', ctx.groupId],
    queryFn: () => api<MemberInfo[]>(`/api/groups/${ctx.groupId}/members`),
    enabled: open,
  });
  const fields: Field[] = [
    {
      name: 'amount',
      label: 'Số tiền (VND)',
      type: 'number',
      required: true,
      min: 1,
      max: 1000000000000,
      placeholder: '500000',
    },
    {
      name: 'occurredAt',
      label: 'Ngày phát sinh',
      type: 'date',
      required: true,
      defaultValue: today(),
    },
    ...(type === 'TRANSFER'
      ? [
          {
            name: 'targetFundId',
            label: 'Quỹ nhận',
            required: true,
            type: 'select' as const,
            options: [
              { value: '', label: 'Chọn quỹ nhận' },
              ...ctx.data.funds
                .filter((f) => f.id !== fund.id)
                .map((f) => ({ value: f.id, label: f.name })),
            ],
          },
        ]
      : [
          {
            name: 'categoryId',
            label: 'Danh mục',
            type: 'select' as const,
            options: [
              { value: '', label: 'Chọn danh mục (tùy chọn)' },
              ...(categories.data ?? [])
                .filter((c) => c.type === type)
                .map((c) => ({ value: c.id, label: c.name })),
            ],
          },
        ]),
    ...(type === 'INCOME'
      ? [
          {
            name: 'contributorId',
            label: 'Thành viên đóng góp',
            type: 'select' as const,
            options: [
              { value: '', label: 'Người đóng góp bên ngoài / không phân bổ' },
              ...(members.data ?? [])
                .filter((m) => m.active)
                .map((m) => ({ value: m.id, label: m.user.name })),
            ],
          },
        ]
      : type === 'EXPENSE'
        ? [{ name: 'recipient', label: 'Người nhận tiền (nội bộ)' }]
        : []),
    {
      name: 'paymentMethod',
      label: 'Phương thức',
      type: 'select',
      options: [
        { value: 'BANK', label: 'Chuyển khoản' },
        { value: 'CASH', label: 'Tiền mặt' },
        { value: 'OTHER', label: 'Khác' },
      ],
    },
    {
      name: 'bankReference',
      label: 'Mã ngân hàng / tham chiếu đóng góp',
      hint: 'Không công khai mã này.',
    },
    { name: 'description', label: 'Nội dung nội bộ', required: true, type: 'textarea' },
    {
      name: 'publicDescription',
      label: 'Nội dung được phép công khai',
      type: 'textarea',
      hint: 'Không nhập email, số điện thoại, tài khoản cá nhân hay thông tin riêng tư.',
    },
    { name: 'isPublic', label: 'Cho phép công khai giao dịch sau khi ghi sổ', type: 'checkbox' },
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi nhận giao dịch mới"
      description={`Quỹ: ${fund.name} · Giao dịch được lưu nháp và chưa ảnh hưởng số dư.`}
    >
      <div className="transaction-type-tabs">
        {['INCOME', 'EXPENSE', 'TRANSFER', 'OPENING'].map((t) => (
          <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>
            {typeNames[t]}
          </button>
        ))}
      </div>
      {type === 'OPENING' && (
        <p className="info-message">
          Sau khi lưu nháp, mở chi tiết để tải chứng từ số dư đầu kỳ trước khi gửi duyệt.
        </p>
      )}
      <DataForm
        key={type + String(open)}
        fields={fields}
        submitLabel="Lưu bản nháp"
        onSubmit={async (values) => {
          const payload = {
            ...values,
            fundId: fund.id,
            type,
            occurredAt: `${values.occurredAt}T00:00:00+07:00`,
            ...(values.categoryId ? {} : { categoryId: undefined }),
            ...(values.contributorId ? {} : { contributorId: undefined }),
          };
          await api('/api/transactions', {
            method: 'POST',
            headers: { 'Idempotency-Key': key.current },
            body: JSON.stringify(payload),
          });
          onClose();
          await ctx.refresh();
          ctx.notify('Đã lưu bản nháp. Mở chi tiết để gửi phê duyệt.');
        }}
      />
    </Modal>
  );
}
export function TransactionsView({
  ctx,
  section,
  onSelect,
}: {
  ctx: DashboardContext;
  section: string;
  onSelect: (tx: TransactionRow) => void;
}) {
  const fund = ctx.fund!;
  const [q, setQ] = useState(''),
    [type, setType] = useState(section === 'expenses' ? 'EXPENSE' : ''),
    [status, setStatus] = useState(section === 'approvals' ? 'PENDING_APPROVAL' : ''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [page, setPage] = useState(1),
    [sort, setSort] = useState('newest');
  useEffect(() => {
    setType(section === 'expenses' ? 'EXPENSE' : '');
    setStatus(section === 'approvals' ? 'PENDING_APPROVAL' : '');
    setPage(1);
  }, [section]);
  const params = new URLSearchParams({
    fundId: fund.id,
    q,
    type,
    status,
    from,
    to,
    page: String(page),
    pageSize: '12',
    sort,
  }).toString();
  const query = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api<Page<TransactionRow>>(`/api/transactions?${params}`),
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>
            {section === 'approvals'
              ? 'Hàng chờ phê duyệt'
              : section === 'expenses'
                ? 'Các khoản chi'
                : 'Sổ giao dịch'}
          </h3>
          <p>
            {section === 'approvals'
              ? 'Kiểm tra nội dung và chứng từ trước khi phê duyệt.'
              : 'Giao dịch chỉ thay đổi số dư sau khi được ghi sổ.'}
          </p>
        </div>
        <ExportButtons base={`/api/reports?${params}`} />
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
          <option value="">Tất cả loại</option>
          {Object.entries(typeNames).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Trạng thái giao dịch"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REJECTED'].map((s) => (
            <option key={s} value={s}>
              {statusNames[s]}
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
        <select
          aria-label="Sắp xếp giao dịch"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
        </select>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} retry={() => query.refetch()} />
      ) : (
        query.data && (
          <>
            <TransactionTable items={query.data.items} internal onSelect={onSelect} />
            <Pager page={page} total={query.data.total} pageSize={12} onChange={setPage} />
          </>
        )
      )}
    </section>
  );
}
interface Details extends TransactionRow {
  occurredAt: string;
  recipient: string;
  paymentMethod: string;
  bankReference: string;
  approvals: {
    id: string;
    action: string;
    reason: string;
    createdAt: string;
    user: { name: string };
  }[];
  entries: { fundId: string; account: string; amount: string }[];
}
export function InternalTransaction({
  ctx,
  selected,
  onClose,
}: {
  ctx: DashboardContext;
  selected: TransactionRow | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['transaction', selected?.id],
    queryFn: () => api<Details>(`/api/transactions/${selected!.id}`),
    enabled: !!selected,
  });
  const [action, setAction] = useState(''),
    [uploadError, setUploadError] = useState(''),
    [editing, setEditing] = useState(false);
  const canWrite = ctx.roles.some((r) => ['OWNER', 'MANAGER', 'TREASURER'].includes(r));
  const canApprove = ctx.roles.some((r) => ['OWNER', 'APPROVER'].includes(r));
  const tx = query.data;
  const close = () => {
    setAction('');
    setEditing(false);
    onClose();
  };
  return (
    <Modal
      open={!!selected}
      onClose={close}
      title="Chi tiết giao dịch"
      description={selected?.code}
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        tx && (
          <div className="transaction-detail">
            <div className="detail-top">
              <span className="detail-amount">{vnd(tx.amount)}</span>
              <Status status={tx.status!} />
            </div>
            <h3>{tx.description}</h3>
            <div className="detail-grid">
              <span>
                Loại giao dịch<strong>{typeNames[tx.type]}</strong>
              </span>
              <span>
                Ngày phát sinh<strong>{dateLabel(tx.occurredAt)}</strong>
              </span>
              <span>
                Phương thức
                <strong>
                  {tx.paymentMethod === 'BANK'
                    ? 'Chuyển khoản'
                    : tx.paymentMethod === 'CASH'
                      ? 'Tiền mặt'
                      : 'Khác'}
                </strong>
              </span>
              <span>
                Công khai<strong>{tx.isPublic ? 'Được phép' : 'Chỉ nội bộ'}</strong>
              </span>
              {tx.recipient && (
                <span>
                  Người nhận<strong>{tx.recipient}</strong>
                </span>
              )}
              {tx.bankReference && (
                <span>
                  Tham chiếu ngân hàng<strong>{tx.bankReference}</strong>
                </span>
              )}
            </div>
            {tx.isPublic && (
              <div className="info-message">
                <ShieldCheck size={17} />
                {tx.publicDescription}
              </div>
            )}
            <div className="detail-section-heading">
              <h4>Chứng từ đính kèm</h4>
              {canWrite && (
                <label className="btn btn-small btn-secondary file-button">
                  <Upload size={14} />
                  Tải chứng từ
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadError('');
                      try {
                        const form = new FormData();
                        form.append('file', file);
                        form.append('fundId', ctx.fund!.id);
                        form.append('transactionId', tx.id);
                        await api('/api/attachments', { method: 'POST', body: form });
                        await ctx.refresh();
                        ctx.notify('Đã tải chứng từ. Mặc định chỉ hiển thị nội bộ.');
                      } catch (error) {
                        setUploadError((error as Error).message);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            {uploadError && <ErrorBox message={uploadError} />}
            <div className="document-links">
              {tx.attachments?.length ? (
                tx.attachments.map((a) => (
                  <a
                    className="document-link"
                    key={a.id}
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={18} />
                    {a.originalName}
                    <span>{a.isPublic && a.reviewed ? 'Công khai' : 'Nội bộ'}</span>
                    <ArrowUpRight size={15} />
                  </a>
                ))
              ) : (
                <p className="muted small">Chưa có chứng từ.</p>
              )}
            </div>
            {tx.approvals.length > 0 && (
              <>
                <h4>Lịch sử phê duyệt</h4>
                {tx.approvals.map((a) => (
                  <div className="approval-history" key={a.id}>
                    <ShieldCheck size={18} />
                    <div>
                      <b>
                        {a.user.name} · {a.action === 'APPROVE' ? 'Đã duyệt' : 'Từ chối'}
                      </b>
                      <small>
                        {dateLabel(a.createdAt)}
                        {a.reason && ' · ' + a.reason}
                      </small>
                    </div>
                  </div>
                ))}
              </>
            )}
            {tx.status === 'POSTED' && (
              <>
                <h4>Sổ bút toán</h4>
                <div className="ledger-entries">
                  {tx.entries.map((e, i) => (
                    <div key={i}>
                      <span>
                        {e.account === 'CASH' ? 'Tiền quỹ' : 'Tài khoản đối ứng'}
                        {e.fundId !== ctx.fund!.id ? ' (quỹ liên quan)' : ''}
                      </span>
                      <b>{vnd(e.amount)}</b>
                    </div>
                  ))}
                </div>
                <p className="small muted">
                  Giao dịch đã ghi sổ không được sửa hoặc xóa. Sai sót được xử lý bằng bút toán đảo
                  có phê duyệt.
                </p>
              </>
            )}
            <div className="transaction-actions">
              {tx.status === 'DRAFT' && canWrite && (
                <>
                  <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
                    Sửa nội dung
                  </button>
                  <button className="btn btn-primary" onClick={() => setAction('submit')}>
                    <Send size={16} />
                    Gửi phê duyệt
                  </button>
                </>
              )}
              {tx.status === 'PENDING_APPROVAL' && canApprove && (
                <>
                  <button
                    className="btn btn-secondary btn-danger"
                    onClick={() => setAction('reject')}
                  >
                    Từ chối
                  </button>
                  <button className="btn btn-primary" onClick={() => setAction('approve')}>
                    <Check size={16} />
                    Phê duyệt
                  </button>
                </>
              )}
              {tx.status === 'APPROVED' && canWrite && (
                <button className="btn btn-primary" onClick={() => setAction('post')}>
                  <BookCheck size={16} />
                  Ghi sổ
                </button>
              )}
              {tx.status === 'POSTED' && tx.type !== 'REVERSAL' && canWrite && (
                <button className="btn btn-secondary" onClick={() => setAction('reverse')}>
                  <Undo2 size={16} />
                  Hoàn tiền / đảo giao dịch
                </button>
              )}
            </div>
            {editing && (
              <DataForm
                fields={[
                  {
                    name: 'description',
                    label: 'Nội dung nội bộ',
                    required: true,
                    type: 'textarea',
                  },
                  { name: 'publicDescription', label: 'Nội dung công khai', type: 'textarea' },
                  { name: 'isPublic', label: 'Cho phép công khai sau ghi sổ', type: 'checkbox' },
                ]}
                defaults={tx as unknown as Record<string, unknown>}
                onSubmit={async (v) => {
                  await api(`/api/transactions/${tx.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(v),
                  });
                  setEditing(false);
                  await ctx.refresh();
                  ctx.notify('Đã cập nhật bản nháp.');
                }}
              />
            )}
            {action && (
              <div className="confirm-box">
                <h4>
                  Xác nhận{' '}
                  {action === 'submit'
                    ? 'gửi phê duyệt'
                    : action === 'approve'
                      ? 'phê duyệt'
                      : action === 'post'
                        ? 'ghi sổ'
                        : action === 'reject'
                          ? 'từ chối'
                          : 'tạo giao dịch đảo'}
                  ?
                </h4>
                <p>
                  {action === 'post'
                    ? 'Thao tác này cập nhật số dư quỹ và khóa giao dịch vĩnh viễn.'
                    : action === 'reverse'
                      ? 'Hệ thống tạo bản nháp đảo toàn bộ số tiền. Bản nháp cần được duyệt và ghi sổ trước khi thay đổi số dư.'
                      : 'Hành động sẽ được ghi vào nhật ký kiểm toán.'}
                </p>
                <DataForm
                  key={action}
                  fields={
                    action === 'reject' || action === 'reverse'
                      ? [{ name: 'reason', label: 'Lý do', type: 'textarea', required: true }]
                      : []
                  }
                  submitLabel="Xác nhận"
                  onSubmit={async (v) => {
                    await api(`/api/transactions/${tx.id}/${action}`, {
                      method: 'POST',
                      headers: { 'Idempotency-Key': crypto.randomUUID() },
                      body: JSON.stringify(v),
                    });
                    setAction('');
                    await ctx.refresh();
                    ctx.notify(
                      action === 'reverse'
                        ? 'Đã tạo bản nháp đảo. Vào sổ giao dịch để gửi duyệt.'
                        : 'Đã cập nhật trạng thái giao dịch.',
                    );
                  }}
                />
                <button className="btn btn-text" onClick={() => setAction('')}>
                  Hủy thao tác
                </button>
              </div>
            )}
          </div>
        )
      )}
    </Modal>
  );
}
