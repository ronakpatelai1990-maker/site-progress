import { AppShell } from '@/components/AppShell';
import { StockCard } from '@/components/StockCard';
import { FAB } from '@/components/FAB';
import { CreateInventoryDrawer } from '@/components/CreateInventoryDrawer';
import { EditInventoryDrawer } from '@/components/EditInventoryDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, getLowStockItems, InventoryItem } from '@/hooks/useSupabaseData';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Filter = 'all' | 'low';

export default function InventoryPage() {
  const { role } = useAuth();
  const { data: inventory = [] } = useInventory();
  const [filter, setFilter] = useState<Filter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const lowStockItems = getLowStockItems(inventory);

  // Get unique categories from inventory
  const categories = useMemo(() => {
    const cats = inventory
      .map(i => i.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    return ['all', ...Array.from(new Set(cats)).sort()];
  }, [inventory]);

  // Filter items
  const items = useMemo(() => {
    let result = filter === 'low' ? lowStockItems : inventory;
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }
    if (search.trim()) {
      result = result.filter(i =>
        i.item_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  }, [inventory, lowStockItems, filter, categoryFilter, search]);

  const canManage = role === 'admin';

  return (
    <AppShell
      title="Stock Inventory"
      subtitle={`${inventory.length} items · ${lowStockItems.length} low stock`}
    >
      {/* Filter tabs */}
      <div className="mb-3 flex gap-2">
        {([['all', 'All Items'], ['low', `Low Stock (${lowStockItems.length})`]] as const).map(([key, label]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.96 }}
            onClick={() => setFilter(key)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-medium transition-colors ${
              filter === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {key === 'low' && lowStockItems.length > 0 && (
              <AlertTriangle className="inline mr-1 h-3.5 w-3.5" />
            )}
            {label}
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 min-h-[44px]"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category dropdown */}
      {categories.length > 2 && (
        <div className="mb-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="min-h-[44px]">
              <Package className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stock summary bar */}
      {lowStockItems.length > 0 && (
        <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {lowStockItems.slice(0, 3).map(item => (
              <span key={item.id} className="text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                {item.item_name}: {item.available_qty} {item.unit}
              </span>
            ))}
            {lowStockItems.length > 3 && (
              <span className="text-xs text-destructive">+{lowStockItems.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map(item => (
          <StockCard
            key={item.id}
            item={item}
            onClick={canManage ? () => setEditingItem(item) : undefined}
          />
        ))}
        {items.length === 0 && (
          <div className="card-elevated flex flex-col items-center justify-center py-12">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {search || categoryFilter !== 'all' ? 'No items match your filter' : 'No items found'}
            </p>
            {canManage && !search && (
              <p className="text-xs text-muted-foreground mt-1">Tap + to add stock items</p>
            )}
          </div>
        )}
      </div>

      {canManage && <FAB onClick={() => setShowCreate(true)} label="Item" />}
      <CreateInventoryDrawer open={showCreate} onOpenChange={setShowCreate} />
      <EditInventoryDrawer
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(o) => !o && setEditingItem(null)}
      />
    </AppShell>
  );
}
