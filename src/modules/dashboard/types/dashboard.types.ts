export interface DailySalesPoint {
  date: string;
  label: string;
  currentSales: number;
  previousSales: number;
  currentTickets: number;
  previousTickets: number;
}

export interface MonthlySalesPoint {
  month: string;
  label: string;
  currentSales: number;
  previousSales: number;
  growthPercent: number;
}

export interface ExpenseBreakdown {
  supplierPurchases: number;
  payrollTotal: number;
  operatingCosts: number;
  totalExpenses: number;
  previousTotalExpenses: number;
  growthPercent: number;
  netProfit: number;
  netMarginPercent: number;
}

export interface SalesChannelBreakdown {
  counterCash: { amount: number; percent: number; growth: number };
  invoicedCredit: { amount: number; percent: number; growth: number };
  electronicPayments: { amount: number; percent: number; growth: number };
}

export interface TopProductSummary {
  id: string;
  name: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
  sparkline: number[];
}

export interface ExecutiveDashboardSummary {
  revenueToday: number;
  salesCountToday: number;
  totalVat10Accumulated: number;
  weeklyPayrollTotal: number;
  weeklyIpsTotal: number;
  activeEmployeesCount: number;
  totalProductsCount: number;
  criticalStockCount: number;
  recentAttendances: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    recordedAt: Date;
    type: string;
    source: string;
    confidenceScore?: number;
  }>;
  criticalStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    current_stock: number;
    min_stock: number;
  }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    customerName: string;
    grandTotal: number;
    createdAt: Date;
  }>;

  // Analíticas Avanzadas de Ventas, Comparativas y Gastos
  analytics: {
    periodSummary: {
      totalSalesCurrentMonth: number;
      totalSalesPreviousMonth: number;
      growthPercent: number;
      potentialSalesEstimate: number;
      targetAchievementPercent: number;
    };
    dailySales: DailySalesPoint[];
    monthlySales: MonthlySalesPoint[];
    expenses: ExpenseBreakdown;
    channels: SalesChannelBreakdown;
    topProducts: TopProductSummary[];
  };
}
