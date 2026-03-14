import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateInventoryItem, useDeleteInventoryItem } from '@/hooks/useSupabaseData';
import type { InventoryItem } from '@/hooks/useSupabaseData';

interface EditInventoryDrawerProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNITS = ['bags', 'kg', 'tons', 'pcs', 'sheets', 'liters', 'meters'];

export function EditInventoryDrawer({ item, open, onOpenChange }: EditInventoryDrawerProps) {
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const [itemName, setItemName] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [availableQty, setAvailableQty] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [unit, setUnit] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (item && !initialized) {
    setItemName(item.item_name);
    setTotalQty(String(item.total_qty));
    setAvailableQty(String(item.available_qty));
    setMinStockLevel(String(item.min_stock_level));
    setUnit(item.unit);
    setInitialized(true);
  }

  const handleClose = (o: boolean) => {
    if (!o) { setInitialized(false); setShowDeleteConfirm(false); }
    onOpenChange(o);
  };

  const handleSave = () => {
    if (!item || !itemName.trim() || !totalQty || !unit) {
      toast.error('Please fill in required fields'); return;
    }
    updateItem.mutate(
      { id: item.id, item_name: itemName.trim(), total_qty: Number(totalQty), available_qty: Number(availableQty), min_stock_level: Number(minStockLevel) || 0, unit },
      { onSuccess: () => { toast.success('Item updated'); handleClose(false); }, onError: (err) => toast.error(err.message) }
    );
  };

  const handleDelete = () => {
    if (!item) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => { toast.success('Item deleted'); handleClose(false); },
      onError: (err) => toast.error(err.message),
    });
  };

  if (!item) return null;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit Inventory Item</DrawerTitle>
        </DrawerHeader>
        <div className="px-4">
          {showDeleteConfirm ? (
            <div className="space-y-4 py-4">
              <p className="text-center text-body text-foreground">Delete "<strong>{item.item_name}</strong>"?</p>
              <p className="text-center text-sm text-muted-foreground">This action cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="min-h-[48px] flex-1" onClick={handleDelete} disabled={deleteItem.isPending}>
                  {deleteItem.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label-meta mb-1.5 block">Item Name</label>
                <Input className="min-h-[48px]" value={itemName} onChange={e => setItemName(e.target.value)} maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-meta mb-1.5 block">Total Qty</label>
                  <Input className="min-h-[48px]" type="number" value={totalQty} onChange={e => setTotalQty(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="label-meta mb-1.5 block">Available Qty</label>
                  <Input className="min-h-[48px]" type="number" value={availableQty} onChange={e => setAvailableQty(e.target.value)} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-meta mb-1.5 block">Min Stock Level</label>
                  <Input className="min-h-[48px]" type="number" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="label-meta mb-1.5 block">Unit</label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => handleClose(false)}>Cancel</Button>
                <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={updateItem.isPending}>
                  {updateItem.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <Button variant="ghost" className="min-h-[48px] w-full text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Item
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
