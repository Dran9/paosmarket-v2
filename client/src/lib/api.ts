import type {
  AppNotification,
  AppSettings,
  Driver,
  LoginUser,
  Order,
  OrderStatus,
  Product,
  SaleRow,
  Transaction,
  TransportSettled,
  TransportType,
  User,
} from './types';

const JWT_KEY = 'pos-jwt';

export function getToken(): string | null {
  try {
    return localStorage.getItem(JWT_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(JWT_KEY, token);
    else localStorage.removeItem(JWT_KEY);
  } catch {
    /* ignore */
  }
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;

  let url = path;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJSON(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  auth: {
    users: () => request<LoginUser[]>('/api/auth/users', { auth: false }),
    login: (id: string, password: string) =>
      request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: { id, password },
        auth: false,
      }),
    me: () => request<{ user: User }>('/api/auth/me'),
    logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', auth: false }),
  },
  settings: {
    get: () => request<AppSettings>('/api/settings', { auth: false }),
  },
  products: {
    list: () => request<Product[]>('/api/products'),
  },
  transactions: {
    list: (params: { from?: string; to?: string; saleType?: string; limit?: number } = {}) =>
      request<Transaction[]>('/api/transactions', { query: params }),
    create: (body: {
      items: Array<{ productId: number; qty: number }>;
      method: string;
      cash_received?: number;
      cash_amount?: number;
      qr_amount?: number;
      sale_type?: 'site' | 'delivery';
      order_id?: string | null;
    }) =>
      request<Transaction>('/api/transactions', {
        method: 'POST',
        body,
      }),
    sales: (params: { from?: string; to?: string; saleType?: string } = {}) =>
      request<SaleRow[]>('/api/transactions/sales', { query: params }),
  },
  drivers: {
    list: () => request<Driver[]>('/api/drivers'),
  },
  orders: {
    list: () => request<Order[]>('/api/orders'),
    create: (body: {
      items: Array<{ productId: number; qty: number }>;
      client_name: string;
      client_phone?: string;
      client_zone?: string;
      client_addr: string;
      notes?: string | null;
      transport_type?: TransportType;
      transport_cost?: number;
      driver_id?: string | null;
    }) => request<Order>('/api/orders', { method: 'POST', body }),
    update: (
      id: string,
      body: Partial<{
        client_name: string;
        client_phone: string;
        client_zone: string;
        client_addr: string;
        notes: string | null;
        transport_type: TransportType;
        transport_cost: number;
        driver_id: string | null;
      }>
    ) => request<Order>(`/api/orders/${id}`, { method: 'PUT', body }),
    setStatus: (
      id: string,
      body: {
        status: OrderStatus;
        method?: 'QR' | 'Depósito';
        cancel_reason?: string | null;
        transport_settled?: TransportSettled | null;
      }
    ) => request<Order>(`/api/orders/${id}/status`, { method: 'PUT', body }),
  },
  notifications: {
    list: () => request<AppNotification[]>('/api/notifications'),
    read: (id: number) =>
      request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
    readAll: () =>
      request<{ ok: boolean }>('/api/notifications/read-all', { method: 'PUT' }),
  },
};
