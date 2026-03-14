import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useSupabaseData';

interface StockCardProps {
  item: InventoryItem;
  onClick?: () => void;
}

export function StockCard({ item, onClick }: StockCardProps) {
  const isLow = item.available_qty < item.min_stock_level;
  const percentage = item.total_qty > 0 ? Math.round((item.available_qty / item.total_qty) * 100) : 0;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card-elevated w-full p-4 text-left transition-colors duration-150"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-body font-semibold text-foreground">{item.item_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="tabular-nums text-2xl font-bold text-foreground">
              {item.available_qty}
            </span>
            <span className="text-sm text-muted-foreground">/ {item.total_qty} {item.unit}</span>
          </div>
        </div>
        {isLow && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 animate-subtle-pulse">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </span>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isLow ? 'bg-destructive' : percentage < 50 ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="text-xs text-muted-foreground">Min: {item.min_stock_level} {item.unit}</span>
        <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
      </div>
    </motion.button>
  );
}
