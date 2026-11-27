import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsPeriod, AnalyticsPoint, ProductChartPoint } from '../../utils/analytics';

function SalesVisitsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="bg-white border border-[#E4E7E2] rounded-xl shadow-lg px-3 py-2 text-xs space-y-1"
    >
      <div className="font-extrabold text-[#153D35]">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-[#78827D]">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-bold text-[#252A28] tabular-nums">
            {entry.dataKey === 'sales' ? `${entry.value} ₪` : `${entry.value} زيارة`}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProductViewsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="bg-white border border-[#E4E7E2] rounded-xl shadow-lg px-3 py-2 text-xs space-y-0.5"
    >
      <div className="font-bold text-[#252A28]">{label}</div>
      <div className="text-[#153D35] font-extrabold tabular-nums">
        {payload[0].value} مشاهدة
      </div>
    </div>
  );
}

export function MerchantAnalyticsCharts({
  period,
  series,
  productBreakdown,
}: {
  period: AnalyticsPeriod;
  series: AnalyticsPoint[];
  productBreakdown: ProductChartPoint[];
}) {
  return (
    <div className="space-y-4">
      {/* Sales & Visits Interactive Area Chart */}
      <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#252A28]">
              {period === 'week' ? 'المبيعات والزيارات الأسبوعية' : 'المبيعات والزيارات الشهرية'}
            </h2>
            <p className="text-[11px] text-[#78827D]">
              مخطط تفاعلي يوضح حركة الزيارات مقابل إجمالي المبيعات بالشيكل
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 text-[#153D35]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#153D35]" />
              المبيعات (₪)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#7a5812]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D5A64A]" />
              الزيارات
            </span>
          </div>
        </div>

        <div className="w-full h-60" dir="ltr">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={series} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="souqSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#153D35" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#153D35" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="souqVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D5A64A" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#D5A64A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E7E2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#78827D' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#78827D' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<SalesVisitsTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                name="المبيعات"
                stroke="#153D35"
                strokeWidth={2.4}
                fillOpacity={1}
                fill="url(#souqSalesGrad)"
                activeDot={{ r: 5, fill: '#153D35', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                name="الزيارات"
                stroke="#D5A64A"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#souqVisitsGrad)"
                activeDot={{ r: 5, fill: '#D5A64A', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Bar Chart */}
      {productBreakdown.length > 0 && (
        <div className="bg-white border border-[#E4E7E2] rounded-2xl p-4 space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-[#252A28]">
              مشاهدات المنتجات الأعلى تفاعلاً
            </h2>
            <p className="text-[11px] text-[#78827D]">
              مقارنة تفاعلية لأعلى 5 منتجات من حيث المشاهدات
            </p>
          </div>
          <div className="w-full h-52" dir="ltr">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={productBreakdown}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7E2" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#78827D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78827D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ProductViewsTooltip />} cursor={{ fill: '#E6EFEA', opacity: 0.45 }} />
                <Bar
                  dataKey="views"
                  name="المشاهدات"
                  fill="#153D35"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
