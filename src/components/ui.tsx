'use client';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import {
  X,
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Sun,
  Moon,
  Inbox,
  LoaderCircle,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './providers';
import { vnd, dateLabel } from '@/lib/money';
import { statusNames, typeNames, type TransactionRow, type Stats } from '@/lib/client';

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link
      className={`brand ${small ? 'brand-small' : ''}`}
      href="/"
      aria-label="Đồng Quỹ — Trang chủ"
    >
      <span className="brand-icon">
        <WalletCards size={23} />
      </span>
      <span>
        đồng<span className="brand-accent">quỹ</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function ThemeButton() {
  const { dark, toggle } = useTheme();
  return (
    <button
      className="icon-button"
      onClick={toggle}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === 'POSTED' || status === 'CONFIRMED'
          ? 'green'
          : status === 'REJECTED'
            ? 'red'
            : status === 'PENDING_APPROVAL'
              ? 'amber'
              : status === 'APPROVED'
                ? 'blue'
                : 'neutral'
      }
    >
      {statusNames[status] || status}
    </Badge>
  );
}
export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>Đang tải dữ liệu mới nhất…</span>
    </div>
  );
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <span>{message}</span>
      {retry && (
        <button className="btn btn-small btn-secondary" onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || 'Điền thông tin và kiểm tra trước khi xác nhận.'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Đóng">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  full?: boolean;
}
export function DataForm({
  fields,
  onSubmit,
  submitLabel = 'Lưu thông tin',
  defaults = {},
  children,
}: {
  fields: Field[];
  onSubmit: (values: Record<string, string | boolean>) => Promise<void>;
  submitLabel?: string;
  defaults?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string | boolean>>({
    defaultValues: Object.fromEntries(
      fields.map((f) => {
        const value =
          defaults[f.name] ??
          f.defaultValue ??
          (f.type === 'checkbox'
            ? false
            : f.type === 'select'
              ? (f.options?.[0]?.value ?? '')
              : '');
        return [
          f.name,
          f.type === 'checkbox'
            ? Boolean(value)
            : f.type === 'date'
              ? String(value).slice(0, 10)
              : String(value),
        ];
      }),
    ),
  });
  const [error, setError] = useState('');
  return (
    <form
      className="data-form"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          await onSubmit(values);
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <label
            key={f.name}
            className={`field ${f.full || f.type === 'textarea' || f.type === 'checkbox' ? 'field-full' : ''} ${f.type === 'checkbox' ? 'checkbox-field' : ''}`}
          >
            {f.type === 'checkbox' ? (
              <>
                <input type="checkbox" {...register(f.name)} />
                <span>
                  {f.label}
                  {f.hint && <small>{f.hint}</small>}
                </span>
              </>
            ) : (
              <>
                <span>
                  {f.label}
                  {f.required && <b className="required"> *</b>}
                </span>
                {f.type === 'select' ? (
                  <select {...register(f.name)} required={f.required}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    {...register(f.name)}
                    rows={3}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                ) : (
                  <input
                    {...register(f.name)}
                    type={f.type || 'text'}
                    placeholder={f.placeholder}
                    required={f.required}
                    min={f.min}
                    max={f.max}
                    minLength={f.type === 'password' ? 12 : undefined}
                    autoComplete={
                      f.type === 'password'
                        ? 'new-password'
                        : f.type === 'email'
                          ? 'email'
                          : undefined
                    }
                  />
                )}
                {f.hint && <small>{f.hint}</small>}
              </>
            )}
          </label>
        ))}
      </div>
      {children}
      {error && <ErrorBox message={error} />}
      <div className="form-footer">
        <button className="btn btn-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{' '}
          {isSubmitting ? 'Đang xử lý…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
export function MoneyStats({
  stats,
  period = 'Toàn bộ thời gian',
}: {
  stats: Stats;
  period?: string;
}) {
  return (
    <div className="stats-grid">
      <div className="stat-card stat-balance">
        <div className="stat-top">
          <span>Số dư quỹ</span>
          <span className="stat-icon">
            <WalletCards size={20} />
          </span>
        </div>
        <strong>{vnd(stats.closing)}</strong>
        <div className="stat-foot">
          <span className="live-dot" /> Lũy kế đến {dateLabel(stats.asOf)}
        </div>
        <svg className="balance-wave" viewBox="0 0 260 100" aria-hidden="true">
          <path
            d="M0 80 Q30 40 65 60 T125 35 T185 30 T260 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M0 96 Q30 56 65 76 T125 51 T185 46 T260 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <span>Tổng thu trong kỳ</span>
          <span className="stat-icon positive">
            <ArrowDownLeft size={20} />
          </span>
        </div>
        <strong className="text-green">{vnd(stats.income)}</strong>
        <div className="stat-foot">{period} · đã ghi sổ</div>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <span>Tổng chi trong kỳ</span>
          <span className="stat-icon negative">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <strong>{vnd(stats.expense)}</strong>
        <div className="stat-foot">{period} · đã ghi sổ</div>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <span>Giao dịch trong kỳ</span>
          <span className="stat-icon blue">
            <ArrowRightLeft size={20} />
          </span>
        </div>
        <strong>
          {stats.count.toLocaleString('vi-VN')}
          <small> giao dịch</small>
        </strong>
        <div className="stat-foot">
          <ShieldCheck size={14} /> Tính từ sổ giao dịch
        </div>
      </div>
    </div>
  );
}
export function TransactionTable({
  items,
  onSelect,
  internal = false,
}: {
  items: TransactionRow[];
  onSelect?: (tx: TransactionRow) => void;
  internal?: boolean;
}) {
  if (!items.length)
    return (
      <Empty
        title="Chưa có giao dịch phù hợp"
        description="Thử thay đổi bộ lọc hoặc ghi nhận giao dịch đầu tiên."
      />
    );
  return (
    <div className="table-scroll">
      <table className="transaction-table">
        <thead>
          <tr>
            <th>Nội dung giao dịch</th>
            <th>Ngày</th>
            <th>Danh mục</th>
            {internal && <th>Trạng thái</th>}
            <th className="align-right">Số tiền</th>
            <th aria-label="Chi tiết" />
          </tr>
        </thead>
        <tbody>
          {items.map((t) => {
            const positive =
              t.cashAmount !== undefined
                ? BigInt(t.cashAmount) > 0n
                : t.type === 'INCOME' || t.type === 'OPENING';
            return (
              <tr key={t.id}>
                <td>
                  <button className="transaction-name" onClick={() => onSelect?.(t)}>
                    <span className={`transaction-icon ${positive ? 'positive' : 'negative'}`}>
                      {t.type === 'TRANSFER' ? (
                        <ArrowRightLeft size={18} />
                      ) : positive ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </span>
                    <span>
                      <b>{t.description}</b>
                      <small>
                        {t.code} · {typeNames[t.type]}
                      </small>
                    </span>
                  </button>
                </td>
                <td className="muted nowrap">{dateLabel(t.date)}</td>
                <td>
                  <span className="category-label">{t.category}</span>
                </td>
                {internal && (
                  <td>
                    <Status status={t.status || 'POSTED'} />
                  </td>
                )}
                <td className={`align-right amount ${positive ? 'text-green' : ''}`}>
                  {positive ? '+' : '−'}
                  {vnd(t.amount)}
                </td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => onSelect?.(t)}
                    aria-label={`Chi tiết ${t.code}`}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trong ${total} giao dịch`
          : '0 kết quả'}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Trang {page} / {pages}
        </span>
        <button
          className="icon-button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = 'Tìm kiếm giao dịch…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function ExportButtons({ base }: { base: string }) {
  return (
    <div className="export-buttons">
      {['csv', 'xlsx', 'pdf'].map((format) => (
        <a
          className="btn btn-small btn-secondary"
          key={format}
          href={`${base}${base.includes('?') ? '&' : '?'}format=${format}`}
          target="_blank"
          rel="noreferrer"
        >
          <Download size={15} />
          {format.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
export function CopyButton({ value, label = 'Sao chép' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="btn btn-small btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setError('Không thể sao chép tự động. Hãy chọn và sao chép nội dung.');
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Đã sao chép' : label}
      </button>
      {error && <small role="alert">{error}</small>}
    </>
  );
}
