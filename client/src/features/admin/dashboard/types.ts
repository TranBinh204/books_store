// Dashboard (M14) — khớp server/src/services/dashboard.service.ts

export interface DayRange {
  /** yyyy-mm-dd (giờ VN, gồm cả 2 đầu) */
  from: string;
  to: string;
}

export interface DashboardMetrics {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  newCustomers: number;
  cancelledOrders: number;
  voucherDiscount: number;
}

export interface DashboardOverview {
  range: DayRange & { granularity: 'day' | 'month' };
  previousRange: DayRange;
  metrics: DashboardMetrics;
  previous: Pick<DashboardMetrics, 'revenue' | 'orders' | 'avgOrderValue' | 'newCustomers'>;
  /** date: "2026-10-01" (ngày) · "2026-10" (tháng) */
  chart: { date: string; revenue: number; orders: number; newCustomers: number }[];
  topBooks: {
    bookId: number;
    title: string;
    image: string | null;
    quantity: number;
    revenue: number;
  }[];
}

export interface DashboardTasks {
  orders: { toConfirm: number; toShip: number; shipping: number; needsRefund: number };
  oldestToConfirm: {
    id: number;
    code: string;
    customerName: string;
    total: number;
    createdAt: string;
  }[];
  lowStock: {
    total: number;
    items: { id: number; title: string; coverUrl: string | null; stock: number }[];
  };
}

export type ReportType = 'revenue' | 'orders' | 'top-books';
