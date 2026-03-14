import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, getLowStockItems } from '@/hooks/useSupabaseData';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { AlertTriangle, BarChart3, PieChart as PieIcon, Package, CalendarIcon, X } from 'lucide-react';

const STATUS_COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
];

const PRESET_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

export default function ReportsPage() {
  const { role } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const setPreset = (days: number) => {
    setDateFrom(subDays(new Date(), days));
    setDateTo(new Date());
    setActivePreset(days);
  };

  const clearFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setActivePreset(null);
  };

  const filteredTasks = useMemo(() => {
    if (!dateFrom && !dateTo) return tasks;
    return tasks.filter(t => {
      const created = new Date(t.created_at);
      const start = dateFrom ? startOfDay(dateFrom) : new Date(0);
      const end = dateTo ? endOfDay(dateTo) : new Date();
      return isWithinInterval(created, { start, end });
    });
  }, [tasks, dateFrom, dateTo]);

  const tasksBySite = useMemo(() => {
    const map = new Map<string, { pending: number; in_progress: number; completed: number }>();
    filteredTasks.forEach(t => {
      const site = sites.find(s => s.id === t.site_id);
      const name = site?.name || 'Unknown';
      if (!map.has(name)) map.set(name, { pending: 0, in_progress: 0, completed: 0 });
      map.get(name)![t.status]++;
    });
    return Array.from(map, ([name, counts]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, ...counts }));
  }, [filteredTasks, sites]);

  const taskStatusPie = useMemo(() => {
    const pending = filteredTasks.filter(t => t.status === 'pending').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    return [
      { name: 'Pending', value: pending },
      { name: 'In Progress', value: inProgress },
      { name: 'Completed', value: completed },
    ].filter(d => d.value > 0);
  }, [filteredTasks]);

  const stockData = useMemo(() => {
    return inventory
      .sort((a, b) => (a.available_qty / a.total_qty) - (b.available_qty / b.total_qty))
      .slice(0, 8)
      .map(item => ({
        name: item.item_name.length > 10 ? item.item_name.slice(0, 10) + '…' : item.item_name,
        available: item.available_qty,
        used: item.total_qty - item.available_qty,
        min: item.min_stock_level,
        fullName: item.item_name,
      }));
  }, [inventory]);

  const lowStockItems = getLowStockItems(inventory);

  const tasksBySiteConfig: ChartConfig = {
    pending: { label: 'Pending', color: 'hsl(var(--warning))' },
    in_progress: { label: 'In Progress', color: 'hsl(var(--accent))' },
    completed: { label: 'Completed', color: 'hsl(var(--success))' },
  };

  const stockConfig: ChartConfig = {
    available: { label: 'Available', color: 'hsl(var(--accent))' },
    used: { label: 'Used', color: 'hsl(var(--muted-foreground))' },
  };

  if (role !== 'admin') return <Navigate to="/" replace />;

  const hasFilter = dateFrom || dateTo;

  return (
    <AppShell title="Reports" subtitle="Admin analytics">
      {/* Date Range Filter */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          {PRESET_RANGES.map(({ label, days }) => (
            <Button
              key={days}
              size="sm"
              variant={activePreset === days ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setPreset(days)}
            >
              {label}
            </Button>
          ))}
          <div className="flex-1" />
          {hasFilter && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilter}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 flex-1 justify-start text-left text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { setDateFrom(d); setActivePreset(null); }}
                disabled={(d) => (dateTo ? d > dateTo : d > new Date())}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 flex-1 justify-start text-left text-xs font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => { setDateTo(d); setActivePreset(null); }}
                disabled={(d) => (dateFrom ? d < dateFrom : false) || d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        {hasFilter && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card-elevated p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{sites.length}</p>
          <p className="label-meta mt-1">Sites</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{filteredTasks.length}</p>
          <p className="label-meta mt-1">Tasks</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-destructive">{lowStockItems.length}</p>
          <p className="label-meta mt-1">Low Stock</p>
        </div>
      </div>

      {/* Task Status Pie */}
      <Card className="mb-4">
        <CardHeader className="pb-2 flex-row items-center gap-2">
          <PieIcon className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Task Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {taskStatusPie.length > 0 ? (
            <ChartContainer config={tasksBySiteConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={taskStatusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {taskStatusPie.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No tasks in this period</p>
          )}
        </CardContent>
      </Card>

      {/* Tasks by Site */}
      <Card className="mb-4">
        <CardHeader className="pb-2 flex-row items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Tasks by Site</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksBySite.length > 0 ? (
            <ChartContainer config={tasksBySiteConfig} className="h-[220px] w-full">
              <BarChart data={tasksBySite}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="in_progress" stackId="a" fill="var(--color-in_progress)" />
                <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Stock Levels */}
      <Card className="mb-4">
        <CardHeader className="pb-2 flex-row items-center gap-2">
          <Package className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          {stockData.length > 0 ? (
            <ChartContainer config={stockConfig} className="h-[220px] w-full">
              <BarChart data={stockData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="available" stackId="a" fill="var(--color-available)" />
                <Bar dataKey="used" stackId="a" fill="var(--color-used)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No inventory</p>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert List */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">Min: {item.min_stock_level} {item.unit}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-destructive">{item.available_qty} {item.unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
