import { useState, useRef, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ImageIcon, FileText, Loader2, AlertCircle, Check, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useChallanScanner, type ChallanItem } from '@/hooks/useChallanScanner';
import { useInventory, useUpdateInventoryItem, type InventoryItem } from '@/hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChallanScannerDrawer({ open, onOpenChange }: Props) {
  const { data: inventory = [] } = useInventory();
  const { scanChallan, isScanning, challanData, setChallanData, error, reset } = useChallanScanner();
  const updateItem = useUpdateInventoryItem();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    await scanChallan(file, inventory);
  }, [inventory, scanChallan]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const toggleItem = (index: number) => {
    if (!challanData) return;
    const updated = { ...challanData };
    updated.items = updated.items.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    );
    setChallanData(updated);
  };

  const updateItemQty = (index: number, qty: number) => {
    if (!challanData) return;
    const updated = { ...challanData };
    updated.items = updated.items.map((item, i) =>
      i === index ? { ...item, quantity: qty } : item
    );
    setChallanData(updated);
  };

  const matchItemToInventory = (index: number, inventoryId: string) => {
    if (!challanData) return;
    const inv = inventory.find(i => i.id === inventoryId);
    const updated = { ...challanData };
    updated.items = updated.items.map((item, i) =>
      i === index
        ? {
            ...item,
            matched_inventory_id: inventoryId,
            matched_inventory_name: inv?.item_name || null,
            unit: inv?.unit || item.unit,
            selected: true,
          }
        : item
    );
    setChallanData(updated);
  };

  const handleUpdateStock = async () => {
    if (!challanData) return;
    const selectedItems = challanData.items.filter(i => i.selected && i.matched_inventory_id);
    if (selectedItems.length === 0) {
      toast.error('No matched items selected');
      return;
    }

    setIsUpdating(true);
    try {
      for (const item of selectedItems) {
        const inv = inventory.find(i => i.id === item.matched_inventory_id);
        if (!inv) continue;

        const newTotal = inv.total_qty + item.quantity;
        const newAvailable = inv.available_qty + item.quantity;

        const { error } = await supabase
          .from('inventory')
          .update({
            total_qty: newTotal,
            available_qty: newAvailable,
          })
          .eq('id', inv.id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`Stock updated for ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    reset();
    setPreviewUrl(null);
    onOpenChange(false);
  };

  const selectedCount = challanData?.items.filter(i => i.selected && i.matched_inventory_id).length || 0;

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            {challanData ? 'Review Challan Items' : 'Scan Challan'}
          </DrawerTitle>
          {challanData && (
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
              {challanData.challan_no && <span>📄 #{challanData.challan_no}</span>}
              {challanData.supplier_name && <span>🏪 {challanData.supplier_name}</span>}
              {challanData.date && <span>📅 {challanData.date}</span>}
              {challanData.vehicle_no && <span>🚛 {challanData.vehicle_no}</span>}
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[60vh]">
          {/* Upload step */}
          {!challanData && !isScanning && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={previewUrl} alt="Challan preview" className="w-full max-h-48 object-contain bg-muted" />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="min-h-[80px] flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-accent" />
                  <span className="text-sm">Camera</span>
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[80px] flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 text-accent" />
                  <span className="text-sm">Gallery / PDF</span>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Take a photo or upload an image/PDF of the delivery challan
              </p>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Scanning state */}
          {isScanning && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-border mb-2 w-full">
                  <img src={previewUrl} alt="Challan preview" className="w-full max-h-32 object-contain bg-muted opacity-60" />
                </div>
              )}
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">AI is reading the challan...</p>
              <p className="text-xs text-muted-foreground">This may take a few seconds</p>
            </div>
          )}

          {/* Review step */}
          {challanData && !isScanning && (
            <div className="space-y-3">
              {challanData.items.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No items detected in the challan</p>
                </div>
              )}

              {challanData.items.map((item, index) => (
                <ChallanItemCard
                  key={index}
                  item={item}
                  index={index}
                  inventory={inventory}
                  onToggle={toggleItem}
                  onUpdateQty={updateItemQty}
                  onMatch={matchItemToInventory}
                />
              ))}
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[48px] flex-1" onClick={handleClose}>
              Cancel
            </Button>
            {challanData && (
              <Button
                className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleUpdateStock}
                disabled={isUpdating || selectedCount === 0}
              >
                {isUpdating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> Update {selectedCount} item{selectedCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ChallanItemCard({
  item,
  index,
  inventory,
  onToggle,
  onUpdateQty,
  onMatch,
  onCreateAndMatch,
}: {
  item: ChallanItem;
  index: number;
  inventory: InventoryItem[];
  onToggle: (i: number) => void;
  onUpdateQty: (i: number, qty: number) => void;
  onMatch: (i: number, invId: string) => void;
  onCreateAndMatch: (i: number, name: string, unit: string, category: string) => Promise<void>;
}) {
  const isMatched = !!item.matched_inventory_id;
  const matchedInv = inventory.find(i => i.id === item.matched_inventory_id);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState(item.item_name);
  const [newUnit, setNewUnit] = useState(item.unit);
  const [newCategory, setNewCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Item name is required'); return; }
    setIsCreating(true);
    try {
      await onCreateAndMatch(index, newName.trim(), newUnit || 'pcs', newCategory.trim() || null as any);
      setShowCreateForm(false);
    } catch {
      // error handled upstream
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${
      item.selected ? 'border-accent/50 bg-accent/5' : 'border-border'
    }`}>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={item.selected}
          onCheckedChange={() => onToggle(index)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{item.item_name}</p>
          {item.rate && item.amount && (
            <p className="text-xs text-muted-foreground">
              ₹{item.rate}/{item.unit} × {item.quantity} = ₹{item.amount}
            </p>
          )}
        </div>
      </div>

      {/* Match to inventory */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Match to inventory</label>
        <Select
          value={item.matched_inventory_id || ''}
          onValueChange={(v) => {
            if (v === '__create_new__') {
              setShowCreateForm(true);
            } else {
              setShowCreateForm(false);
              onMatch(index, v);
            }
          }}
        >
          <SelectTrigger className="min-h-[40px] text-sm">
            <SelectValue placeholder="Select inventory item..." />
          </SelectTrigger>
          <SelectContent>
            {inventory.map(inv => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.item_name} ({inv.available_qty} {inv.unit})
              </SelectItem>
            ))}
            <SelectItem value="__create_new__" className="text-accent font-medium">
              <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Create new item</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create new inventory item form */}
      {showCreateForm && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-2.5 space-y-2">
          <p className="text-xs font-medium text-accent">Create new inventory item</p>
          <Input
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="min-h-[36px] text-sm"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Unit (e.g. bags, kg)"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="min-h-[36px] text-sm flex-1"
            />
            <Input
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="min-h-[36px] text-sm flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowCreateForm(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0">Qty to add:</label>
        <Input
          type="number"
          min={0}
          value={item.quantity || ''}
          onChange={(e) => onUpdateQty(index, Number(e.target.value) || 0)}
          className="min-h-[40px] flex-1 text-sm"
        />
        <span className="text-xs text-muted-foreground w-14">{item.unit}</span>
      </div>

      {isMatched && matchedInv && (
        <p className="text-xs text-success flex items-center gap-1">
          <Check className="h-3 w-3" />
          Current stock: {matchedInv.available_qty} → {matchedInv.available_qty + item.quantity} {matchedInv.unit}
        </p>
      )}
    </div>
  );
}
