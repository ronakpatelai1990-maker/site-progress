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

const UNITS = ['bags', 'kg', 'tons', 'pcs', 'sheets', 'liters', 'meters', 'rft'];

const CATEGORIES = ['Steel', 'Pipe', 'Aggregates', 'Cement', 'Paint', 'Electrical'];

const CATALOGUE: Record<string, {
  subtypes?: string[];
  fittings?: string[];
  sizes?: string[];
}> = {
  Steel: { sizes: ['8 mm', '10 mm', '12 mm', '16 mm', '20 mm', '25 mm'] },
  Pipe: {
    subtypes: ['UPVC', 'CPVC', 'Grey PVC'],
    fittings: ['Pipe', 'Elbow', 'Coupler', 'T'],
    sizes: ['1"', '1 1/2"', '2"', '2 1/2"'],
  },
  Aggregates: { sizes: ['10 mm', '20 mm'] },
  Cement: { subtypes: ['OPC 43', 'OPC 53', 'PPC', 'White Cement'] },
  Paint: { subtypes: ['Primer', 'Putty', 'Interior Emulsion', 'Exterior Emulsion', 'Enamel', 'Waterproof'] },
  Electrical: { subtypes: ['Wire 1.5mm', 'Wire 2.5mm', 'Wire 4mm', 'MCB', 'Switch', 'Socket', 'Conduit Pipe', 'Junction Box'] },
};

const buildItemName = (cat: string, sub: string, fit: string, size: string) =>
  [cat, sub, fit, size].filter(Boolean).join(' - ');

export function EditInventoryDrawer({ item, open, onOpenChange }: EditInventoryDrawerProps) {
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [fitting, setFitting] = useState('');
  const [size, setSize] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [availableQty, setAvailableQty] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [unit, setUnit] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (item && !initialized) {
    // Try to parse existing item_name back into parts
    const parts = item.item_name.split(' - ');
    setCategory((item as any).category || parts[0] || '');
    setSubtype((item as any).sub_type || parts[1] || '');
    setFitting(parts[2] || '');
    setSize((item as any).size || parts[3] || parts[2] || '');
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

  const cat = CATALOGUE[category];

  const handleSave = () => {
    if (!item || !category || !totalQty || !unit) {
      toast.error('Please fill in required fields'); return;
    }
    const itemName = buildItemName(category, subtype, fitting, size) || category;
    updateItem.mutate(
      {
        id: item.id,
        item_name: itemName,
        total_qty: Number(totalQty),
        available_qty: Number(availableQty),
        min_stock_level: Number(minStockLevel) || 0,
        unit,
        category,
        sub_type: subtype || null,
        size: size || null,
      } as any,
      {
        onSuccess: () => { toast.success('Item updated'); handleClose(false); },
        onError: (err: any) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!item) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => { toast.success('Item deleted'); handleClose(false); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  if (!item) return null;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit Inventory Item</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto max-h-[65vh]">
          {showDeleteConfirm ? (
            <div className="space-y-4 py-4">
              <p className="text-center text-body text-foreground">Delete "<strong>{item.item_name}</strong>"?</p>
              <p className="text-center text-sm text-muted-foreground">This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="min-h-[48px] flex-1" onClick={handleDelete} disabled={deleteItem.isPending}>
                  {deleteItem.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="label-meta mb-1.5 block">Category *</label>
                <Select value={category} onValueChange={v => { setCategory(v); setSubtype(''); setFitting(''); setSize(''); }}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Subtype */}
              {cat?.subtypes && (
                <div>
                  <label className="label-meta mb-1.5 block">Type</label>
                  <Select value={subtype} onValueChange={setSubtype}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{cat.subtypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {/* Fitting */}
              {cat?.fittings && (
                <div>
                  <label className="label-meta mb-1.5 block">Fitting</label>
                  <Select value={fitting} onValueChange={setFitting}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select fitting" /></SelectTrigger>
                    <SelectContent>{cat.fittings.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {/* Size */}
              {cat?.sizes && (
                <div>
                  <label className="label-meta mb-1.5 block">Size</label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>{cat.sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {/* Item name preview */}
              {category && (
                <div className="rounded-lg bg-accent/10 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Item name</p>
                  <p className="text-sm font-medium text-accent">
                    {buildItemName(category, subtype, fitting, size) || category}
                  </p>
                </div>
              )}

              {/* Quantities */}
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
                  <label className="label-meta mb-1.5 block">Min Stock Alert</label>
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
