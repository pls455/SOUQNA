import type { Order, Product, Store } from '../types/marketplace';

export type AnalyticsPeriod = 'week' | 'month';

export interface AnalyticsPoint {
  label: string;
  sales: number;
  visits: number;
  orders: number;
}

export interface ProductChartPoint {
  name: string;
  views: number;
  stock: number;
}

const WEEK_LABELS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const WEEK_WEIGHTS = [0.11, 0.13, 0.12, 0.15, 0.16, 0.19, 0.14];

const MONTH_LABELS = ['أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير'];
const MONTH_WEIGHTS = [0.12, 0.14, 0.17, 0.19, 0.21, 0.17];

export function buildStoreAnalyticsSeries(params: {
  store: Pick<Store, 'views'>;
  orders: Order[];
  products: Product[];
  period: AnalyticsPeriod;
}): {
  series: AnalyticsPoint[];
  productBreakdown: ProductChartPoint[];
  totalSales: number;
  totalVisits: number;
  conversionRate: number;
} {
  const { store, orders, products, period } = params;
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalProductViews = products.reduce((sum, p) => sum + p.views, 0);
  const baseVisits = Math.max(store.views, totalProductViews);
  const labels = period === 'week' ? WEEK_LABELS : MONTH_LABELS;
  const weights = period === 'week' ? WEEK_WEIGHTS : MONTH_WEIGHTS;

  const visitScale = period === 'week' ? 0.32 : 1;
  const salesScale = period === 'week' ? 1 : 3.4;

  const series: AnalyticsPoint[] = labels.map((label, idx) => {
    const w = weights[idx];
    const visits = Math.max(12, Math.round(baseVisits * visitScale * w));
    const sales = Math.round(Math.max(totalSales, 120) * salesScale * w);
    const estOrders = Math.max(
      idx === labels.length - 1 ? Math.min(orders.length, 3) : 0,
      Math.round((orders.length || 1) * (period === 'week' ? 1.4 : 4.2) * w)
    );
    return {
      label,
      sales,
      visits,
      orders: estOrders,
    };
  });

  const productBreakdown: ProductChartPoint[] = [...products]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((p) => ({
      name: p.name.length > 18 ? `${p.name.slice(0, 18)}…` : p.name,
      views: p.views,
      stock: p.stock,
    }));

  const totalVisits = series.reduce((s, d) => s + d.visits, 0);
  const totalPeriodOrders = series.reduce((s, d) => s + d.orders, 0);
  const conversionRate =
    totalVisits > 0 ? Number(((totalPeriodOrders / totalVisits) * 100).toFixed(1)) : 0;

  return {
    series,
    productBreakdown,
    totalSales,
    totalVisits,
    conversionRate,
  };
}
