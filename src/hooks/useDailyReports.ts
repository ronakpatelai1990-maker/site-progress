import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DailyReportWorkRow {
  id?: string;
  report_id?: string;
  description: string;
  location: string;
  quantity: number | null;
  unit: string;
  status: 'Completed' | 'In Progress' | 'Delayed' | '';
  assigned_to: string;
}

export interface DailyReportMaterialRow {
  id?: string;
  report_id?: string;
  material_name: string;
  quantity_used: number | null;
  unit: string;
  remaining_stock: number | null;
}

export interface DailyReport {
  id: string;
  site_id: string;
  report_date: string;
  submitted_by_name: string | null;
  weather: string | null;
  temperature: number | null;
  work_start_time: string | null;
  work_end_time: string | null;
  total_workers: number | null;
  issues: string | null;
  safety_notes: string | null;
  visitor_notes: string | null;
  tomorrow_plan: string | null;
  expected_workers: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  work_rows?: DailyReportWorkRow[];
  material_rows?: DailyReportMaterialRow[];
}

async function fetchReportsWithChildren(): Promise<DailyReport[]> {
  const { data: reports, error } = await supabase
    .from('daily_reports' as any)
    .select('*')
    .order('report_date', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const base = (reports || []) as unknown as DailyReport[];
  if (base.length === 0) return [];

  const ids = base.map(r => r.id);
  const [{ data: work }, { data: mats }] = await Promise.all([
    supabase.from('daily_report_work' as any).select('*').in('report_id', ids),
    supabase.from('daily_report_materials' as any).select('*').in('report_id', ids),
  ]);

  const workRows = (work || []) as unknown as DailyReportWorkRow[];
  const matRows = (mats || []) as unknown as DailyReportMaterialRow[];

  const workByReport = new Map<string, DailyReportWorkRow[]>();
  const matByReport = new Map<string, DailyReportMaterialRow[]>();
  for (const w of workRows) {
    const rid = w.report_id || '';
    if (!rid) continue;
    const arr = workByReport.get(rid) || [];
    arr.push(w);
    workByReport.set(rid, arr);
  }
  for (const m of matRows) {
    const rid = m.report_id || '';
    if (!rid) continue;
    const arr = matByReport.get(rid) || [];
    arr.push(m);
    matByReport.set(rid, arr);
  }

  return base.map(r => ({
    ...r,
    work_rows: workByReport.get(r.id) || [],
    material_rows: matByReport.get(r.id) || [],
  }));
}

export function useDailyReports() {
  return useQuery({
    queryKey: ['daily_reports_v2'],
    queryFn: fetchReportsWithChildren,
  });
}

export function useTodayReport(siteId: string, date: string) {
  return useQuery({
    queryKey: ['daily_report_today_v2', siteId, date],
    queryFn: async () => {
      if (!siteId) return null;
      const { data: report, error } = await supabase
        .from('daily_reports' as any)
        .select('*')
        .eq('site_id', siteId)
        .eq('report_date', date)
        .maybeSingle();
      if (error) throw error;
      if (!report) return null;
      const id = (report as any).id as string;

      const [{ data: work }, { data: mats }] = await Promise.all([
        supabase.from('daily_report_work' as any).select('*').eq('report_id', id),
        supabase.from('daily_report_materials' as any).select('*').eq('report_id', id),
      ]);

      return {
        ...(report as any),
        work_rows: (work || []) as DailyReportWorkRow[],
        material_rows: (mats || []) as DailyReportMaterialRow[],
      } as DailyReport;
    },
    enabled: !!siteId,
  });
}

async function replaceChildren(reportId: string, work: DailyReportWorkRow[], materials: DailyReportMaterialRow[]) {
  const { error: wDelErr } = await supabase.from('daily_report_work' as any).delete().eq('report_id', reportId);
  if (wDelErr) throw wDelErr;
  const { error: mDelErr } = await supabase.from('daily_report_materials' as any).delete().eq('report_id', reportId);
  if (mDelErr) throw mDelErr;

  const workIns = work
    .filter(w => w.description.trim())
    .map(w => ({
      report_id: reportId,
      description: w.description,
      location: w.location,
      quantity: w.quantity,
      unit: w.unit,
      status: w.status || null,
      assigned_to: w.assigned_to,
    }));

  const matIns = materials
    .filter(m => m.material_name.trim())
    .map(m => ({
      report_id: reportId,
      material_name: m.material_name,
      quantity_used: m.quantity_used,
      unit: m.unit,
      remaining_stock: m.remaining_stock,
    }));

  if (workIns.length) {
    const { error } = await supabase.from('daily_report_work' as any).insert(workIns as any);
    if (error) throw error;
  }
  if (matIns.length) {
    const { error } = await supabase.from('daily_report_materials' as any).insert(matIns as any);
    if (error) throw error;
  }
}

type SaveDailyReportInput = {
  id?: string;
  site_id: string;
  report_date: string;
  submitted_by_name?: string | null;
  weather?: string | null;
  temperature?: number | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
  total_workers?: number | null;
  issues?: string | null;
  safety_notes?: string | null;
  visitor_notes?: string | null;
  tomorrow_plan?: string | null;
  expected_workers?: number | null;
  status?: string | null;
  work_rows: DailyReportWorkRow[];
  material_rows: DailyReportMaterialRow[];
};

async function saveDailyReport(input: SaveDailyReportInput, submittedByName: string | null) {
  const payload: Record<string, any> = {
    site_id: input.site_id,
    report_date: input.report_date,
    submitted_by_name: input.submitted_by_name ?? submittedByName,
    weather: input.weather ?? null,
    temperature: input.temperature ?? null,
    work_start_time: input.work_start_time ?? null,
    work_end_time: input.work_end_time ?? null,
    total_workers: input.total_workers ?? null,
    issues: input.issues ?? null,
    safety_notes: input.safety_notes ?? null,
    visitor_notes: input.visitor_notes ?? null,
    tomorrow_plan: input.tomorrow_plan ?? null,
    expected_workers: input.expected_workers ?? null,
    status: input.status ?? 'draft',
    updated_at: new Date().toISOString(),
  };

  let reportId = input.id;
  if (reportId) {
    const { error } = await supabase.from('daily_reports' as any).update(payload).eq('id', reportId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('daily_reports' as any)
      .upsert(payload, { onConflict: 'site_id,report_date' } as any)
      .select('id')
      .single();
    if (error) throw error;
    reportId = (data as any).id as string;
  }

  if (!reportId) throw new Error('Missing report id');
  await replaceChildren(reportId, input.work_rows, input.material_rows);

  await supabase.from('daily_reports' as any).update({ updated_at: new Date().toISOString() }).eq('id', reportId);
  return reportId;
}

export function useUpsertDailyReport() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: SaveDailyReportInput) => {
      return await saveDailyReport(input, profile?.name ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_reports_v2'] });
      qc.invalidateQueries({ queryKey: ['daily_report_today_v2'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['material_usage'] });
    },
  });
}

// Back-compat aliases (same behavior + cache invalidation)
export const useUpdateDailyReport = useUpsertDailyReport;
export const useCreateDailyReport = useUpsertDailyReport;

export function useDeleteDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_reports' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_reports_v2'] });
      qc.invalidateQueries({ queryKey: ['daily_report_today_v2'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
