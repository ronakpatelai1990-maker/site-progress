import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

export type Site = Tables<'sites'>;
export type Task = Tables<'tasks'>;
export type InventoryItem = Tables<'inventory'>;
export type MaterialUsage = Tables<'material_usage'>;
export type Profile = Tables<'profiles'>;
export type TaskStatus = Enums<'task_status'>;

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Site[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory').select('*').order('item_name');
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status, remarks }: { taskId: string; status: TaskStatus; remarks?: string }) => {
      const update: Record<string, unknown> = { status };
      if (remarks !== undefined) update.remarks = remarks;
      const { error } = await supabase.from('tasks').update(update).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRecordMaterialUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (usage: TablesInsert<'material_usage'>) => {
      const { error } = await supabase.from('material_usage').insert(usage);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['material_usage'] });
    },
  });
}

// Helper to get low stock items from already-fetched data
export function getLowStockItems(items: InventoryItem[]) {
  return items.filter(i => i.available_qty < i.min_stock_level);
}
