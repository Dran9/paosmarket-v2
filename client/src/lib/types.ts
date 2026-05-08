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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  plate: string;
}

export type OrderStatus =
  | 'pendiente'
  | 'preparando'
  | 'en_camino'
  | 'entregado'
  | 'problema'
  | 'devuelto'
  | 'cancelado';

export type TransportType = 'incluido' | 'pago_entrega';
export type TransportSettled = 'cliente' | 'tienda' | 'sin_pago';
export type DeliveryMethod = 'QR' | 'Depósito';

export interface OrderItem {
  productId: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
}

export interface Order {
  id: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientZone: string;
  clientAddr: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  transportType: TransportType;
  transportCost: number;
  driverId: string | null;
  status: OrderStatus;
  transportSettled: TransportSettled | null;
  cancelReason: string | null;
  userId: string;
  attendedBy: string;
  items: OrderItem[];
}

export interface AppNotification {
  id: number | string;
  type: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  body: string | null;
  refType: string | null;
  refId: string | null;
  status: 'unread' | 'read' | 'dismissed';
  createdAt: string | null;
  readAt: string | null;
  derived?: boolean;
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
