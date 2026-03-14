import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyReport {
  id: string;
  site_id: string;
  report_date: string;
  work_description: string;
  manpower: unknown;
  materials_used: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useDailyReports() {
  return useQuery({
    queryKey: ['daily_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_progress_reports' as any)
        .select('*')
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DailyReport[];
    },
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: {
      site_id: string;
      report_date: string;
      work_description: string;
      manpower: { role: string; count: number }[];
      materials_used: { inventory_id: string; qty_used: number; unit: string }[];
      created_by: string;
    }) => {
      const { error } = await supabase
        .from('daily_progress_reports' as any)
        .insert(report as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['material_usage'] });
    },
  });
}
