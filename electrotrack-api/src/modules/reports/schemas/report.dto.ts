export interface PerProductValue {
  productId: string;
  name: string;
  quantity: number;
  value: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface DailySalesSummaryDto {
  date: string;
  totalSales: number;
  totalOrders: number;
}

export interface StockValuationDto {
  totalStockValue: number;
  perProductValues?: PerProductValue[];
}

export interface LowStockListDto {
  lowStock?: LowStockItem[];
}

export interface CashReconciliationDto {
  date: string;
  openingBalance: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
}
