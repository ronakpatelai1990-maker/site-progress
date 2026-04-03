import { useState, useMemo } from 'react';
import { format, subDays, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { useMaterialUsage, computeUsageStats, daysUntilStockout } from '@/hooks/useMaterialUsage';
import { useProfiles } from '@/hooks/useSupabaseData';
import type { InventoryItem } from '@/hooks/useSupabaseData';
import { Calendar, TrendingDown, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type DateFilter = 'week' | 'month' | 'custom';

interface Props {
  item: InventoryItem;
}

export function MaterialUsageHistory({ item }: Props) {
  const { data: records = [], isLoading } = useMaterialUsage(item.id);
  const { data: profiles = [] } = useProfiles();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const stats = useMemo(() => computeUsageStats(records), [records]);
  const stockoutDays = daysUntilStockout(item.available_qty, stats.avgDaily);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to = now;

    if (dateFilter === 'week') {
      from = startOfWeek(now, { weekStartsOn: 1 });
    } else if (dateFilter === 'month') {
      from = startOfMonth(now);
    } else {
      from = customFrom || subDays(now, 30);
      to = customTo || now;
    }

    return records.filter(r => {
      const d = new Date(r.recorded_at);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [records, dateFilter, customFrom, customTo]);

  const getProfileName = (userId: string) =>
    profiles.find(p => p.user_id === userId)?.name || 'Unknown';

  // Calculate running stock for each record (reverse chronological)
  const recordsWithStock = useMemo(() => {
    const _runningStock = item.available_qty;
    // Records are desc order, so we need to add back qty to get "remaining after"
    // Actually, we should just show qty and date — running stock needs all records.
    return filteredRecords.map(r => ({
      ...r,
      // Approximate: not perfectly accurate but gives context
      profileName: getProfileName(r.recorded_by),
    }));
  }, [filteredRecords, profiles, item]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Month</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{stats.usedThisMonth} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
        </div>
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Week</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{stats.usedThisWeek} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
        </div>
        <div className="rounded-lg bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Daily</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{stats.avgDaily.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
        </div>
        <div className={cn("rounded-lg p-3", stockoutDays !== null && stockoutDays < 7 ? "bg-destructive/10" : "bg-secondary")}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stockout In</span>
          </div>
          <p className={cn("text-lg font-bold tabular-nums", stockoutDays !== null && stockoutDays < 7 && "text-destructive")}>
            {stockoutDays !== null ? `${stockoutDays} days` : '—'}
          </p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-2">
        {(['week', 'month', 'custom'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={cn(
              "min-h-[36px] rounded-lg px-3 text-xs font-medium transition-colors",
              dateFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}
          >
            {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
          </button>
        ))}
      </div>

      {dateFilter === 'custom' && (
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                {customFrom ? format(customFrom, 'dd MMM') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                {customTo ? format(customTo, 'dd MMM') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Usage table */}
      {recordsWithStock.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No usage records for this period</p>
      ) : (
        <div className="space-y-1.5">
          {recordsWithStock.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  {format(new Date(r.recorded_at), 'dd MMM yyyy, hh:mm a')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  by {r.profileName}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-destructive">
                −{r.qty_used} {item.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
