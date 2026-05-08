import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Expense, Order, User } from './types';

export const useLoginUsers = () =>
  useQuery({
    queryKey: ['login-users'],
    queryFn: () => api.auth.users(),
    staleTime: 30_000,
  });

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 5 * 60_000,
  });

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
    staleTime: 60_000,
  });

export const useSales = (params: { from: string; to: string; saleType?: string }) =>
  useQuery({
    queryKey: ['sales', params],
    queryFn: () => api.transactions.sales(params),
    staleTime: 30_000,
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.transactions.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDrivers = () =>
  useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.drivers.list(),
    staleTime: 5 * 60_000,
  });

export const useCreateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.drivers.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useUpdateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.drivers.update>[1] }) =>
      api.drivers.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useDeleteDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.drivers.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders.list(),
    staleTime: 15_000,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.orders.update>[1] }) =>
      api.orders.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      const previous = qc.getQueryData<Order[]>(['orders']);
      qc.setQueryData<Order[]>(['orders'], (old) =>
        old?.map((o) =>
          o.id === id
            ? {
                ...o,
                clientName: body.client_name ?? o.clientName,
                clientPhone: body.client_phone ?? o.clientPhone,
                clientZone: body.client_zone ?? o.clientZone,
                clientAddr: body.client_addr ?? o.clientAddr,
                notes: body.notes !== undefined ? body.notes : o.notes,
                transportType: body.transport_type ?? o.transportType,
                transportCost:
                  body.transport_cost !== undefined ? body.transport_cost : o.transportCost,
                driverId: body.driver_id !== undefined ? body.driver_id : o.driverId,
              }
            : o
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['orders'], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.orders.setStatus>[1] }) =>
      api.orders.setStatus(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useReadNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.read,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useReadAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
    staleTime: 60_000,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.users.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.users.update>[1] }) =>
      api.users.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['users'] });
      const previous = qc.getQueryData<User[]>(['users']);
      qc.setQueryData<User[]>(['users'], (old) =>
        old?.map((u) => (u.id === id ? { ...u, ...body } : u))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['users'], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.users.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useExpenses = (params: { from?: string; to?: string } = {}) =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: () => api.expenses.list(params),
    staleTime: 30_000,
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.expenses.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.expenses.update>[1] }) =>
      api.expenses.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['expenses'] });
      const keys = qc.getQueriesData<Expense[]>({ queryKey: ['expenses'] });
      for (const [key, data] of keys) {
        qc.setQueryData<Expense[]>(key, data?.map((e) => (e.id === id ? { ...e, ...body } : e)));
      }
      return { keys };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.expenses.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDashboard = (params: { from?: string; to?: string } = {}) =>
  useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => api.dashboard.get(params),
    staleTime: 60_000,
  });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.settingsUpdate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string; brand?: string; category: string; barcode?: string; price: number;
      cost: number; stock: number; unit: string;
    }) => fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('pos-jwt') ? { Authorization: `Bearer ${localStorage.getItem('pos-jwt')}` } : {}),
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
      return r.json();
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<{ name: string; brand: string; category: string; barcode: string; price: number; cost: number; stock: number; unit: string }> }) =>
      fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('pos-jwt') ? { Authorization: `Bearer ${localStorage.getItem('pos-jwt')}` } : {}),
        },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          ...(localStorage.getItem('pos-jwt') ? { Authorization: `Bearer ${localStorage.getItem('pos-jwt')}` } : {}),
        },
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useBulkImportProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{
      name: string; brand?: string; category: string; barcode?: string;
      price?: number; cost?: number; stock?: number; unit?: string;
    }>) =>
      fetch('/api/products/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('pos-jwt') ? { Authorization: `Bearer ${localStorage.getItem('pos-jwt')}` } : {}),
        },
        body: JSON.stringify({ items }),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
        return r.json() as Promise<{ imported: number; errors: Array<{ index: number; reason: string }> }>;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 5 * 60_000,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: Parameters<typeof api.categories.update>[1] }) =>
      api.categories.update(name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useStockAdjust = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) =>
      fetch(`/api/products/${id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('pos-jwt') ? { Authorization: `Bearer ${localStorage.getItem('pos-jwt')}` } : {}),
        },
        body: JSON.stringify({ qty }),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};
