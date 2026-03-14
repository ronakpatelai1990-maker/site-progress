import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateInventoryItem } from '@/hooks/useSupabaseData';

interface CreateInventoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNITS = ['bags', 'kg', 'tons', 'pcs', 'sheets', 'liters', 'meters'];

export function CreateInventoryDrawer({ open, onOpenChange }: CreateInventoryDrawerProps) {
  const createItem = useCreateInventoryItem();
  const [itemName, setItemName] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [unit, setUnit] = useState('');

  const reset = () => { setItemName(''); setTotalQty(''); setMinStockLevel(''); setUnit(''); };

  const handleSubmit = () => {
    if (!itemName.trim() || !totalQty || !unit) {
      toast.error('Please fill in required fields');
      return;
    }
    const total = Number(totalQty);
    const minStock = Number(minStockLevel) || 0;
    if (total <= 0) { toast.error('Quantity must be positive'); return; }

    createItem.mutate(
      {
        item_name: itemName.trim(),
        total_qty: total,
        available_qty: total,
        min_stock_level: minStock,
        unit,
      },
      {
        onSuccess: () => {
          toast.success('Item added to inventory');
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>New Inventory Item</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4">
          <div>
            <label className="label-meta mb-1.5 block">Item Name *</label>
            <Input className="min-h-[48px]" placeholder="e.g. Cement (OPC 53)" value={itemName} onChange={e => setItemName(e.target.value)} maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-meta mb-1.5 block">Total Qty *</label>
              <Input className="min-h-[48px]" type="number" placeholder="500" value={totalQty} onChange={e => setTotalQty(e.target.value)} min={1} />
            </div>
            <div>
              <label className="label-meta mb-1.5 block">Min Stock Level</label>
              <Input className="min-h-[48px]" type="number" placeholder="100" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} min={0} />
            </div>
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Unit *</label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={createItem.isPending}>
            {createItem.isPending ? 'Adding...' : 'Add Item'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
