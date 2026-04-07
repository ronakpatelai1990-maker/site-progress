import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkCompletedRow {
  description: string;
  location: string;
  percentage: number;
}

export interface DailyReport {
  id: string;
  site_id: string;
  report_date: string;
  work_description: string;
  manpower: unknown;
  materials_used: unknown;
  photos: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  weather: string;
  workers_count: number;
  work_hours: number;
  work_completed: WorkCompletedRow[];
  issues: string;
  tomorrow_plan: string;
  status: string;
  bungalow_no: string;
  room_no: string;
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

export function useTodayReport(siteId: string, date: string) {
  return useQuery({
    queryKey: ['daily_report_today', siteId, date],
    queryFn: async () => {
      if (!siteId) return null;
      const { data, error } = await supabase
        .from('daily_progress_reports' as any)
        .select('*')
        .eq('site_id', siteId)
        .eq('report_date', date)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DailyReport | null;
    },
    enabled: !!siteId,
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: Record<string, any>) => {
      const { error } = await supabase
        .from('daily_progress_reports' as any)
        .insert(report as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
      queryClient.invalidateQueries({ queryKey: ['daily_report_today'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['material_usage'] });
    },
  });
}

export function useUpsertDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: Record<string, any>) => {
      const { error } = await supabase
        .from('daily_progress_reports' as any)
        .upsert(report as any, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
      queryClient.invalidateQueries({ queryKey: ['daily_report_today'] });
    },
  });
}

export function useUpdateDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (report: { id: string; [key: string]: any }) => {
      const { id, ...updates } = report;
      const { error } = await supabase
        .from('daily_progress_reports' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
      queryClient.invalidateQueries({ queryKey: ['daily_report_today'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_progress_reports' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_reports'] });
      queryClient.invalidateQueries({ queryKey: ['daily_report_today'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
