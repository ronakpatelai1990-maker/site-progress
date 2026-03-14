import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, getLowStockItems } from '@/hooks/useSupabaseData';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, BarChart3, PieChart as PieIcon, Package } from 'lucide-react';

const STATUS_COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
];

const STOCK_COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
];

export default function ReportsPage() {
  const { role } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();

  const tasksBySite = useMemo(() => {
    const map = new Map<string, { pending: number; in_progress: number; completed: number }>();
    tasks.forEach(t => {
      const site = sites.find(s => s.id === t.site_id);
      const name = site?.name || 'Unknown';
      if (!map.has(name)) map.set(name, { pending: 0, in_progress: 0, completed: 0 });
      map.get(name)![t.status]++;
    });
    return Array.from(map, ([name, counts]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, ...counts }));
  }, [tasks, sites]);

  const taskStatusPie = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return [
      { name: 'Pending', value: pending },
      { name: 'In Progress', value: inProgress },
      { name: 'Completed', value: completed },
    ].filter(d => d.value > 0);
  }, [tasks]);

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

  return (
    <AppShell title="Reports" subtitle="Admin analytics">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card-elevated p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{sites.length}</p>
          <p className="label-meta mt-1">Sites</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{tasks.length}</p>
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
            <p className="text-muted-foreground text-center py-8">No tasks yet</p>
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
