import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';

export interface MaterialUsageRecord {
  id: string;
  inventory_id: string;
  qty_used: number;
  recorded_by: string;
  recorded_at: string;
  task_id: string;
}

export function useMaterialUsage(inventoryId?: string) {
  return useQuery({
    queryKey: ['material_usage', inventoryId],
    queryFn: async () => {
      let query = supabase
        .from('material_usage')
        .select('*')
        .order('recorded_at', { ascending: false });
      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaterialUsageRecord[];
    },
    enabled: !!inventoryId || inventoryId === undefined,
  });
}

export function useAllMaterialUsage() {
  return useQuery({
    queryKey: ['material_usage_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_usage')
        .select('*')
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MaterialUsageRecord[];
    },
  });
}

// Compute usage stats from records
export function computeUsageStats(records: MaterialUsageRecord[]) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const usedToday = records
    .filter(r => r.recorded_at.startsWith(todayStr))
    .reduce((sum, r) => sum + r.qty_used, 0);

  const usedThisWeek = records
    .filter(r => new Date(r.recorded_at) >= weekStart)
    .reduce((sum, r) => sum + r.qty_used, 0);

  const usedThisMonth = records
    .filter(r => new Date(r.recorded_at) >= monthStart)
    .reduce((sum, r) => sum + r.qty_used, 0);

  // Last 7 days daily usage for sparkline
  const last7Days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = format(subDays(now, i), 'yyyy-MM-dd');
    const dayUsage = records
      .filter(r => r.recorded_at.startsWith(day))
      .reduce((sum, r) => sum + r.qty_used, 0);
    last7Days.push(dayUsage);
  }

  // Average daily usage (last 30 days)
  const thirtyDaysAgo = subDays(now, 30);
  const last30 = records.filter(r => new Date(r.recorded_at) >= thirtyDaysAgo);
  const totalLast30 = last30.reduce((sum, r) => sum + r.qty_used, 0);
  const avgDaily = totalLast30 / 30;

  return { usedToday, usedThisWeek, usedThisMonth, last7Days, avgDaily };
}

// Compute days until stockout
export function daysUntilStockout(availableQty: number, avgDailyUsage: number): number | null {
  if (avgDailyUsage <= 0) return null;
  return Math.floor(availableQty / avgDailyUsage);
}
