import { useMemo, useState, useCallback } from 'react';
import { AppShell } from '@/components/AppShell';
import { useInventory, useSites } from '@/hooks/useSupabaseData';
import { useAllMaterialUsage } from '@/hooks/useMaterialUsage';
import { useDailyReports } from '@/hooks/useDailyReports';
import { useProfiles } from '@/hooks/useSupabaseData';
import { format, startOfMonth, startOfWeek, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Search, CalendarIcon, Download, FileText, TrendingUp, Package, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UsageRow {
  date: string;
  siteName: string;
  materialName: string;
  category: string;
  openingStock: number;
  qtyUsed: number;
  closingStock: number;
  unit: string;
  usedBy: string;
  purpose: string;
  remarks: string;
  isBelowMin: boolean;
  inventoryId: string;
}

export default function StockUsageReportPage() {
  const { data: inventory = [] } = useInventory();
  const { data: sites = [] } = useSites();
  const { data: allUsage = [] } = useAllMaterialUsage();
  const { data: dailyReports = [] } = useDailyReports();
  const { data: profiles = [] } = useProfiles();

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const getProfileName = useCallback((userId: string) =>
    profiles.find(p => p.user_id === userId)?.name || 'Unknown', [profiles]);

  const getSiteName = useCallback((siteId: string) =>
    sites.find(s => s.id === siteId)?.name || 'Unknown Site', [sites]);

  // Build usage rows from daily_progress_reports materials_used + material_usage records
  const usageRows: UsageRow[] = useMemo(() => {
    const rows: UsageRow[] = [];

    // Sort usage records by date ascending to compute running stock
    const sortedUsage = [...allUsage].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    // Track running stock per inventory item
    const stockTracker: Record<string, number> = {};
    inventory.forEach(item => {
      // Start from total_qty (opening), then subtract usage in chronological order
      stockTracker[item.id] = item.total_qty;
    });

    for (const record of sortedUsage) {
      const item = inventory.find(i => i.id === record.inventory_id);
      if (!item) continue;

      const openingStock = stockTracker[item.id] ?? item.total_qty;
      const closingStock = Math.max(openingStock - record.qty_used, 0);
      stockTracker[item.id] = closingStock;

      // Find linked daily report for purpose/work description
      const linkedReport = dailyReports.find(dr => {
        if (!dr.materials_used) return false;
        const materials = dr.materials_used as any[];
        return Array.isArray(materials) && materials.some(
          (m: any) => m.inventory_id === record.inventory_id
        ) && Math.abs(new Date(dr.created_at).getTime() - new Date(record.recorded_at).getTime()) < 86400000;
      });

      const siteName = linkedReport ? getSiteName(linkedReport.site_id) : '—';
      const purpose = linkedReport?.work_description || '—';

      rows.push({
        date: record.recorded_at,
        siteName,
        materialName: item.item_name,
        category: item.category || 'Uncategorized',
        openingStock,
        qtyUsed: record.qty_used,
        closingStock,
        unit: item.unit,
        usedBy: getProfileName(record.recorded_by),
        purpose,
        remarks: closingStock < item.min_stock_level ? 'Low stock' : '',
        isBelowMin: closingStock < item.min_stock_level,
        inventoryId: item.id,
      });
    }

    // Return in reverse chronological order for display
    return rows.reverse();
  }, [allUsage, inventory, dailyReports, profiles, sites, getProfileName, getSiteName]);

  // Filter options
  const categories = useMemo(() => {
    const cats = inventory.map(i => i.category).filter((c): c is string => !!c && c.trim() !== '');
    return ['all', ...Array.from(new Set(cats)).sort()];
  }, [inventory]);

  const materials = useMemo(() => {
    return ['all', ...Array.from(new Set(inventory.map(i => i.item_name))).sort()];
  }, [inventory]);

  const siteOptions = useMemo(() => {
    return ['all', ...sites.map(s => s.name).sort()];
  }, [sites]);

  // Apply filters
  const filteredRows = useMemo(() => {
    let result = usageRows;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.materialName.toLowerCase().includes(q) ||
        r.siteName.toLowerCase().includes(q) ||
        r.usedBy.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q)
      );
    }
    if (siteFilter !== 'all') {
      result = result.filter(r => r.siteName === siteFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    if (materialFilter !== 'all') {
      result = result.filter(r => r.materialName === materialFilter);
    }
    if (dateFrom || dateTo) {
      result = result.filter(r => {
        const d = new Date(r.date);
        const start = dateFrom ? startOfDay(dateFrom) : new Date(0);
        const end = dateTo ? endOfDay(dateTo) : new Date();
        return isWithinInterval(d, { start, end });
      });
    }

    return result;
  }, [usageRows, search, siteFilter, categoryFilter, materialFilter, dateFrom, dateTo]);

  // Summary totals per material
  const summaryByMaterial = useMemo(() => {
    const map: Record<string, { name: string; total: number; unit: string }> = {};
    filteredRows.forEach(r => {
      if (!map[r.materialName]) map[r.materialName] = { name: r.materialName, total: 0, unit: r.unit };
      map[r.materialName].total += r.qtyUsed;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  // Top 5 most used materials this month for bar chart
  const top5Chart = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthUsage: Record<string, { name: string; total: number; unit: string }> = {};
    usageRows.forEach(r => {
      if (new Date(r.date) >= monthStart) {
        if (!monthUsage[r.materialName]) monthUsage[r.materialName] = { name: r.materialName, total: 0, unit: r.unit };
        monthUsage[r.materialName].total += r.qtyUsed;
      }
    });
    return Object.values(monthUsage)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(m => ({ name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name, total: m.total, fullName: m.name }));
  }, [usageRows]);

  // Cumulative usage trend
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const usedThisWeek = useMemo(() =>
    usageRows.filter(r => new Date(r.date) >= weekStart).reduce((s, r) => s + r.qtyUsed, 0),
    [usageRows, weekStart]);
  const usedThisMonth = useMemo(() =>
    usageRows.filter(r => new Date(r.date) >= monthStart).reduce((s, r) => s + r.qtyUsed, 0),
    [usageRows, monthStart]);

  const chartConfig: ChartConfig = {
    total: { label: 'Qty Used', color: 'hsl(var(--accent))' },
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Site', 'Material', 'Category', 'Opening Stock', 'Qty Used', 'Closing Stock', 'Unit', 'Used By', 'Purpose', 'Remarks'];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map(r => [
        format(new Date(r.date), 'dd-MM-yyyy'),
        `"${r.siteName}"`,
        `"${r.materialName}"`,
        `"${r.category}"`,
        r.openingStock,
        r.qtyUsed,
        r.closingStock,
        r.unit,
        `"${r.usedBy}"`,
        `"${r.purpose}"`,
        `"${r.remarks}"`,
      ].join(',')),
      '',
      'SUMMARY',
      ...summaryByMaterial.map(s => `"${s.name}",,,,,"${s.total}",,"${s.unit}",,,`),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-usage-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const hasFilter = dateFrom || dateTo || siteFilter !== 'all' || categoryFilter !== 'all' || materialFilter !== 'all' || search.trim();

  const clearFilters = () => {
    setSearch('');
    setSiteFilter('all');
    setCategoryFilter('all');
    setMaterialFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <AppShell
      title="Stock Usage Report"
      subtitle={`${filteredRows.length} records`}
      action={
        <Button variant="outline" size="sm" className="gap-1.5 text-accent border-accent/30 hover:bg-accent/10" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      }
    >
      {/* Cumulative trend summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Week</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{usedThisWeek.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">units</span></p>
        </div>
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Month</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{usedThisMonth.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">units</span></p>
        </div>
      </div>

      {/* Top 5 chart */}
      {top5Chart.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm">Top 5 Materials This Month</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={top5Chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 min-h-[44px]"
            placeholder="Search material, site, person..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 flex-1 justify-start text-left text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} disabled={d => dateTo ? d > dateTo : d > new Date()} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 flex-1 justify-start text-left text-xs font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateTo ? format(dateTo, 'dd MMM yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={d => dateFrom ? d < dateFrom : d > new Date()} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {/* Dropdowns row */}
        <div className="flex gap-2">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="min-h-[36px] text-xs flex-1">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              {siteOptions.map(s => (
                <SelectItem key={s} value={s}>{s === 'all' ? 'All Sites' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="min-h-[36px] text-xs flex-1">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {materials.length > 2 && (
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="min-h-[36px] text-xs">
              <SelectValue placeholder="All Materials" />
            </SelectTrigger>
            <SelectContent>
              {materials.map(m => (
                <SelectItem key={m} value={m}>{m === 'all' ? 'All Materials' : m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilter && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block mb-4">
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Site</TableHead>
                <TableHead className="text-xs">Material</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Opening</TableHead>
                <TableHead className="text-xs text-right">Used</TableHead>
                <TableHead className="text-xs text-right">Closing</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Used By</TableHead>
                <TableHead className="text-xs">Purpose</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No usage records found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredRows.map((row, i) => (
                    <TableRow key={i} className={row.isBelowMin ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">{format(new Date(row.date), 'dd-MM-yyyy')}</TableCell>
                      <TableCell className="text-xs">{row.siteName}</TableCell>
                      <TableCell className="text-xs font-medium">{row.materialName}</TableCell>
                      <TableCell className="text-xs">{row.category}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{row.openingStock}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold text-destructive">−{row.qtyUsed}</TableCell>
                      <TableCell className={cn("text-xs text-right tabular-nums font-semibold", row.isBelowMin && "text-destructive")}>{row.closingStock}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.unit}</TableCell>
                      <TableCell className="text-xs">{row.usedBy}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{row.purpose}</TableCell>
                      <TableCell className="text-xs">
                        {row.isBelowMin && <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Low stock</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Summary row */}
                  {summaryByMaterial.length > 0 && (
                    <>
                      <TableRow className="bg-secondary/80 border-t-2 border-border">
                        <TableCell colSpan={5} className="text-xs font-semibold">TOTAL USAGE SUMMARY</TableCell>
                        <TableCell colSpan={6} />
                      </TableRow>
                      {summaryByMaterial.map(s => (
                        <TableRow key={s.name} className="bg-secondary/40">
                          <TableCell colSpan={2} />
                          <TableCell className="text-xs font-medium">{s.name}</TableCell>
                          <TableCell colSpan={2} />
                          <TableCell className="text-xs text-right tabular-nums font-bold">{s.total}</TableCell>
                          <TableCell colSpan={1} />
                          <TableCell className="text-xs text-muted-foreground">{s.unit}</TableCell>
                          <TableCell colSpan={3} />
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2 mb-4">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg bg-secondary/30">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No usage records found</p>
          </div>
        ) : (
          <>
            {filteredRows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  row.isBelowMin ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {format(new Date(row.date), 'dd-MM-yyyy')}
                  </span>
                  {row.isBelowMin && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                      Low stock
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.materialName}</p>
                    <p className="text-[11px] text-muted-foreground">{row.category} · {row.siteName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-destructive">−{row.qtyUsed} {row.unit}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>Open: <strong className="text-foreground">{row.openingStock}</strong></span>
                  <span>Close: <strong className={cn(row.isBelowMin ? "text-destructive" : "text-foreground")}>{row.closingStock}</strong></span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>by {row.usedBy}</span>
                  <span className="truncate max-w-[50%] text-right">{row.purpose !== '—' ? row.purpose : ''}</span>
                </div>
              </div>
            ))}

            {/* Mobile Summary */}
            {summaryByMaterial.length > 0 && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 mt-3">
                <p className="text-xs font-semibold text-foreground mb-2">TOTAL USAGE SUMMARY</p>
                <div className="space-y-1.5">
                  {summaryByMaterial.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-xs text-foreground">{s.name}</span>
                      <span className="text-xs font-bold tabular-nums">{s.total} {s.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
