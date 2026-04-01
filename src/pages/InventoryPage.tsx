import { AppShell } from '@/components/AppShell';
import { StockCard } from '@/components/StockCard';
import { FAB } from '@/components/FAB';
import { CreateInventoryDrawer } from '@/components/CreateInventoryDrawer';
import { EditInventoryDrawer } from '@/components/EditInventoryDrawer';
import { ChallanScannerDrawer } from '@/components/ChallanScannerDrawer';
import { MaterialUsageHistory } from '@/components/MaterialUsageHistory';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, useSites, getLowStockItems, InventoryItem } from '@/hooks/useSupabaseData';
import { useAllMaterialUsage, computeUsageStats } from '@/hooks/useMaterialUsage';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Package, AlertTriangle, Search, ScanLine, ArrowLeft, History, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Filter = 'all' | 'low';

export default function InventoryPage() {
  const { role } = useAuth();
  const { data: inventory = [] } = useInventory();
  const { data: sites = [] } = useSites();
  const { data: allUsage = [] } = useAllMaterialUsage();
  const [filter, setFilter] = useState<Filter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [showChallan, setShowChallan] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');

  const lowStockItems = getLowStockItems(inventory);

  // Precompute per-item usage stats
  const itemStats = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeUsageStats>> = {};
    for (const item of inventory) {
      const records = allUsage.filter(u => u.inventory_id === item.id);
      map[item.id] = computeUsageStats(records);
    }
    return map;
  }, [inventory, allUsage]);

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
    if (siteFilter !== 'all') {
      result = result.filter(i => (i as any).site_id === siteFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }
    if (search.trim()) {
      result = result.filter(i =>
        i.item_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  }, [inventory, lowStockItems, filter, siteFilter, categoryFilter, search]);

  const canManage = role === 'admin';

  return (
    <AppShell
      title="Stock Inventory"
      subtitle={`${inventory.length} items · ${lowStockItems.length} low stock`}
      action={canManage ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-accent border-accent/30 hover:bg-accent/10"
          onClick={() => setShowChallan(true)}
        >
          <ScanLine className="h-4 w-4" />
          Scan Challan
        </Button>
      ) : undefined}
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
        {items.map(item => {
          const stats = itemStats[item.id];
          return (
            <div key={item.id} className="relative">
              <StockCard
                item={item}
                onClick={() => canManage ? setEditingItem(item) : setHistoryItem(item)}
                usedToday={stats?.usedToday}
                usedThisWeek={stats?.usedThisWeek}
                last7Days={stats?.last7Days}
              />
              {/* Usage history button */}
              <button
                onClick={(e) => { e.stopPropagation(); setHistoryItem(item); }}
                className="absolute top-3 right-14 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <History className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          );
        })}
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
      <ChallanScannerDrawer open={showChallan} onOpenChange={setShowChallan} />

      {/* Usage History Drawer */}
      <Drawer open={!!historyItem} onOpenChange={(o) => !o && setHistoryItem(null)}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-2">
              <button onClick={() => setHistoryItem(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <DrawerTitle>{historyItem?.item_name}</DrawerTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Usage History</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[75vh]">
            {historyItem && <MaterialUsageHistory item={historyItem} />}
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
