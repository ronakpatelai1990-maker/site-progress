import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventory, useSites, getLowStockItems, getInventoryMinimumThreshold, type InventoryItem } from '@/hooks/useSupabaseData';

function siteNameForItem(sites: { id: string; name: string }[], item: InventoryItem) {
  const sid = (item as InventoryItem).site_id;
  if (!sid) return 'Unassigned';
  return sites.find(s => s.id === sid)?.name || 'Unknown site';
}

export function LowStockBell() {
  const navigate = useNavigate();
  const { data: inventory = [] } = useInventory();
  const { data: sites = [] } = useSites();
  const [open, setOpen] = useState(false);

  const lowStock = useMemo(() => getLowStockItems(inventory), [inventory]);
  const count = lowStock.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Low stock alerts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Items below minimum threshold</p>
        </div>

        {count === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No low stock items</div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {lowStock.map(item => (
                <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2 mb-2 last:mb-0">
                  <p className="text-xs text-muted-foreground">{siteNameForItem(sites, item)}</p>
                  <p className="text-sm font-medium text-foreground">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qty: <span className="font-semibold text-destructive tabular-nums">{item.available_qty}</span>
                    {' · '}
                    Min: <span className="tabular-nums">{getInventoryMinimumThreshold(item)}</span> {item.unit}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border p-2">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              setOpen(false);
              navigate('/inventory');
            }}
          >
            View Stock
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
