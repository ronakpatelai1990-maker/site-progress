import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useSupabaseData';
import { UsageSparkline } from './UsageSparkline';

interface StockCardProps {
  item: InventoryItem;
  onClick?: () => void;
  usedToday?: number;
  usedThisWeek?: number;
  last7Days?: number[];
}

export function StockCard({ item, onClick, usedToday = 0, usedThisWeek = 0, last7Days = [] }: StockCardProps) {
  const isLow = item.available_qty < item.min_stock_level;
  const isOut = item.available_qty <= 0;
  const percentage = item.total_qty > 0 ? Math.round((item.available_qty / item.total_qty) * 100) : 0;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card-elevated w-full p-4 text-left transition-colors duration-150"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-body font-semibold text-foreground">{item.item_name}</p>
            {isOut && (
              <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-medium">Out of Stock</span>
            )}
            {isLow && !isOut && (
              <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 font-medium">Low Stock</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="tabular-nums text-2xl font-bold text-foreground">
              {item.available_qty}
            </span>
            <span className="text-sm text-muted-foreground">/ {item.total_qty} {item.unit}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {(isLow || isOut) && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 animate-subtle-pulse">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </span>
          )}
          <UsageSparkline data={last7Days} />
        </div>
      </div>

      {/* Usage stats row */}
      {(usedToday > 0 || usedThisWeek > 0) && (
        <div className="mt-2 flex gap-3">
          {usedToday > 0 && (
            <span className="text-xs text-muted-foreground">
              Today: <span className="font-medium text-foreground tabular-nums">{usedToday} {item.unit}</span>
            </span>
          )}
          {usedThisWeek > 0 && (
            <span className="text-xs text-muted-foreground">
              This week: <span className="font-medium text-foreground tabular-nums">{usedThisWeek} {item.unit}</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOut ? 'bg-destructive' : isLow ? 'bg-destructive' : percentage < 50 ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="text-xs text-muted-foreground">Min: {item.min_stock_level} {item.unit}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
          {onClick && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>
    </motion.button>
  );
}
