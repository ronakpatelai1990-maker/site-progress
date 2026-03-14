import { AppShell } from '@/components/AppShell';
import { StockCard } from '@/components/StockCard';
import { FAB } from '@/components/FAB';
import { CreateInventoryDrawer } from '@/components/CreateInventoryDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, getLowStockItems } from '@/hooks/useSupabaseData';
import { useState } from 'react';
import { motion } from 'framer-motion';

type Filter = 'all' | 'low';

export default function InventoryPage() {
  const { role } = useAuth();
  const { data: inventory = [] } = useInventory();
  const [filter, setFilter] = useState<Filter>('all');
  const [showCreate, setShowCreate] = useState(false);

  const lowStockItems = getLowStockItems(inventory);
  const items = filter === 'low' ? lowStockItems : inventory;
  const canCreate = role === 'admin';

  return (
    <AppShell
      title="Stock Inventory"
      subtitle={`${inventory.length} items · ${lowStockItems.length} low stock`}
    >
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

      {canCreate && <FAB onClick={() => setShowCreate(true)} label="Item" />}

      <CreateInventoryDrawer
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </AppShell>
  );
}
