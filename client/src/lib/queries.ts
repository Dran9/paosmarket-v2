import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Order } from './types';

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
