export interface User {
  id: string;
  name: string;
  role: 'owner' | 'vendedora';
  avatar: string;
  color: string;
  canDashboard: boolean;
  active?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  documentNumber?: string | null;
  address?: string | null;
}

export interface LoginUser {
  id: string;
  name: string;
  role: 'owner' | 'vendedora';
  avatar: string;
  color: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  active?: boolean;
}

export interface CartItem {
  productId: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
}

export interface TransactionItem {
  productId: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
}

export interface Transaction {
  id: string;
  date: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  cashReceived: number;
  cashAmount: number;
  qrAmount: number;
  change: number;
  attendedBy: string;
  userId: string;
  orderId?: string | null;
  saleType: 'site' | 'delivery';
}

export interface SaleRow {
  lineId: number;
  ticketId: string;
  soldAt: string;
  productId: number;
  productName: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
  lineTotal: number;
  lineProfit: number;
  paymentMethod: string;
  saleType: 'site' | 'delivery';
  attendedBy: string;
  userId: string;
  currentStock: number;
  productActive: boolean;
}

export interface AppSettings {
  businessName: string;
  businessTagline: string;
  businessNIT: string;
  businessPhone: string;
  businessAddress: string;
  businessCity: string;
  businessEmail: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  taxRate: number;
  ticketPrefix: string;
  orderPrefix: string;
  lowStockThreshold: number;
}

export type ViewKey =
  | 'pos'
  | 'sales'
  | 'orders'
  | 'dashboard'
  | 'accounting'
  | 'inventory'
  | 'settings';
