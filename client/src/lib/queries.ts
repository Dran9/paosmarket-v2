import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

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
