import { useState, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeftRight, Package, Loader2, CheckCircle2 } from 'lucide-react';
import { useInventory, useSites, InventoryItem } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface BulkTransferDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TransferItem {
  inventoryItem: InventoryItem;
  selected: boolean;
  transferQty: number;
}

export function BulkTransferDrawer({ open, onOpenChange }: BulkTransferDrawerProps) {
  const { data: inventory = [] } = useInventory();
  const { data: sites = [] } = useSites();
  const queryClient = useQueryClient();

  const [sourceSite, setSourceSite] = useState('');
  const [destSite, setDestSite] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // Filter inventory by source site (used in handleSourceChange below)

  // Update transfer items when source changes
  const handleSourceChange = (siteId: string) => {
    setSourceSite(siteId);
    setDestSite('');
    const filtered = siteId === 'unassigned'
      ? inventory.filter(i => !i.site_id && i.available_qty > 0)
      : inventory.filter(i => i.site_id === siteId && i.available_qty > 0);
    setTransferItems(filtered.map(item => ({
      inventoryItem: item,
      selected: false,
      transferQty: 0,
    })));
  };

  const toggleItem = (idx: number) => {
    setTransferItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected, transferQty: item.selected ? 0 : Math.min(item.inventoryItem.available_qty, 1) } : item
    ));
  };

  const updateQty = (idx: number, qty: number) => {
    setTransferItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, transferQty: Math.min(Math.max(0, qty), item.inventoryItem.available_qty) } : item
    ));
  };

  const selectedItems = transferItems.filter(i => i.selected && i.transferQty > 0);
  const canTransfer = sourceSite && destSite && sourceSite !== destSite && selectedItems.length > 0;

  const destSiteId = destSite === 'unassigned' ? null : destSite;

  const handleTransfer = async () => {
    if (!canTransfer) return;
    setTransferring(true);
    try {
      for (const item of selectedItems) {
        const src = item.inventoryItem;
        const qty = item.transferQty;

        // Check if same item already exists at destination site
        const { data: existing } = await supabase
          .from('inventory')
          .select('*')
          .eq('item_name', src.item_name)
          .eq('unit', src.unit)
          .then(res => {
            if (res.error) throw res.error;
            const matches = destSiteId === null
              ? res.data.filter(i => !i.site_id)
              : res.data.filter(i => i.site_id === destSiteId);
            return { data: matches };
          });

        if (existing && existing.length > 0) {
          // Add to existing item at destination
          const dest = existing[0];
          await supabase.from('inventory').update({
            available_qty: dest.available_qty + qty,
            total_qty: dest.total_qty + qty,
          }).eq('id', dest.id);
        } else {
          // Create new item at destination
          await supabase.from('inventory').insert({
            item_name: src.item_name,
            category: src.category,
            sub_type: src.sub_type,
            size: src.size,
            unit: src.unit,
            total_qty: qty,
            available_qty: qty,
            min_stock_level: src.min_stock_level,
            site_id: destSiteId,
          });
        }

        // Deduct from source
        const newAvail = src.available_qty - qty;
        const newTotal = src.total_qty - qty;
        if (newTotal <= 0) {
          await supabase.from('inventory').delete().eq('id', src.id);
        } else {
          await supabase.from('inventory').update({
            available_qty: Math.max(newAvail, 0),
            total_qty: Math.max(newTotal, 0),
          }).eq('id', src.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSuccess(true);
      toast.success(`Transferred ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} successfully`);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const reset = () => {
    setSourceSite('');
    setDestSite('');
    setTransferItems([]);
    setSuccess(false);
    setTransferring(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const sourceSiteName = sourceSite === 'unassigned' ? 'Unassigned' : sites.find(s => s.id === sourceSite)?.name || '';
  const destSiteName = destSite === 'unassigned' ? 'Unassigned' : sites.find(s => s.id === destSite)?.name || '';

  if (success) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[92vh]">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Transfer Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} moved from {sourceSiteName} to {destSiteName}
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-accent" />
            Bulk Transfer Stock
          </DrawerTitle>
          <p className="text-xs text-muted-foreground mt-1">Move inventory items between sites</p>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Source & Destination */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
            <div>
              <label className="label-meta mb-1.5 block text-xs font-medium text-muted-foreground">From Site</label>
              <Select value={sourceSite} onValueChange={handleSourceChange}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mb-3" />
            <div>
              <label className="label-meta mb-1.5 block text-xs font-medium text-muted-foreground">To Site</label>
              <Select value={destSite} onValueChange={setDestSite} disabled={!sourceSite}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {sites.filter(s => s.id !== sourceSite).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items list */}
          {sourceSite && transferItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Select Items ({selectedItems.length} selected)
                </p>
                <button
                  onClick={() => {
                    const allSelected = transferItems.every(i => i.selected);
                    setTransferItems(prev => prev.map(item => ({
                      ...item,
                      selected: !allSelected,
                      transferQty: !allSelected ? item.inventoryItem.available_qty : 0,
                    })));
                  }}
                  className="text-xs text-accent font-medium"
                >
                  {transferItems.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {transferItems.map((item, idx) => (
                <div
                  key={item.inventoryItem.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    item.selected ? 'border-accent/50 bg-accent/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleItem(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.inventoryItem.item_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Available: {item.inventoryItem.available_qty} {item.inventoryItem.unit}
                        </span>
                        {item.inventoryItem.category && (
                          <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
                            {item.inventoryItem.category}
                          </span>
                        )}
                      </div>
                      {item.selected && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Transfer:</label>
                          <Input
                            type="number"
                            className="h-9 w-24 text-sm"
                            value={item.transferQty || ''}
                            onChange={e => updateQty(idx, Number(e.target.value))}
                            min={1}
                            max={item.inventoryItem.available_qty}
                          />
                          <span className="text-xs text-muted-foreground">{item.inventoryItem.unit}</span>
                          <button
                            onClick={() => updateQty(idx, item.inventoryItem.available_qty)}
                            className="text-xs text-accent font-medium ml-auto"
                          >
                            Max
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sourceSite && transferItems.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <Package className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No items with available stock at this site</p>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleTransfer}
              disabled={!canTransfer || transferring}
            >
              {transferring ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Transferring...</>
              ) : (
                <>Transfer {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}</>
              )}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
