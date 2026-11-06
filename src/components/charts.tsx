'use client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Stats, PeriodInfo } from '@/lib/client';
import { vnd } from '@/lib/money';
import { Empty } from './ui';
const colors = ['#14866d', '#67c4a5', '#456b94', '#a6d9cc', '#e9b96d', '#8c89bc'];
export function ContributionChart({ periods }: { periods: PeriodInfo[] }) {
  const data = periods
    .slice(0, 12)
    .reverse()
    .map((period) => ({
      name: period.name,
      required: Number(
        period.dues.reduce((total, due) => total + BigInt(due.summary.required), 0n),
      ),
      paid: Number(period.dues.reduce((total, due) => total + BigInt(due.summary.paid), 0n)),
    }));
  if (!data.length) return null;
  return (
    <section className="panel spaced-panel">
      <div className="panel-heading">
        <div>
          <h3>Đóng góp theo kỳ</h3>
          <p>Phân biệt nghĩa vụ phải đóng và tiền thực nhận đã phân bổ</p>
        </div>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="4 5" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
            <YAxis
              tickFormatter={(value) => `${value / 1e6}tr`}
              tick={{ fontSize: 11, fill: 'var(--muted)' }}
            />
            <Tooltip
              formatter={(value) => vnd(String(value ?? 0))}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <Bar
              dataKey="required"
              name="Phải đóng"
              fill="#a6c9eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
            <Bar
              dataKey="paid"
              name="Thực nhận đã phân bổ"
              fill="#178c72"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
export function FlowChart({ stats }: { stats: Stats }) {
  const data = stats.monthly.map((m) => ({
    name: `T${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`,
    Thu: Number(m.income),
    Chi: Number(m.expense),
  }));
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h3>Dòng tiền thu & chi</h3>
          <p>Mỗi khoản đóng góp, một dấu ấn rõ ràng</p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-green" />
            Thu
          </span>
          <span>
            <i className="legend-blue" />
            Chi
          </span>
        </div>
      </div>
      {data.length ? (
        <div className="chart-area" role="img" aria-label="Biểu đồ thu và chi theo tháng">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} barGap={5} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickFormatter={(v) => `${v / 1000000}tr`}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-soft)' }}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text)',
                }}
                formatter={(value) => vnd(String(value ?? 0))}
              />
              <Bar
                isAnimationActive={false}
                dataKey="Thu"
                fill="#178c72"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                isAnimationActive={false}
                dataKey="Chi"
                fill="#a6c9eb"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty
          title="Chưa có dòng tiền"
          description="Biểu đồ cập nhật khi giao dịch được ghi sổ."
        />
      )}
      <div className="chart-note">
        <BarChart3 size={14} /> Số liệu thực tế · Đơn vị: triệu đồng
      </div>
    </section>
  );
}
export function ExpenseChart({ stats }: { stats: Stats }) {
  const data = stats.categories.map((c) => ({ name: c.name, value: Number(c.amount) }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <section className="panel chart-panel expense-chart">
      <div className="panel-heading">
        <div>
          <h3>Cơ cấu chi tiêu</h3>
          <p>Quỹ được sử dụng như thế nào?</p>
        </div>
      </div>
      {data.length ? (
        <>
          <div className="donut-wrap">
            <div className="donut-center">
              <small>Tổng chi</small>
              <strong>
                {total >= 1e6
                  ? `${(total / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
                  : vnd(total)}
              </strong>
            </div>
            <ResponsiveContainer width="100%" height={190} minWidth={0}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={data}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={85}
                  paddingAngle={4}
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => vnd(String(value ?? 0))}
                  contentStyle={{
                    background: 'var(--surface)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="category-legend">
            {data.map((d, i) => (
              <div key={d.name}>
                <span>
                  <i style={{ background: colors[i % colors.length] }} />
                  {d.name}
                </span>
                <b>{Math.round((d.value / total) * 100)}%</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty
          title="Chưa có khoản chi"
          description="Các danh mục chi tiêu sẽ xuất hiện tại đây."
        />
      )}
    </section>
  );
}
export function BalanceChart({ stats }: { stats: Stats }) {
  // Monthly history is bounded. Carry the balance before the displayed window forward.
  const carry =
    BigInt(stats.closing) - stats.monthly.reduce((sum, row) => sum + BigInt(row.net), 0n);
  const data = stats.monthly.map((m, i) => ({
    month: m.month,
    balance: Number(
      carry + stats.monthly.slice(0, i + 1).reduce((total, row) => total + BigInt(row.net), 0n),
    ),
  }));
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Số dư theo thời gian</h3>
          <p>Số dư lũy kế tại cuối mỗi tháng có giao dịch</p>
        </div>
      </div>
      {data.length ? (
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis
                tickFormatter={(v) => `${v / 1e6}tr`}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                formatter={(value) => vnd(String(value ?? 0))}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
              <Area
                isAnimationActive={false}
                dataKey="balance"
                name="Số dư"
                stroke="#178c72"
                fill="#178c7220"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}
