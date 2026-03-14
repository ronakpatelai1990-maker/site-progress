import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { StockCard } from '@/components/StockCard';
import { inventory, InventoryItem, getLowStockItems } from '@/data/mock';
import { motion } from 'framer-motion';

type Filter = 'all' | 'low';

export default function InventoryPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const lowStockItems = getLowStockItems();
  const items = filter === 'low' ? lowStockItems : inventory;

  return (
    <AppShell
      title="Stock Inventory"
      subtitle={`${inventory.length} items · ${lowStockItems.length} low stock`}
    >
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {([['all', 'All Items'], ['low', `Low Stock (${lowStockItems.length})`]] as const).map(([key, label]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.96 }}
            onClick={() => setFilter(key)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <StockCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="card-elevated flex items-center justify-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
