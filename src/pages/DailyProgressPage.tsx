import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useInventory } from '@/hooks/useSupabaseData';
import { useDailyReports, useTodayReport, useUpsertDailyReport, useUpdateDailyReport, useDeleteDailyReport } from '@/hooks/useDailyReports';
import type { DailyReport, WorkCompletedRow } from '@/hooks/useDailyReports';
import { FAB } from '@/components/FAB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Users, Package, Calendar, Pencil, Trash2, Plus, Cloud, CloudRain, Sun, CloudSun, Download, FileSpreadsheet, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { exportReportsToExcel, exportSingleReport } from '@/lib/exportDailyReport';

interface ManpowerEntry { role: string; count: number }
interface MaterialEntry { inventory_id: string; qty_used: number; unit: string }

const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Sunny', icon: Sun },
  { value: 'partly_cloudy', label: 'Partly Cloudy', icon: CloudSun },
  { value: 'cloudy', label: 'Cloudy', icon: Cloud },
  { value: 'rainy', label: 'Rainy', icon: CloudRain },
];

const DEFAULT_ROLES = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Painter', 'Welder', 'Operator'];

export default function DailyProgressPage() {
  const { user, role } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: inventory = [] } = useInventory();
  const { data: reports = [], isLoading } = useDailyReports();
  const deleteReport = useDeleteDailyReport();
  const upsertReport = useUpsertDailyReport();
  const updateReport = useUpdateDailyReport();

  const canCreate = role === 'admin' || role === 'engineer';
  const canManage = role === 'admin' || role === 'engineer';

  // Form state
  const [editing, setEditing] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [siteId, setSiteId] = useState('');
  const [weather, setWeather] = useState('sunny');
  const [workersCount, setWorkersCount] = useState(0);
  const [workHours, setWorkHours] = useState(8);
  const [workDescription, setWorkDescription] = useState('');
  const [workCompleted, setWorkCompleted] = useState<WorkCompletedRow[]>([{ description: '', location: '', percentage: 0 }]);
  const [manpower, setManpower] = useState<ManpowerEntry[]>([{ role: '', count: 1 }]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [issues, setIssues] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [activeTab, setActiveTab] = useState('conditions');
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayReport, refetch: refetchToday } = useTodayReport(siteId, today);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const lastSaveRef = useRef<string>('');

  // Load existing report for today when site changes
  useEffect(() => {
    if (todayReport && editing && !editingReport) {
      setEditingReport(todayReport);
      loadReportIntoForm(todayReport);
      toast.info("Today's report loaded for editing");
    }
  }, [todayReport, editing]);

  const loadReportIntoForm = (r: DailyReport) => {
    setWeather(r.weather || 'sunny');
    setWorkersCount(r.workers_count || 0);
    setWorkHours(r.work_hours || 8);
    setWorkDescription(r.work_description || '');
    setWorkCompleted((r.work_completed as WorkCompletedRow[])?.length ? r.work_completed as WorkCompletedRow[] : [{ description: '', location: '', percentage: 0 }]);
    setManpower((r.manpower as ManpowerEntry[])?.length ? r.manpower as ManpowerEntry[] : [{ role: '', count: 1 }]);
    setMaterials((r.materials_used as MaterialEntry[]) || []);
    setIssues(r.issues || '');
    setTomorrowPlan(r.tomorrow_plan || '');
    setSiteId(r.site_id);
  };

  const resetForm = () => {
    setWeather('sunny');
    setWorkersCount(0);
    setWorkHours(8);
    setWorkDescription('');
    setWorkCompleted([{ description: '', location: '', percentage: 0 }]);
    setManpower([{ role: '', count: 1 }]);
    setMaterials([]);
    setIssues('');
    setTomorrowPlan('');
    setSiteId('');
    setEditingReport(null);
    setEditing(false);
    setActiveTab('conditions');
  };

  const getFormData = useCallback(() => ({
    site_id: siteId,
    report_date: today,
    weather,
    workers_count: workersCount,
    work_hours: workHours,
    work_description: workDescription,
    work_completed: workCompleted.filter(w => w.description.trim()),
    manpower: manpower.filter(m => m.role.trim() && m.count > 0),
    materials_used: materials.filter(m => m.inventory_id && m.qty_used > 0),
    issues,
    tomorrow_plan: tomorrowPlan,
    photos: editingReport?.photos || [],
    created_by: user!.id,
    status: 'draft',
  }), [siteId, today, weather, workersCount, workHours, workDescription, workCompleted, manpower, materials, issues, tomorrowPlan, editingReport, user]);

  // Auto-save draft every 60 seconds
  useEffect(() => {
    if (!editing || !siteId) return;
    autoSaveRef.current = setInterval(async () => {
      const formData = getFormData();
      const snapshot = JSON.stringify(formData);
      if (snapshot === lastSaveRef.current) return;
      lastSaveRef.current = snapshot;
      try {
        if (editingReport) {
          await upsertReport.mutateAsync({ ...formData, id: editingReport.id, status: 'draft' });
        } else {
          await upsertReport.mutateAsync(formData);
        }
        toast.success('Draft auto-saved', { duration: 1500 });
        refetchToday();
      } catch {
        // silent fail for auto-save
      }
    }, 60000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [editing, siteId, getFormData, editingReport]);

  const handleSaveDraft = async () => {
    if (!siteId) { toast.error('Select a site first'); return; }
    setSaving(true);
    try {
      const formData = getFormData();
      if (editingReport) {
        await updateReport.mutateAsync({ ...formData, id: editingReport.id, status: 'draft' });
      } else {
        await upsertReport.mutateAsync(formData);
      }
      toast.success('Draft saved');
      refetchToday();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft');
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!siteId || !workDescription.trim()) {
      toast.error('Please fill site and work description');
      return;
    }
    setSaving(true);
    try {
      const formData = getFormData();
      formData.status = 'submitted';
      if (editingReport) {
        await updateReport.mutateAsync({ ...formData, id: editingReport.id });
      } else {
        await upsertReport.mutateAsync(formData);
      }
      toast.success('Report submitted!');
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    }
    setSaving(false);
  };

  const handleDelete = (report: DailyReport) => {
    if (!confirm('Delete this report?')) return;
    deleteReport.mutate(report.id, {
      onSuccess: () => toast.success('Report deleted'),
      onError: (err: any) => toast.error(err.message),
    });
  };

  const handleEditExisting = (report: DailyReport) => {
    setEditingReport(report);
    loadReportIntoForm(report);
    setEditing(true);
  };

  const handleNewReport = () => {
    resetForm();
    setEditing(true);
  };

  const getSiteName = (id: string) => sites.find(s => s.id === id)?.name || 'Unknown';
  const getItemName = (id: string) => inventory.find(i => i.id === id)?.item_name || 'Unknown';

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));
  const invMap = Object.fromEntries(inventory.map(i => [i.id, i.item_name]));

  // Work completed helpers
  const addWorkRow = () => setWorkCompleted([...workCompleted, { description: '', location: '', percentage: 0 }]);
  const removeWorkRow = (i: number) => setWorkCompleted(workCompleted.filter((_, idx) => idx !== i));
  const updateWorkRow = (i: number, field: keyof WorkCompletedRow, value: string | number) => {
    const updated = [...workCompleted];
    if (field === 'percentage') updated[i].percentage = Number(value) || 0;
    else (updated[i] as any)[field] = value;
    setWorkCompleted(updated);
  };

  // Manpower helpers
  const addManpower = () => setManpower([...manpower, { role: '', count: 1 }]);
  const removeManpower = (i: number) => setManpower(manpower.filter((_, idx) => idx !== i));
  const updateManpower = (i: number, field: keyof ManpowerEntry, value: string | number) => {
    const updated = [...manpower];
    if (field === 'count') updated[i].count = Number(value) || 0;
    else updated[i].role = value as string;
    setManpower(updated);
  };

  // Material helpers
  const addMaterial = () => setMaterials([...materials, { inventory_id: '', qty_used: 0, unit: '' }]);
  const removeMaterial = (i: number) => setMaterials(materials.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof MaterialEntry, value: string | number) => {
    const updated = [...materials];
    if (field === 'qty_used') updated[i].qty_used = Number(value) || 0;
    else if (field === 'inventory_id') {
      updated[i].inventory_id = value as string;
      const item = inventory.find(inv => inv.id === value);
      if (item) updated[i].unit = item.unit;
    } else updated[i].unit = value as string;
    setMaterials(updated);
  };

  // === FORM VIEW ===
  if (editing) {
    return (
      <AppShell title={editingReport ? 'Edit Report' : 'New Daily Report'} subtitle={today}>
        {/* Site selector */}
        <div className="mb-4">
          <label className="label-meta mb-1.5 block">Site *</label>
          <Select value={siteId} onValueChange={v => { setSiteId(v); setEditingReport(null); }} disabled={!!editingReport}>
            <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>
              {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {siteId && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-5 mb-4">
                <TabsTrigger value="conditions" className="text-xs">Site</TabsTrigger>
                <TabsTrigger value="work" className="text-xs">Work</TabsTrigger>
                <TabsTrigger value="materials" className="text-xs">Material</TabsTrigger>
                <TabsTrigger value="manpower" className="text-xs">Team</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              </TabsList>

              {/* Site Conditions */}
              <TabsContent value="conditions" className="space-y-4">
                <div>
                  <label className="label-meta mb-1.5 block">Weather</label>
                  <div className="grid grid-cols-4 gap-2">
                    {WEATHER_OPTIONS.map(w => (
                      <button
                        key={w.value}
                        onClick={() => setWeather(w.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-colors ${weather === w.value ? 'border-accent bg-accent/10' : 'border-border'}`}
                      >
                        <w.icon className="h-5 w-5" />
                        <span className="text-[10px]">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-meta mb-1.5 block">Workers on Site</label>
                    <Input type="number" min={0} value={workersCount || ''} onChange={e => setWorkersCount(Number(e.target.value) || 0)} className="min-h-[48px]" />
                  </div>
                  <div>
                    <label className="label-meta mb-1.5 block">Work Hours</label>
                    <Input type="number" min={0} max={24} step={0.5} value={workHours} onChange={e => setWorkHours(Number(e.target.value) || 0)} className="min-h-[48px]" />
                  </div>
                </div>
              </TabsContent>

              {/* Work Completed */}
              <TabsContent value="work" className="space-y-4">
                <div>
                  <label className="label-meta mb-1.5 block">Summary *</label>
                  <Textarea className="min-h-[80px]" value={workDescription} onChange={e => setWorkDescription(e.target.value)} placeholder="Overall work summary..." maxLength={2000} />
                </div>
                <div className="space-y-3">
                  <label className="label-meta block">Work Items</label>
                  {workCompleted.map((w, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <Input placeholder="Work description" value={w.description} onChange={e => updateWorkRow(i, 'description', e.target.value)} className="min-h-[44px]" />
                      <div className="flex gap-2">
                        <Input placeholder="Location" value={w.location} onChange={e => updateWorkRow(i, 'location', e.target.value)} className="min-h-[44px] flex-1" />
                        <div className="flex items-center gap-1 w-24">
                          <Input type="number" min={0} max={100} value={w.percentage || ''} onChange={e => updateWorkRow(i, 'percentage', e.target.value)} className="min-h-[44px]" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        {workCompleted.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeWorkRow(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full min-h-[44px]" onClick={addWorkRow}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add Work Item
                  </Button>
                </div>
              </TabsContent>

              {/* Materials */}
              <TabsContent value="materials" className="space-y-3">
                {materials.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No materials. Tap + to add.</p>
                )}
                {materials.map((m, i) => {
                  const item = inventory.find(inv => inv.id === m.inventory_id);
                  return (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <Select value={m.inventory_id} onValueChange={v => updateMaterial(i, 'inventory_id', v)}>
                        <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {inventory.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>{inv.item_name} ({inv.available_qty} {inv.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={item?.available_qty} value={m.qty_used || ''} onChange={e => updateMaterial(i, 'qty_used', e.target.value)} placeholder="Qty" className="min-h-[44px] flex-1" />
                        <span className="text-sm text-muted-foreground w-12">{m.unit || 'unit'}</span>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeMaterial(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" className="w-full min-h-[44px]" onClick={addMaterial}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Material
                </Button>
              </TabsContent>

              {/* Manpower */}
              <TabsContent value="manpower" className="space-y-3">
                {manpower.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={m.role} onValueChange={v => updateManpower(i, 'role', v)}>
                      <SelectTrigger className="min-h-[48px] flex-1"><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} value={m.count} onChange={e => updateManpower(i, 'count', e.target.value)} className="min-h-[48px] w-20" />
                    {manpower.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeManpower(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" className="w-full min-h-[44px]" onClick={addManpower}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Role
                </Button>
              </TabsContent>

              {/* Notes */}
              <TabsContent value="notes" className="space-y-4">
                <div>
                  <label className="label-meta mb-1.5 block flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Issues / Observations
                  </label>
                  <Textarea className="min-h-[100px]" value={issues} onChange={e => setIssues(e.target.value)} placeholder="Any issues, delays, safety concerns..." />
                </div>
                <div>
                  <label className="label-meta mb-1.5 block flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" /> Tomorrow's Plan
                  </label>
                  <Textarea className="min-h-[100px]" value={tomorrowPlan} onChange={e => setTomorrowPlan(e.target.value)} placeholder="Planned activities for tomorrow..." />
                </div>
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className="flex gap-2 mt-6 pb-4">
              <Button variant="outline" className="flex-1 min-h-[48px]" onClick={resetForm}>Cancel</Button>
              <Button variant="outline" className="min-h-[48px]" onClick={handleSaveDraft} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" /> Draft
              </Button>
              <Button className="flex-1 min-h-[48px] bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </AppShell>
    );
  }

  // === LIST VIEW ===
  return (
    <AppShell title="Daily Progress" subtitle="Site progress reports">
      {/* Export All button */}
      {reports.length > 0 && (
        <div className="flex justify-end mb-3">
          <Button variant="outline" size="sm" onClick={() => exportReportsToExcel(reports, siteMap, invMap)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Export All
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card-elevated flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No reports yet</p>
          {canCreate && <p className="text-xs text-muted-foreground mt-1">Tap + to add today's report</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const mp = (report.manpower as ManpowerEntry[]) || [];
            const mats = (report.materials_used as MaterialEntry[]) || [];
            const workItems = (report.work_completed as WorkCompletedRow[]) || [];
            const totalWorkers = mp.reduce((s, m) => s + m.count, 0);
            const weatherObj = WEATHER_OPTIONS.find(w => w.value === report.weather);

            return (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{getSiteName(report.site_id)}</CardTitle>
                      <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'} className="text-[10px]">
                        {report.status || 'draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditExisting(report)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(report)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportSingleReport(report, getSiteName(report.site_id), invMap)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.report_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Site conditions */}
                  {(report.weather || report.workers_count) && (
                    <div className="flex flex-wrap gap-2">
                      {weatherObj && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs">
                          <weatherObj.icon className="h-3.5 w-3.5" /> {weatherObj.label}
                        </span>
                      )}
                      {report.workers_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs">
                          <Users className="h-3.5 w-3.5" /> {report.workers_count} workers
                        </span>
                      )}
                      {report.work_hours && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs">
                          {report.work_hours}h
                        </span>
                      )}
                    </div>
                  )}

                  {/* Work summary */}
                  {report.work_description && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <ClipboardList className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Summary</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{report.work_description}</p>
                    </div>
                  )}

                  {/* Work items */}
                  {workItems.length > 0 && (
                    <div>
                      <span className="label-meta">Work Completed</span>
                      <div className="space-y-1 mt-1">
                        {workItems.map((w, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                            <span className="text-xs text-foreground">{w.description} {w.location && `(${w.location})`}</span>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">{w.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manpower */}
                  {mp.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Manpower ({totalWorkers})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mp.map((m, i) => (
                          <span key={i} className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            {m.role}: {m.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Materials */}
                  {mats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Materials Used</span>
                      </div>
                      <div className="space-y-1">
                        {mats.map((m, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                            <span className="text-xs text-foreground">{getItemName(m.inventory_id)}</span>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">{m.qty_used} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {report.issues?.trim() && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="label-meta">Issues</span>
                      </div>
                      <p className="text-sm text-foreground">{report.issues}</p>
                    </div>
                  )}

                  {/* Tomorrow */}
                  {report.tomorrow_plan?.trim() && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowRight className="h-3.5 w-3.5 text-accent" />
                        <span className="label-meta">Tomorrow's Plan</span>
                      </div>
                      <p className="text-sm text-foreground">{report.tomorrow_plan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canCreate && <FAB onClick={handleNewReport} label="Report" />}
    </AppShell>
  );
}
