'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  HandCoins,
  CalendarDays,
  ArrowUpRight,
  Upload,
  FileText,
  ShieldCheck,
  Link2,
  Settings,
  Info,
  Users,
  Server,
} from 'lucide-react';
import {
  api,
  type PeriodInfo,
  type MemberInfo,
  type TransactionRow,
  type Page,
  type Stats,
  today,
} from '@/lib/client';
import { vnd, dateLabel } from '@/lib/money';
import {
  DataForm,
  Modal,
  Empty,
  ErrorBox,
  Loading,
  Status,
  Badge,
  ExportButtons,
  MoneyStats,
  Pager,
  type Field,
} from './ui';
import { FlowChart, ExpenseChart, BalanceChart, ContributionChart } from './charts';
import type { DashboardContext } from './dashboard';

export function ContributionsView({ ctx }: { ctx: DashboardContext }) {
  const fund = ctx.fund!;
  const periods = useQuery({
    queryKey: ['periods', fund.id],
    queryFn: () => api<PeriodInfo[]>(`/api/periods?fundId=${fund.id}`),
  });
  const members = useQuery({
    queryKey: ['members', ctx.groupId],
    queryFn: () => api<MemberInfo[]>(`/api/groups/${ctx.groupId}/members`),
  });
  const canWrite = ctx.roles.some((r) => ['OWNER', 'MANAGER', 'TREASURER'].includes(r));
  const canManage = ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r));
  const requests = useQuery({
    queryKey: ['contribution-requests', fund.id],
    queryFn: () =>
      api<
        {
          id: string;
          reference: string;
          publicName: string;
          amount: string;
          status: string;
          createdAt: string;
        }[]
      >(`/api/contribution-requests?fundId=${fund.id}`),
    enabled: canWrite,
  });
  const receipts = useQuery({
    queryKey: ['receipts', fund.id],
    queryFn: () =>
      api<Page<TransactionRow>>(
        `/api/transactions?fundId=${fund.id}&type=INCOME&status=POSTED&pageSize=100`,
      ),
    enabled: canWrite,
  });
  const [createOpen, setCreateOpen] = useState(false),
    [period, setPeriod] = useState<PeriodInfo | null>(null),
    [action, setAction] = useState<{
      type: string;
      dueId?: string;
      requestId?: string;
      periodId?: string;
    } | null>(null);
  const allDues = periods.data?.flatMap((p) => p.dues) ?? [];
  const required = allDues.reduce((s, d) => s + BigInt(d.summary.required), 0n),
    paid = allDues.reduce((s, d) => s + BigInt(d.summary.paid), 0n),
    remaining = allDues.reduce((s, d) => s + BigInt(d.summary.remaining), 0n),
    overpaid = allDues.reduce((s, d) => s + BigInt(d.summary.overpaid), 0n);
  return (
    <>
      <div className="compact-stats">
        {[
          { label: 'Nghĩa vụ phải đóng', value: required },
          { label: 'Thực nhận đã phân bổ', value: paid },
          { label: 'Còn phải đóng', value: remaining },
          { label: 'Đóng dư đã phân bổ', value: overpaid },
        ].map((s) => (
          <div className="panel" key={s.label}>
            <span>{s.label}</span>
            <strong>{vnd(s.value)}</strong>
          </div>
        ))}
      </div>
      <div className="section-bar">
        <div>
          <h2>Các kỳ đóng quỹ</h2>
          <p className="muted">Khoản chưa đóng không được tính vào tiền đã thu.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Tạo kỳ đóng
          </button>
        )}
      </div>
      {periods.isPending ? (
        <Loading />
      ) : periods.error ? (
        <ErrorBox message={periods.error.message} />
      ) : periods.data?.length ? (
        <div className="period-grid">
          {periods.data.map((p) => {
            const due = p.dues.reduce((s, d) => s + BigInt(d.summary.required), 0n),
              received = p.dues.reduce((s, d) => s + BigInt(d.summary.paid), 0n),
              progress = due > 0n ? Math.min(100, Number((received * 100n) / due)) : 100;
            return (
              <button className="panel period-card" key={p.id} onClick={() => setPeriod(p)}>
                <div>
                  <span className="management-icon">
                    <HandCoins size={24} />
                  </span>
                  <Badge tone={progress === 100 ? 'green' : 'amber'}>
                    {p.closed ? 'Đã khóa kỳ' : progress === 100 ? 'Hoàn thành' : 'Đang thu'}
                  </Badge>
                </div>
                <h3>{p.name}</h3>
                <p>
                  <CalendarDays size={14} /> Hạn đóng: {dateLabel(p.dueAt)}
                </p>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="period-amounts">
                  <b>{vnd(received)}</b>
                  <small>/ {vnd(due)}</small>
                </div>
                <span className="text-link">
                  {p.dues.length} thành viên · Xem chi tiết <ArrowUpRight size={15} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Chưa có kỳ đóng quỹ"
          description="Tạo kỳ đóng để phân biệt nghĩa vụ, số tiền thực nhận và khoản còn phải thu."
        />
      )}
      {canWrite && (
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <div>
              <h3>Yêu cầu đóng góp qua QR</h3>
              <p>Chỉ xác nhận sau khi tiền đã được nhận, ghi sổ và đối soát.</p>
            </div>
          </div>
          {requests.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tham chiếu</th>
                    <th>Người đóng góp</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {requests.data.map((r) => (
                    <tr key={r.id}>
                      <td>{r.reference}</td>
                      <td>{r.publicName || 'Ẩn danh'}</td>
                      <td className="amount">{vnd(r.amount)}</td>
                      <td>
                        <Status status={r.status} />
                      </td>
                      <td>
                        {r.status === 'PENDING' && (
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={() => setAction({ type: 'confirm', requestId: r.id })}
                          >
                            Xác nhận đối soát
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Chưa có yêu cầu đóng góp qua QR" />
          )}
        </section>
      )}
      {periods.data && <ContributionChart periods={periods.data} />}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo kỳ đóng quỹ">
        <DataForm
          fields={[
            {
              name: 'name',
              label: 'Tên kỳ đóng',
              required: true,
              placeholder: 'Đóng quỹ tháng 11/2026',
            },
            {
              name: 'frequency',
              label: 'Chu kỳ',
              type: 'select',
              options: [
                { value: 'MONTHLY', label: 'Hàng tháng' },
                { value: 'QUARTERLY', label: 'Hàng quý' },
                { value: 'ANNUAL', label: 'Hàng năm' },
                { value: 'CAMPAIGN', label: 'Chiến dịch' },
                { value: 'EVENT', label: 'Sự kiện' },
              ],
            },
            {
              name: 'startAt',
              label: 'Ngày bắt đầu',
              type: 'date',
              required: true,
              defaultValue: today(),
            },
            {
              name: 'dueAt',
              label: 'Hạn đóng',
              type: 'date',
              required: true,
              defaultValue: today(),
            },
            {
              name: 'standardAmount',
              label: 'Mức đóng mỗi thành viên (VND)',
              type: 'number',
              required: true,
              min: 1,
            },
            ...(members.data ?? [])
              .filter((member) => member.active)
              .map((member) => ({
                name: `member_${member.id}`,
                label: `Áp dụng: ${member.user.name}`,
                type: 'checkbox' as const,
                defaultValue: true,
              })),
          ]}
          onSubmit={async (values) => {
            await api('/api/periods', {
              method: 'POST',
              body: JSON.stringify({
                ...values,
                fundId: fund.id,
                memberIds: members.data
                  ?.filter((m) => m.active && values[`member_${m.id}`])
                  .map((m) => m.id),
                startAt: `${values.startAt}T00:00:00+07:00`,
                dueAt: `${values.dueAt}T23:59:59+07:00`,
              }),
            });
            setCreateOpen(false);
            await ctx.refresh();
            ctx.notify('Đã tạo kỳ đóng cho các thành viên đang hoạt động.');
          }}
        >
          <p className="info-message">
            Áp dụng cho {members.data?.filter((m) => m.active).length ?? 0} thành viên đang hoạt
            động. Có thể miễn/giảm riêng trong chi tiết kỳ.
          </p>
        </DataForm>
      </Modal>
      <Modal
        open={!!period}
        onClose={() => setPeriod(null)}
        title={period?.name || 'Chi tiết kỳ đóng'}
        description="Số thực nhận chỉ gồm phân bổ từ khoản thu đã ghi sổ; khoản đã hoàn tiền được loại khỏi số đã đóng."
      >
        {period && ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r)) && (
          <DataForm
            key={period.id}
            fields={[
              {
                name: 'closed',
                label: 'Khóa kỳ đóng quỹ',
                type: 'checkbox',
                hint: 'Dừng nhắc hạn, miễn giảm và phân bổ mới. Có thể mở lại khi cần.',
              },
            ]}
            defaults={{ closed: periods.data?.find((p) => p.id === period.id)?.closed ?? false }}
            onSubmit={async (v) => {
              await api(`/api/periods/${period.id}`, { method: 'PATCH', body: JSON.stringify(v) });
              await ctx.refresh();
              ctx.notify('Đã cập nhật trạng thái kỳ đóng.');
            }}
          />
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Phải đóng</th>
                <th>Đã đóng</th>
                <th>Còn lại</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {(periods.data?.find((p) => p.id === period?.id)?.dues ?? []).map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{vnd(d.summary.required)}</td>
                  <td className="text-green">{vnd(d.summary.paid)}</td>
                  <td>{vnd(d.summary.remaining)}</td>
                  {canWrite && (
                    <td>
                      <div className="button-row">
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => setAction({ type: 'allocate', dueId: d.id })}
                        >
                          Phân bổ
                        </button>
                        <button
                          className="btn btn-small btn-text"
                          onClick={() =>
                            setAction({ type: 'adjust', dueId: d.id, periodId: period!.id })
                          }
                        >
                          Miễn / giảm
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action?.type === 'adjust'
            ? 'Điều chỉnh nghĩa vụ đóng'
            : action?.type === 'confirm'
              ? 'Xác nhận đóng góp đã đối soát'
              : 'Phân bổ tiền thực nhận'
        }
      >
        <DataForm
          key={action?.type}
          fields={
            action?.type === 'adjust'
              ? [
                  {
                    name: 'amount',
                    label: 'Số tiền điều chỉnh (âm để miễn/giảm)',
                    type: 'number',
                    required: true,
                  },
                  { name: 'reason', label: 'Lý do điều chỉnh', type: 'textarea', required: true },
                ]
              : [
                  {
                    name: 'transactionId',
                    label: 'Khoản thu đã ghi sổ',
                    type: 'select',
                    required: true,
                    options: [
                      { value: '', label: 'Chọn khoản thu' },
                      ...(receipts.data?.items ?? []).map((t) => ({
                        value: t.id,
                        label: `${t.code} · ${vnd(t.amount)} · ${t.description}`,
                      })),
                    ],
                  },
                  ...(action?.type === 'allocate'
                    ? [
                        {
                          name: 'amount',
                          label: 'Số tiền phân bổ (VND)',
                          type: 'number' as const,
                          required: true,
                          min: 1,
                        },
                      ]
                    : []),
                ]
          }
          onSubmit={async (v) => {
            if (action!.type === 'adjust')
              await api(`/api/periods/${action!.periodId}/adjustments`, {
                method: 'POST',
                body: JSON.stringify({ ...v, dueId: action!.dueId }),
              });
            else if (action!.type === 'confirm')
              await api(`/api/contribution-requests/${action!.requestId}/confirm`, {
                method: 'POST',
                body: JSON.stringify(v),
              });
            else
              await api('/api/contributions', {
                method: 'POST',
                body: JSON.stringify({ ...v, dueId: action!.dueId }),
              });
            setAction(null);
            await ctx.refresh();
            ctx.notify('Đã ghi nhận cập nhật đóng góp.');
          }}
        />
      </Modal>
    </>
  );
}
interface BankRow {
  id: string;
  reference: string;
  description: string;
  amount: string;
  occurredAt: string;
  reconciliation: { id: string } | null;
  suggestions: { id: string; code: string; description: string; amount: string }[];
}
interface BankData {
  bank: BankRow[];
  transactions: { id: string; code: string; description: string; amount: string }[];
}
interface Preview {
  headers: string[];
  rows: string[][];
  filename: string;
}
export function ReconciliationView({ ctx }: { ctx: DashboardContext }) {
  const fund = ctx.fund!;
  const [upload, setUpload] = useState(false),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [match, setMatch] = useState<BankRow | null>(null);
  const query = useQuery({
    queryKey: ['reconciliation', fund.id],
    queryFn: () => api<BankData>(`/api/reconciliations?fundId=${fund.id}`),
  });
  const mappingFields: Field[] = [
    { name: 'date', label: 'Cột ngày' },
    { name: 'description', label: 'Cột nội dung' },
    { name: 'amount', label: 'Cột số tiền (âm = chi)' },
    { name: 'reference', label: 'Cột mã giao dịch' },
  ].map((f, i) => ({
    ...f,
    type: 'select',
    required: true,
    defaultValue: String(Math.min(i, (preview?.headers.length ?? 1) - 1)),
    options: preview?.headers.map((h, index) => ({ value: String(index), label: h })),
  }));
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Đối chiếu với ngân hàng</h2>
          <p className="muted">Nhập sao kê, kiểm tra chênh lệch và xác nhận từng giao dịch.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setUpload(true)}>
          <Upload size={16} />
          Nhập sao kê
        </button>
      </div>
      <div className="info-message">
        <Info size={18} />
        Dòng sao kê và webhook chưa phải khoản thu đã xác nhận. Ghi nhận, phê duyệt và ghi sổ giao
        dịch nội bộ trước khi ghép đối soát.
      </div>
      <section className="panel spaced-panel">
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorBox message={query.error.message} />
        ) : query.data?.bank.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Giao dịch ngân hàng</th>
                  <th>Ngày</th>
                  <th>Số tiền</th>
                  <th>Kết quả đối soát</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.bank.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.description}</strong>
                      <small className="table-subtitle">{b.reference}</small>
                    </td>
                    <td className="nowrap">{dateLabel(b.occurredAt)}</td>
                    <td className="amount">{vnd(b.amount)}</td>
                    <td>
                      <Badge
                        tone={b.reconciliation ? 'green' : b.suggestions.length ? 'blue' : 'amber'}
                      >
                        {b.reconciliation
                          ? 'Đã đối soát'
                          : b.suggestions.length
                            ? `${b.suggestions.length} gợi ý ghép`
                            : 'Chưa tìm thấy giao dịch'}
                      </Badge>
                    </td>
                    <td>
                      {!b.reconciliation && (
                        <button className="btn btn-small btn-secondary" onClick={() => setMatch(b)}>
                          <Link2 size={14} />
                          Đối soát
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có sao kê ngân hàng"
            description="Tải CSV hoặc Excel để bắt đầu kiểm tra thu chi."
          />
        )}
      </section>
      <Modal
        open={upload}
        onClose={() => {
          setUpload(false);
          setPreview(null);
          setError('');
        }}
        title="Nhập sao kê ngân hàng"
        description="CSV hoặc XLSX, tối đa 5 MiB và 1.000 dòng. Xem trước và ánh xạ cột trước khi nhập."
      >
        {!preview ? (
          <div className="upload-zone">
            <Upload size={34} />
            <h3>Chọn tệp sao kê</h3>
            <p>Các cột cần có: ngày, nội dung, số tiền có dấu, mã giao dịch.</p>
            <label className="btn btn-primary file-button">
              {busy ? 'Đang phân tích…' : 'Chọn tệp CSV / Excel'}
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError('');
                  setBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('fundId', fund.id);
                    setPreview(await api('/api/statements/preview', { method: 'POST', body: fd }));
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {error && <ErrorBox message={error} />}
          </div>
        ) : (
          <>
            <div className="info-message">
              <FileText size={18} />
              {preview.filename} · {preview.rows.length} dòng
            </div>
            <div className="table-scroll preview-table">
              <table>
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 4).map((row, i) => (
                    <tr key={i}>
                      {row.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataForm
              fields={mappingFields}
              submitLabel="Xác nhận nhập sao kê"
              onSubmit={async (v) => {
                const rows = preview.rows.map((row, i) => {
                  const raw = row[Number(v.amount)].trim().replaceAll(' ', '');
                  if (!/^-?\d+$/.test(raw))
                    throw new Error(
                      `Dòng ${i + 2}: số tiền phải là VND nguyên, không dấu phân cách. Ví dụ -120000.`,
                    );
                  let occurredAt = row[Number(v.date)];
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(occurredAt)) {
                    const [day, month, year] = occurredAt.split('/');
                    occurredAt = `${year}-${month}-${day}`;
                  }
                  if (!/^\d{4}-\d{2}-\d{2}/.test(occurredAt))
                    throw new Error(`Dòng ${i + 2}: ngày phải là YYYY-MM-DD hoặc DD/MM/YYYY.`);
                  return {
                    amount: raw,
                    description: row[Number(v.description)],
                    reference: row[Number(v.reference)],
                    occurredAt: `${occurredAt.slice(0, 10)}T12:00:00+07:00`,
                  };
                });
                const result = await api<{ inserted: number; duplicates: number }>(
                  '/api/statements/import',
                  {
                    method: 'POST',
                    body: JSON.stringify({ fundId: fund.id, filename: preview.filename, rows }),
                  },
                );
                setUpload(false);
                setPreview(null);
                await ctx.refresh();
                ctx.notify(
                  `Đã nhập ${result.inserted} dòng mới; bỏ qua ${result.duplicates} dòng trùng.`,
                );
              }}
            />
          </>
        )}
      </Modal>
      <Modal
        open={!!match}
        onClose={() => setMatch(null)}
        title="Xác nhận đối soát"
        description={match ? `${match.description} · ${vnd(match.amount)}` : ''}
      >
        <DataForm
          fields={[
            {
              name: 'transactionId',
              label: 'Giao dịch nội bộ',
              type: 'select',
              required: true,
              options: [
                { value: '', label: 'Chọn giao dịch cùng số tiền và chiều tiền' },
                ...(query.data?.transactions ?? []).map((t) => ({
                  value: t.id,
                  label: `${match?.suggestions.some((s) => s.id === t.id) ? '✓ Gợi ý · ' : ''}${t.code} · ${vnd(t.amount)} · ${t.description}`,
                })),
              ],
            },
            { name: 'note', label: 'Ghi chú đối soát', type: 'textarea' },
          ]}
          submitLabel="Xác nhận đã khớp"
          onSubmit={async (v) => {
            await api('/api/reconciliations', {
              method: 'POST',
              body: JSON.stringify({ ...v, bankTransactionId: match!.id }),
            });
            setMatch(null);
            await ctx.refresh();
            ctx.notify('Đã xác nhận đối soát.');
          }}
        />
        <p className="small muted">
          Nếu số tiền lệch, hãy kiểm tra nguồn dữ liệu hoặc tạo bút toán điều chỉnh. Không sửa giao
          dịch đã ghi sổ để ép khớp.
        </p>
      </Modal>
    </>
  );
}
export function ReportsView({ ctx }: { ctx: DashboardContext }) {
  const fund = ctx.fund!;
  const [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const query = useQuery({
    queryKey: ['reports', fund.id, from, to],
    queryFn: () =>
      api<{ statistics: Stats }>(`/api/reports?fundId=${fund.id}&from=${from}&to=${to}`),
  });
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Báo cáo tài chính</h2>
          <p className="muted">Số dư đầu kỳ + dòng tiền trong kỳ = số dư cuối kỳ.</p>
        </div>
        <div className="date-controls">
          <label>
            Từ{' '}
            <input
              aria-label="Báo cáo từ ngày"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Đến{' '}
            <input
              aria-label="Báo cáo đến ngày"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <ExportButtons base={`/api/reports?fundId=${fund.id}&from=${from}&to=${to}`} />
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        query.data && (
          <>
            <MoneyStats
              stats={query.data.statistics}
              period={from || to ? 'Khoảng ngày đã chọn' : 'Toàn bộ thời gian'}
            />
            <div className="charts-grid">
              <FlowChart stats={query.data.statistics} />
              <ExpenseChart stats={query.data.statistics} />
            </div>
            <BalanceChart stats={query.data.statistics} />
            <div className="report-summary panel">
              <h3>Đối chiếu sổ quỹ</h3>
              <div>
                <span>
                  Số dư đầu kỳ<strong>{vnd(query.data.statistics.opening)}</strong>
                </span>
                <span>
                  Tiền vào − tiền ra
                  <strong>
                    {vnd(
                      BigInt(query.data.statistics.income) - BigInt(query.data.statistics.expense),
                    )}
                  </strong>
                </span>
                <span>
                  Chuyển quỹ ròng<strong>{vnd(query.data.statistics.transfers)}</strong>
                </span>
                <span>
                  Bổ sung đầu kỳ<strong>{vnd(query.data.statistics.openingAdded)}</strong>
                </span>
                <span>
                  Số dư cuối kỳ<strong>{vnd(query.data.statistics.closing)}</strong>
                </span>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  reviewed: boolean;
  createdAt: string;
  transactionId: string | null;
}
export function DocumentsView({ ctx }: { ctx: DashboardContext }) {
  const fund = ctx.fund!;
  const query = useQuery({
    queryKey: ['attachments', fund.id],
    queryFn: () => api<Attachment[]>(`/api/attachments?fundId=${fund.id}`),
  });
  const [selected, setSelected] = useState<Attachment | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const canWrite = ctx.roles.some((r) => ['OWNER', 'MANAGER', 'TREASURER'].includes(r));
  const canManage = ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r));
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Thư viện chứng từ</h2>
          <p className="muted">Lưu trữ chứng cứ và chủ động quyết định quyền chia sẻ.</p>
        </div>
        {canWrite && (
          <label className="btn btn-primary file-button">
            <Upload size={16} />
            {busy ? 'Đang tải…' : 'Tải chứng từ'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError('');
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('fundId', fund.id);
                  await api('/api/attachments', { method: 'POST', body: fd });
                  await ctx.refresh();
                  ctx.notify('Đã lưu chứng từ nội bộ.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}
      </div>
      {error && <ErrorBox message={error} />}
      <div className="info-message">
        <ShieldCheck size={18} />
        Tệp mới luôn ở chế độ nội bộ. Chỉ công khai bản đã che thông tin cá nhân. Đính kèm cho giao
        dịch cụ thể trong cửa sổ chi tiết giao dịch.
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : query.data?.length ? (
        <div className="document-grid">
          {query.data.map((a) => (
            <article className="panel document-card" key={a.id}>
              <div className="document-preview">
                {a.mimeType.startsWith('image/') ? (
                  <img src={`/api/attachments/${a.id}`} alt={a.originalName} loading="lazy" />
                ) : (
                  <FileText size={45} />
                )}
              </div>
              <div className="document-card-body">
                <h3>{a.originalName}</h3>
                <p>
                  {(a.size / 1024).toFixed(1)} KB · {dateLabel(a.createdAt)}
                </p>
                <Badge tone={a.isPublic && a.reviewed ? 'green' : 'neutral'}>
                  {a.isPublic && a.reviewed ? 'Được phép công khai' : 'Nội bộ'}
                </Badge>
                <div className="button-row">
                  <a
                    className="btn btn-small btn-secondary"
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowUpRight size={14} />
                    Xem tệp
                  </a>
                  {canManage && (
                    <button
                      className="icon-button"
                      onClick={() => setSelected(a)}
                      aria-label={`Quyền truy cập ${a.originalName}`}
                    >
                      <Settings size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa có chứng từ"
          description="Tải hóa đơn, biên nhận hoặc biên bản để bổ sung bằng chứng cho hoạt động quỹ."
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Quyền công khai chứng từ"
        description={selected?.originalName}
      >
        <DataForm
          fields={[
            {
              name: 'reviewed',
              label:
                'Tôi đã kiểm tra và che thông tin cá nhân, tài khoản riêng, địa chỉ và mã nhạy cảm trên chính tệp này',
              type: 'checkbox',
            },
            { name: 'isPublic', label: 'Cho phép người ngoài xem chứng từ', type: 'checkbox' },
          ]}
          defaults={selected as unknown as Record<string, unknown>}
          onSubmit={async (v) => {
            await api(`/api/attachments/${selected!.id}`, {
              method: 'PATCH',
              body: JSON.stringify(v),
            });
            setSelected(null);
            await ctx.refresh();
            ctx.notify('Đã cập nhật quyền công khai chứng từ.');
          }}
        />
        <p className="info-message">
          Chứng từ gắn giao dịch chỉ được truy cập công khai khi giao dịch đã ghi sổ và được phép
          công khai.
        </p>
      </Modal>
    </>
  );
}
export function ActivityView({ ctx }: { ctx: DashboardContext }) {
  const query = useQuery({
    queryKey: ['activities', ctx.fund!.id],
    queryFn: () =>
      api<{ id: string; title: string; content: string; isPublic: boolean; createdAt: string }[]>(
        `/api/announcements?fundId=${ctx.fund!.id}`,
      ),
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="section-bar">
        <div>
          <h2>Câu chuyện từ quỹ</h2>
          <p className="muted">Cập nhật hoạt động và kết quả sử dụng quỹ.</p>
        </div>
        {ctx.roles.some((r) => ['OWNER', 'MANAGER'].includes(r)) && (
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Đăng hoạt động
          </button>
        )}
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : query.data?.length ? (
        <div className="activities-list">
          {query.data.map((a) => (
            <article className="panel activity" key={a.id}>
              <div className="button-row">
                <Badge tone={a.isPublic ? 'green' : 'neutral'}>
                  {a.isPublic ? 'Công khai' : 'Nội bộ'}
                </Badge>
                <small>{dateLabel(a.createdAt)}</small>
              </div>
              <h2>{a.title}</h2>
              <p>{a.content}</p>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Chưa có cập nhật hoạt động" />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Cập nhật hoạt động">
        <DataForm
          fields={[
            { name: 'title', label: 'Tiêu đề', required: true, full: true },
            { name: 'content', label: 'Nội dung hoạt động', type: 'textarea', required: true },
            { name: 'isPublic', label: 'Cho phép hiển thị trên trang công khai', type: 'checkbox' },
          ]}
          submitLabel="Lưu hoạt động"
          onSubmit={async (v) => {
            await api('/api/announcements', {
              method: 'POST',
              body: JSON.stringify({ ...v, fundId: ctx.fund!.id }),
            });
            setOpen(false);
            await ctx.refresh();
            ctx.notify('Đã đăng cập nhật hoạt động.');
          }}
        />
      </Modal>
    </>
  );
}
export function AuditView({ ctx }: { ctx: DashboardContext }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['audit', ctx.groupId, page],
    queryFn: () =>
      api<
        Page<{
          id: string;
          actorId: string;
          action: string;
          entityId: string;
          details: Record<string, unknown>;
          correlationId: string;
          outcome: string;
          createdAt: string;
        }>
      >(`/api/audit-logs?groupId=${ctx.groupId}&page=${page}&pageSize=20`),
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Dấu vết kiểm toán</h3>
          <p>Nhật ký chỉ thêm mới. Không sửa hoặc xóa bằng thao tác thông thường.</p>
        </div>
        <ShieldCheck size={24} />
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox message={query.error.message} />
      ) : (
        query.data && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hành động</th>
                    <th>Người thực hiện</th>
                    <th>Chi tiết</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((log) => (
                    <tr key={log.id}>
                      <td className="nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </td>
                      <td>
                        <strong>{log.action}</strong>
                        <small className="table-subtitle">{log.entityId}</small>
                      </td>
                      <td className="small">{log.actorId || 'Hệ thống'}</td>
                      <td>
                        <details>
                          <summary>Xem dữ liệu</summary>
                          <pre className="audit-json">{JSON.stringify(log.details, null, 2)}</pre>
                          <small>{log.correlationId}</small>
                        </details>
                      </td>
                      <td>
                        <Badge tone="green">
                          {log.outcome === 'SUCCESS' ? 'Thành công' : log.outcome}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={query.data.total} pageSize={20} onChange={setPage} />
          </>
        )
      )}
    </section>
  );
}
interface AdminData {
  users: { id: string; name: string; email: string; disabled: boolean; platformAdmin: boolean }[];
  groups: number;
  funds: number;
  usersTotal: number;
  groupDirectory: { id: string; name: string; active: boolean }[];
  fundDirectory: { id: string; name: string; active: boolean }[];
  integrations: { google: boolean; bank: boolean };
  securityLogs: { id: string; action: string; actorId: string; createdAt: string }[];
}
export function AdminView() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', page],
    queryFn: () => api<AdminData>(`/api/admin?page=${page}&pageSize=20`),
  });
  const [selected, setSelected] = useState<AdminData['users'][number] | null>(null);
  const [resource, setResource] = useState<{
    kind: 'groups' | 'funds';
    id: string;
    name: string;
    active: boolean;
  } | null>(null);
  return query.isPending ? (
    <Loading />
  ) : query.error ? (
    <ErrorBox message={query.error.message} />
  ) : (
    query.data && (
      <>
        <div className="info-message">
          <ShieldCheck size={18} />
          Quản trị viên nền tảng không tự động có quyền tạo, duyệt hoặc ghi sổ giao dịch của các
          quỹ.
        </div>
        <div className="compact-stats">
          {[
            { label: 'Tài khoản', value: query.data.usersTotal },
            { label: 'Nhóm', value: query.data.groups },
            { label: 'Quỹ', value: query.data.funds },
          ].map((s) => (
            <div className="panel" key={s.label}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <div className="panel-heading">
            <h3>Quản lý tài khoản</h3>
            <Users size={22} />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {u.platformAdmin && <Badge>Platform admin</Badge>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <Badge tone={u.disabled ? 'red' : 'green'}>
                        {u.disabled ? 'Vô hiệu hóa' : 'Hoạt động'}
                      </Badge>
                    </td>
                    <td>
                      {!u.platformAdmin && (
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => setSelected(u)}
                        >
                          {u.disabled ? 'Kích hoạt' : 'Vô hiệu hóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={query.data.usersTotal} pageSize={20} onChange={setPage} />
        </section>
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <div>
              <h3>Trạng thái nhóm và quỹ</h3>
              <p>Can thiệp kỹ thuật có nhật ký, không thay đổi sổ tài chính.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[
                  ...(query.data.groupDirectory ?? []).map((r) => ({
                    ...r,
                    kind: 'groups' as const,
                  })),
                  ...(query.data.fundDirectory ?? []).map((r) => ({
                    ...r,
                    kind: 'funds' as const,
                  })),
                ].map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.kind === 'groups' ? 'Nhóm' : 'Quỹ'}</td>
                    <td>
                      <Badge tone={r.active ? 'green' : 'neutral'}>
                        {r.active ? 'Hoạt động' : 'Tạm dừng'}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => setResource(r)}
                      >
                        {r.active ? 'Tạm dừng' : 'Kích hoạt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <Modal
          open={!!resource}
          onClose={() => setResource(null)}
          title="Thay đổi trạng thái hoạt động"
          description={resource?.name}
        >
          <DataForm
            fields={[]}
            submitLabel="Xác nhận thay đổi"
            onSubmit={async () => {
              await api(`/api/admin/${resource!.kind}/${resource!.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !resource!.active }),
              });
              setResource(null);
              await query.refetch();
            }}
          >
            <p>Thao tác được lưu trong nhật ký hệ thống và không sửa hoặc xóa dữ liệu tài chính.</p>
          </DataForm>
        </Modal>
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h3>Trạng thái tích hợp</h3>
            <Server size={22} />
          </div>
          <div className="integration-status">
            <span>
              Google OAuth{' '}
              <Badge tone={query.data.integrations.google ? 'green' : 'neutral'}>
                {query.data.integrations.google ? 'Đã cấu hình' : 'Chưa cấu hình'}
              </Badge>
            </span>
            <span>
              Webhook HMAC{' '}
              <Badge tone={query.data.integrations.bank ? 'green' : 'neutral'}>
                {query.data.integrations.bank ? 'Đã cấu hình' : 'Chưa cấu hình'}
              </Badge>
            </span>
            <p>
              Credentials được cấu hình bằng biến môi trường phía máy chủ. Không nhập mật khẩu hoặc
              OTP ngân hàng vào ứng dụng.
            </p>
          </div>
        </section>
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h3>Nhật ký bảo mật hệ thống</h3>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Hành động</th>
                  <th>Người thực hiện</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {query.data.securityLogs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.action}</td>
                    <td>{l.actorId || 'Hệ thống'}</td>
                    <td>{dateLabel(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`${selected?.disabled ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản`}
          description={selected?.email}
        >
          <DataForm
            fields={[]}
            submitLabel="Xác nhận thay đổi"
            onSubmit={async () => {
              await api(`/api/admin/users/${selected!.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ disabled: !selected!.disabled }),
              });
              setSelected(null);
              await query.refetch();
            }}
          >
            <p>
              Thao tác được lưu vào nhật ký. Khi vô hiệu hóa, tất cả phiên đăng nhập của tài khoản
              sẽ bị thu hồi.
            </p>
          </DataForm>
        </Modal>
      </>
    )
  );
}
