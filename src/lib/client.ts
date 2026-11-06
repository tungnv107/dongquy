export async function api<T = Record<string, unknown>>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Không thể hoàn tất yêu cầu.');
  return result.data as T;
}
export function serialize<T>(value: T) {
  return JSON.parse(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}
export const statusNames: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  POSTED: 'Đã ghi sổ',
  REJECTED: 'Từ chối',
  PENDING: 'Chờ đối soát',
  CONFIRMED: 'Đã xác nhận',
};
export const typeNames: Record<string, string> = {
  INCOME: 'Khoản thu',
  EXPENSE: 'Khoản chi',
  TRANSFER: 'Chuyển quỹ',
  OPENING: 'Số dư đầu kỳ',
  REVERSAL: 'Hoàn / điều chỉnh',
};
export const roleNames: Record<string, string> = {
  OWNER: 'Chủ nhóm',
  MANAGER: 'Quản lý quỹ',
  TREASURER: 'Thủ quỹ',
  APPROVER: 'Người duyệt',
  MEMBER: 'Thành viên',
};
export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
export interface Stats {
  opening: string;
  closing: string;
  income: string;
  expense: string;
  transfers: string;
  openingAdded: string;
  count: number;
  updatedAt: string | null;
  asOf: string;
  monthly: { month: string; income: string; expense: string; net: string }[];
  categories: { name: string; amount: string }[];
}
export interface FundInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  purpose: string;
  type: string;
  groupId: string;
  visibility: string;
  allowIndex: boolean;
  showSummary: boolean;
  showContributors: boolean;
  allowExport: boolean;
  dualControl: boolean;
  active: boolean;
  goalAmount: string;
  lowBalance: string;
  balance?: string;
  publicManager: string;
  createdAt: string;
  bankBin: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankPublicConsent: boolean;
  group?: { name: string; isDemo: boolean; logoUrl?: string | null; coverUrl?: string | null };
  categories?: { id: string; name: string; type: string }[];
  bank?: { bin: string; name: string; account: string; holder: string } | null;
}
export interface TransactionRow {
  id: string;
  code: string;
  type: string;
  description: string;
  publicDescription?: string;
  isPublic?: boolean;
  amount: string;
  cashAmount?: string;
  date: string;
  occurredAt?: string;
  category: string;
  status?: string;
  createdById?: string;
  createdBy?: { name: string };
  reversedBy?: { id: string; status: string } | null;
  reconciliation?: { id: string } | null;
  attachments?: {
    id: string;
    name?: string;
    originalName?: string;
    mimeType?: string;
    isPublic?: boolean;
    reviewed?: boolean;
  }[];
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface MemberInfo {
  id: string;
  userId: string;
  code: string;
  roles: string[];
  active: boolean;
  publicName: string;
  publicConsent: boolean;
  approvalLimit: string | null;
  phone?: string;
  notes?: string;
  user: { name: string; email: string };
}
export interface DueInfo {
  id: string;
  memberId: string;
  name: string;
  summary: { required: string; paid: string; remaining: string; overpaid: string };
}
export interface PeriodInfo {
  id: string;
  name: string;
  fundId: string;
  standardAmount: string;
  startAt: string;
  dueAt: string;
  closed: boolean;
  dues: DueInfo[];
}
export interface GroupInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  roles: string[];
  isDemo: boolean;
  logoUrl?: string | null;
  coverUrl?: string | null;
}
export interface DashboardData {
  groups: GroupInfo[];
  funds: FundInfo[];
  selectedFund: FundInfo | null;
  stats: Stats | null;
  recent: Page<TransactionRow>;
  pending: number;
  unmatched: number;
  periods: PeriodInfo[];
}
