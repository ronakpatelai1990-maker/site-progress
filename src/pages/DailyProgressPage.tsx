import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSites } from '@/hooks/useSupabaseData';
import {
  useDailyReports,
  useTodayReport,
  useUpsertDailyReport,
  useDeleteDailyReport,
  type DailyReport,
  type DailyReportMaterialRow,
  type DailyReportWorkRow,
} from '@/hooks/useDailyReports';
import { FAB } from '@/components/FAB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Download, Eye, FileSpreadsheet, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportReportsToExcel, exportSingleReport } from '@/lib/exportDailyReport';
import { hasPermission } from '@/lib/roles';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Stormy'] as const;
const WORK_STATUS = ['Completed', 'In Progress', 'Delayed'] as const;

function emptyWorkRow(): DailyReportWorkRow {
  return { description: '', location: '', quantity: null, unit: '', status: '', assigned_to: '' };
}

function emptyMaterialRow(): DailyReportMaterialRow {
  return { material_name: '', quantity_used: null, unit: '', remaining_stock: null };
}

export default function DailyProgressPage() {
  const { profile, appRole } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: reports = [], isLoading } = useDailyReports();
  const deleteReport = useDeleteDailyReport();
  const saveReport = useUpsertDailyReport();

  const canEdit = hasPermission(appRole, 'edit:daily');
  const canDelete = appRole === 'Owner';

  const today = format(new Date(), 'yyyy-MM-dd');

  const [mode, setMode] = useState<'list' | 'edit' | 'readonly'>('list');
  const [viewReport, setViewReport] = useState<DailyReport | null>(null);

  const [siteId, setSiteId] = useState('');
  const [reportId, setReportId] = useState<string | undefined>(undefined);

  const [weather, setWeather] = useState<string>(WEATHER_OPTIONS[0]);
  const [temperature, setTemperature] = useState<string>('');
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [totalWorkers, setTotalWorkers] = useState<string>('');

  const [workRows, setWorkRows] = useState<DailyReportWorkRow[]>([emptyWorkRow()]);
  const [materialRows, setMaterialRows] = useState<DailyReportMaterialRow[]>([]);

  const [issues, setIssues] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');

  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [expectedWorkers, setExpectedWorkers] = useState<string>('');

  const [saving, setSaving] = useState(false);

  const { data: todayReport, refetch: refetchToday } = useTodayReport(siteId, today);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const lastSaveRef = useRef<string>('');

  const siteMap = useMemo(() => Object.fromEntries(sites.map(s => [s.id, s.name])), [sites]);

  const hydrateFromReport = useCallback((r: DailyReport) => {
    setReportId(r.id);
    setSiteId(r.site_id);
    setWeather((r.weather as any) || WEATHER_OPTIONS[0]);
    setTemperature(r.temperature === null || r.temperature === undefined ? '' : String(r.temperature));
    setWorkStart(r.work_start_time || '');
    setWorkEnd(r.work_end_time || '');
    setTotalWorkers(r.total_workers === null || r.total_workers === undefined ? '' : String(r.total_workers));

    const wr = (r.work_rows || []).length ? (r.work_rows || []) : [emptyWorkRow()];
    setWorkRows(wr);

    setMaterialRows((r.material_rows || []).length ? (r.material_rows || []) : []);

    setIssues(r.issues || '');
    setSafetyNotes(r.safety_notes || '');
    setVisitorNotes(r.visitor_notes || '');

    setTomorrowPlan(r.tomorrow_plan || '');
    setExpectedWorkers(r.expected_workers === null || r.expected_workers === undefined ? '' : String(r.expected_workers));
  }, []);

  useEffect(() => {
    if (mode !== 'edit') return;
    if (!siteId) return;
    if (!todayReport) return;
    hydrateFromReport(todayReport);
  }, [mode, siteId, todayReport, hydrateFromReport]);

  const getPayload = useCallback(
    (status: string) => {
      const tw = Number(totalWorkers);
      const ew = Number(expectedWorkers);
      const temp = temperature.trim() === '' ? null : Number(temperature);

      const normalizedWork = workRows.map(w => ({
        ...w,
        status: (w.status || '') as any,
        quantity: w.quantity === null || w.quantity === (undefined as any) ? null : Number(w.quantity),
      }));

      const normalizedMaterials = materialRows.map(m => ({
        ...m,
        quantity_used: m.quantity_used === null ? null : Number(m.quantity_used),
        remaining_stock: m.remaining_stock === null ? null : Number(m.remaining_stock),
      }));

      return {
        id: reportId,
        site_id: siteId,
        report_date: today,
        submitted_by_name: profile?.name ?? null,
        weather,
        temperature: Number.isFinite(temp as number) ? (temp as number) : null,
        work_start_time: workStart || null,
        work_end_time: workEnd || null,
        total_workers: Number.isFinite(tw) ? tw : null,
        issues,
        safety_notes: safetyNotes,
        visitor_notes: visitorNotes,
        tomorrow_plan: tomorrowPlan,
        expected_workers: Number.isFinite(ew) ? ew : null,
        status,
        work_rows: normalizedWork,
        material_rows: normalizedMaterials,
      };
    },
    [
      reportId,
      siteId,
      today,
      profile?.name,
      weather,
      temperature,
      workStart,
      workEnd,
      totalWorkers,
      issues,
      safetyNotes,
      visitorNotes,
      tomorrowPlan,
      expectedWorkers,
      workRows,
      materialRows,
    ]
  );

  // Auto-save draft every 60 seconds
  useEffect(() => {
    if (mode !== 'edit' || !siteId || !canEdit) return;
    autoSaveRef.current = setInterval(async () => {
      const payload = getPayload('draft');
      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSaveRef.current) return;
      lastSaveRef.current = snapshot;
      try {
        const id = await saveReport.mutateAsync(payload as any);
        setReportId(id as any);
        await refetchToday();
        toast.success('Draft auto-saved', { duration: 1200 });
      } catch {
        // silent
      }
    }, 60000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [mode, siteId, canEdit, getPayload, saveReport, refetchToday]);

  const startNew = () => {
    setMode('edit');
    setViewReport(null);
    setReportId(undefined);
    setSiteId('');
    setWeather(WEATHER_OPTIONS[0]);
    setTemperature('');
    setWorkStart('');
    setWorkEnd('');
    setTotalWorkers('');
    setWorkRows([emptyWorkRow()]);
    setMaterialRows([]);
    setIssues('');
    setSafetyNotes('');
    setVisitorNotes('');
    setTomorrowPlan('');
    setExpectedWorkers('');
  };

  const openReadonly = (r: DailyReport) => {
    setViewReport(r);
    setMode('readonly');
  };

  const handleSaveDraft = async () => {
    if (!siteId) {
      toast.error('Select a site first');
      return;
    }
    if (!workRows.some(w => w.description.trim())) {
      toast.error('Add at least one work row');
      return;
    }
    setSaving(true);
    try {
      const id = await saveReport.mutateAsync(getPayload('draft') as any);
      setReportId(id as any);
      toast.success('Draft saved');
      await refetchToday();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save draft');
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!siteId) {
      toast.error('Select a site first');
      return;
    }
    if (!workRows.some(w => w.description.trim())) {
      toast.error('Add at least one work row');
      return;
    }
    setSaving(true);
    try {
      const id = await saveReport.mutateAsync(getPayload('submitted') as any);
      setReportId(id as any);
      toast.success('Report submitted');
      setMode('list');
      setReportId(undefined);
      setSiteId('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit');
    }
    setSaving(false);
  };

  const handleDelete = (report: DailyReport) => {
    if (!confirm('Delete this report?')) return;
    deleteReport.mutate(report.id, {
      onSuccess: () => toast.success('Report deleted'),
      onError: (err: any) => toast.error(err?.message || 'Failed to delete'),
    });
  };

  // === READONLY ===
  if (mode === 'readonly' && viewReport) {
    const siteName = siteMap[viewReport.site_id] || 'Unknown';
    return (
      <AppShell title="Daily Report" subtitle={`${siteName} · ${viewReport.report_date}`} action={<Button variant="outline" size="sm" onClick={() => setMode('list')}>Back</Button>}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Summary</CardTitle>
              <Badge variant={viewReport.status === 'submitted' ? 'default' : 'secondary'}>{viewReport.status || 'draft'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Submitted by: <span className="text-foreground font-medium">{viewReport.submitted_by_name || '—'}</span>
            </p>
            <p className="text-muted-foreground">
              Weather: <span className="text-foreground font-medium">{viewReport.weather || '—'}</span>
              {viewReport.temperature !== null && viewReport.temperature !== undefined && (
                <span className="text-foreground font-medium"> · {viewReport.temperature}°</span>
              )}
            </p>
            <p className="text-muted-foreground">
              Hours:{' '}
              <span className="text-foreground font-medium">
                {(viewReport.work_start_time || '—') + ' → ' + (viewReport.work_end_time || '—')}
              </span>
            </p>
            <p className="text-muted-foreground">
              Workers: <span className="text-foreground font-medium">{viewReport.total_workers ?? '—'}</span>
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 space-y-3">
          <h3 className="label-meta">Work completed</h3>
          {(viewReport.work_rows || []).map((w, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-foreground">{w.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {w.location} · {w.quantity ?? ''} {w.unit} · {w.status || '—'} · {w.assigned_to || '—'}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <h3 className="label-meta">Materials used</h3>
          {(viewReport.material_rows || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            (viewReport.material_rows || []).map((m, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium text-foreground">{m.material_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Used: {m.quantity_used ?? '—'} {m.unit} · Remaining: {m.remaining_stock ?? '—'}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="label-meta">Issues</h3>
          <p className="text-sm whitespace-pre-wrap">{viewReport.issues || '—'}</p>
          <p className="text-sm whitespace-pre-wrap"><span className="label-meta">Safety</span><br />{viewReport.safety_notes || '—'}</p>
          <p className="text-sm whitespace-pre-wrap"><span className="label-meta">Visitors</span><br />{viewReport.visitor_notes || '—'}</p>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="label-meta">Tomorrow's plan</h3>
          <p className="text-sm whitespace-pre-wrap">{viewReport.tomorrow_plan || '—'}</p>
          <p className="text-sm text-muted-foreground">Expected workers: {viewReport.expected_workers ?? '—'}</p>
        </div>
      </AppShell>
    );
  }

  // === EDIT ===
  if (mode === 'edit') {
    return (
      <AppShell title={reportId ? 'Edit Daily Report' : 'New Daily Report'} subtitle={today}>
        <div className="mb-4 space-y-2">
          <p className="label-meta">Site</p>
          <Select
            value={siteId}
            onValueChange={v => {
              setSiteId(v);
              setReportId(undefined);
            }}
            disabled={!canEdit}
          >
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!siteId ? (
          <div className="card-elevated p-6 text-sm text-muted-foreground">Select a site to start the report.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Header</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Site: <span className="text-foreground font-medium">{sites.find(s => s.id === siteId)?.name}</span>
                </p>
                <p className="text-muted-foreground">
                  Date: <span className="text-foreground font-medium">{today}</span>
                </p>
                <p className="text-muted-foreground">
                  Submitted by: <span className="text-foreground font-medium">{profile?.name || '—'}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Site conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <p className="label-meta">Weather</p>
                  <Select value={weather} onValueChange={setWeather} disabled={!canEdit}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_OPTIONS.map(w => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="label-meta">Temperature</p>
                    <Input value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="e.g. 32" disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="label-meta">Total workers</p>
                    <Input value={totalWorkers} onChange={e => setTotalWorkers(e.target.value)} inputMode="numeric" disabled={!canEdit} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="label-meta">Work start</p>
                    <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} disabled={!canEdit} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="label-meta">Work end</p>
                    <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} disabled={!canEdit} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Work completed</CardTitle>
                {canEdit && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setWorkRows([...workRows, emptyWorkRow()])}>
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {workRows.map((w, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                    <Textarea
                      value={w.description}
                      onChange={e => {
                        const next = [...workRows];
                        next[idx].description = e.target.value;
                        setWorkRows(next);
                      }}
                      placeholder="Work description"
                      disabled={!canEdit}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={w.location}
                        onChange={e => {
                          const next = [...workRows];
                          next[idx].location = e.target.value;
                          setWorkRows(next);
                        }}
                        placeholder="Location"
                        disabled={!canEdit}
                      />
                      <Input
                        value={w.assigned_to}
                        onChange={e => {
                          const next = [...workRows];
                          next[idx].assigned_to = e.target.value;
                          setWorkRows(next);
                        }}
                        placeholder="Assigned to"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={w.quantity === null || w.quantity === undefined ? '' : String(w.quantity)}
                        onChange={e => {
                          const next = [...workRows];
                          next[idx].quantity = e.target.value === '' ? null : Number(e.target.value);
                          setWorkRows(next);
                        }}
                        placeholder="Qty"
                        inputMode="decimal"
                        disabled={!canEdit}
                      />
                      <Input
                        value={w.unit}
                        onChange={e => {
                          const next = [...workRows];
                          next[idx].unit = e.target.value;
                          setWorkRows(next);
                        }}
                        placeholder="Unit"
                        disabled={!canEdit}
                      />
                      <Select
                        value={(w.status || undefined) as any}
                        onValueChange={val => {
                          const next = [...workRows];
                          next[idx].status = val as any;
                          setWorkRows(next);
                        }}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORK_STATUS.map(s => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {canEdit && workRows.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setWorkRows(workRows.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Materials used</CardTitle>
                {canEdit && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaterialRows([...materialRows, emptyMaterialRow()])}>
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {materialRows.length === 0 && <p className="text-sm text-muted-foreground">Optional — add rows if needed.</p>}
                {materialRows.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                    <Input
                      value={m.material_name}
                      onChange={e => {
                        const next = [...materialRows];
                        next[idx].material_name = e.target.value;
                        setMaterialRows(next);
                      }}
                      placeholder="Material name"
                      disabled={!canEdit}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={m.quantity_used === null ? '' : String(m.quantity_used)}
                        onChange={e => {
                          const next = [...materialRows];
                          next[idx].quantity_used = e.target.value === '' ? null : Number(e.target.value);
                          setMaterialRows(next);
                        }}
                        placeholder="Qty used"
                        disabled={!canEdit}
                      />
                      <Input
                        value={m.unit}
                        onChange={e => {
                          const next = [...materialRows];
                          next[idx].unit = e.target.value;
                          setMaterialRows(next);
                        }}
                        placeholder="Unit"
                        disabled={!canEdit}
                      />
                      <Input
                        value={m.remaining_stock === null ? '' : String(m.remaining_stock)}
                        onChange={e => {
                          const next = [...materialRows];
                          next[idx].remaining_stock = e.target.value === '' ? null : Number(e.target.value);
                          setMaterialRows(next);
                        }}
                        placeholder="Remaining"
                        disabled={!canEdit}
                      />
                    </div>
                    {canEdit && (
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setMaterialRows(materialRows.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <p className="label-meta">Issues faced</p>
                  <Textarea value={issues} onChange={e => setIssues(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <p className="label-meta">Safety observations</p>
                  <Textarea value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <p className="label-meta">Visitor notes</p>
                  <Textarea value={visitorNotes} onChange={e => setVisitorNotes(e.target.value)} disabled={!canEdit} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tomorrow's plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={tomorrowPlan} onChange={e => setTomorrowPlan(e.target.value)} disabled={!canEdit} />
                <div className="space-y-1.5">
                  <p className="label-meta">Expected workers</p>
                  <Input value={expectedWorkers} onChange={e => setExpectedWorkers(e.target.value)} inputMode="numeric" disabled={!canEdit} />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex flex-col gap-2 pb-6">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode('list')} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={saving || !canEdit}>
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={saving || !canEdit}>
                {saving ? 'Saving…' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}

      </AppShell>
    );
  }

  // === LIST ===
  return (
    <AppShell title="Daily" subtitle="Site progress reports">
      <div className="flex justify-end gap-2 mb-3">
        {reports.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportReportsToExcel(reports, siteMap)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No reports yet</p>
          {canEdit && <p className="text-xs text-muted-foreground mt-1">Tap + to start today’s report</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const siteName = siteMap[report.site_id] || 'Unknown';
            return (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CardTitle className="text-base truncate">{siteName}</CardTitle>
                      <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {report.status || 'draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReadonly(report)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportSingleReport(report, siteName)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            hydrateFromReport(report);
                            setMode('edit');
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(report)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="line-clamp-2">
                    {report.tomorrow_plan?.trim() || report.issues?.trim() || (report.weather ? `Weather: ${report.weather}` : 'Daily report')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canEdit && <FAB onClick={startNew} label="Report" />}
    </AppShell>
  );
}
