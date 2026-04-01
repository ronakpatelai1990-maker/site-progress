import { useState, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Camera, ImageIcon, X, FileText, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCreateInventoryItem, useUpdateInventoryItem, useInventory, useSites } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface CreateInventoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Catalogue ──────────────────────────────────────────────────────────────
const CATALOGUE: Record<string, {
  subtypes?: string[];
  fittings?: string[];
  sizes?: string[];
  unit: string;
}> = {
  Steel: {
    sizes: ['8 mm', '10 mm', '12 mm', '16 mm', '20 mm', '25 mm'],
    unit: 'kg',
  },
  Pipe: {
    subtypes: ['UPVC', 'CPVC', 'Grey PVC'],
    fittings: ['Pipe', 'Elbow', 'Coupler', 'T'],
    sizes: ['1"', '1 1/2"', '2"', '2 1/2"'],
    unit: 'pcs',
  },
  Aggregates: {
    sizes: ['10 mm', '20 mm'],
    unit: 'tons',
  },
  Cement: {
    subtypes: ['OPC 43', 'OPC 53', 'PPC', 'White Cement'],
    unit: 'bags',
  },
  Paint: {
    subtypes: ['Primer', 'Putty', 'Interior Emulsion', 'Exterior Emulsion', 'Enamel', 'Waterproof'],
    unit: 'liters',
  },
  Electrical: {
    subtypes: ['Wire 1.5mm', 'Wire 2.5mm', 'Wire 4mm', 'MCB', 'Switch', 'Socket', 'Conduit Pipe', 'Junction Box'],
    unit: 'pcs',
  },
};

const CATEGORIES = Object.keys(CATALOGUE);
const UNITS = ['bags', 'kg', 'tons', 'pcs', 'sheets', 'liters', 'meters', 'rft'];

// Build item name from parts
const buildItemName = (cat: string, sub: string, fit: string, size: string) => {
  return [cat, sub, fit, size].filter(Boolean).join(' - ');
};

// ── Parsed challan item ────────────────────────────────────────────────────
interface ParsedItem {
  item_name: string;
  qty: number;
  unit: string;
  matched_id?: string; // existing inventory id if matched
}

// ── Tab type ───────────────────────────────────────────────────────────────
type Tab = 'manual' | 'challan';

export function CreateInventoryDrawer({ open, onOpenChange }: CreateInventoryDrawerProps) {
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const { data: inventory = [] } = useInventory();
  const { data: sites = [] } = useSites();
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('manual');
  const [siteId, setSiteId] = useState('');

  // Manual form
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [fitting, setFitting] = useState('');
  const [size, setSize] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [unit, setUnit] = useState('');

  // Challan
  const [challanPreview, setChallanlPreview] = useState<string | null>(null);
  const [challanFile, setChallanlFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const cat = CATALOGUE[category];

  const reset = () => {
    setCategory(''); setSubtype(''); setFitting(''); setSize('');
    setTotalQty(''); setMinStockLevel(''); setUnit(''); setSiteId('');
    setChallanlPreview(null); setChallanlFile(null);
    setParsedItems([]); setConfirmed(false); setParsing(false);
    setTab('manual');
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  // ── Manual submit ──────────────────────────────────────────────────────
  const handleManualSubmit = () => {
    if (!category || !totalQty || !unit || !siteId) {
      toast.error('Please fill in required fields including site'); return;
    }
    const total = Number(totalQty);
    if (total <= 0) { toast.error('Quantity must be positive'); return; }

    const itemName = buildItemName(category, subtype, fitting, size) || category;

    createItem.mutate(
      {
        item_name: itemName,
        total_qty: total,
        available_qty: total,
        min_stock_level: Number(minStockLevel) || 0,
        unit,
        category,
        sub_type: subtype || null,
        size: size || null,
        site_id: siteId,
      } as any,
      {
        onSuccess: () => {
          toast.success('Item added to inventory');
          reset();
          onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.message),
      }
    );
  };

  // ── Challan photo select ───────────────────────────────────────────────
  const handleChallanlSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChallanlFile(file);
    setChallanlPreview(URL.createObjectURL(file));
    setParsedItems([]);
    setConfirmed(false);
    e.target.value = '';
  };

  // ── Parse challan with AI ──────────────────────────────────────────────
  const parseChallan = async () => {
    if (!challanFile) return;
    setParsing(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(challanFile);
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: challanFile.type as any, data: base64 },
              },
              {
                type: 'text',
                text: `This is a construction material delivery challan/bill. Extract all items with their quantities and units.
Return ONLY a JSON array, no other text, no markdown:
[{"item_name":"item description","qty":number,"unit":"unit string"}]
For units use: bags, kg, tons, pcs, liters, meters, rft.
If you cannot read something clearly, make your best guess.`,
              },
            ],
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '[]';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const items: ParsedItem[] = JSON.parse(cleaned);

      // Try to match with existing inventory
      const enriched = items.map(item => {
        const match = inventory.find(inv =>
          inv.item_name.toLowerCase().includes(item.item_name.toLowerCase()) ||
          item.item_name.toLowerCase().includes(inv.item_name.toLowerCase())
        );
        return { ...item, matched_id: match?.id };
      });

      setParsedItems(enriched);
      if (enriched.length === 0) toast.error('No items found in challan — try a clearer photo');
      else toast.success(`Found ${enriched.length} item${enriched.length > 1 ? 's' : ''} in challan`);
    } catch (err: any) {
      toast.error('Could not read challan — try a clearer photo');
    } finally {
      setParsing(false);
    }
  };

  // ── Confirm and update stock ───────────────────────────────────────────
  const handleConfirmChallan = async () => {
    if (parsedItems.length === 0) return;
    setSaving(true);
    try {
      for (const item of parsedItems) {
        if (item.matched_id) {
          // Add to existing stock
          const existing = inventory.find(i => i.id === item.matched_id);
          if (existing) {
            await supabase.from('inventory').update({
              available_qty: existing.available_qty + item.qty,
              total_qty: existing.total_qty + item.qty,
            }).eq('id', item.matched_id);
          }
        } else {
          // Create new inventory item
          await supabase.from('inventory').insert({
            item_name: item.item_name,
            total_qty: item.qty,
            available_qty: item.qty,
            min_stock_level: 0,
            unit: item.unit,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`Stock updated for ${parsedItems.length} items ✅`);
      setConfirmed(true);
      setTimeout(() => { reset(); onOpenChange(false); }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const updateParsedItem = (i: number, field: keyof ParsedItem, value: string | number) => {
    const updated = [...parsedItems];
    (updated[i] as any)[field] = value;
    setParsedItems(updated);
  };

  const removeParsedItem = (i: number) => setParsedItems(parsedItems.filter((_, idx) => idx !== i));

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left pb-0">
          <DrawerTitle>Add Stock</DrawerTitle>
          {/* Tabs */}
          <div className="mt-3 flex gap-1 rounded-lg bg-secondary p-1">
            {(['manual', 'challan'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {t === 'manual' ? '✏️ Manual Entry' : '📄 Upload Challan (AI)'}
              </button>
            ))}
          </div>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[65vh]">

          {/* ── MANUAL TAB ─────────────────────────────────────────────── */}
          {tab === 'manual' && (
            <div className="space-y-4 pt-2">
              {/* Site */}
              <div>
                <label className="label-meta mb-1.5 block">Site *</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Category */}
              <div>
                <label className="label-meta mb-1.5 block">Category *</label>
                <Select value={category} onValueChange={v => { setCategory(v); setSubtype(''); setFitting(''); setSize(''); setUnit(CATALOGUE[v]?.unit || ''); }}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Subtype */}
              {cat?.subtypes && (
                <div>
                  <label className="label-meta mb-1.5 block">Type *</label>
                  <Select value={subtype} onValueChange={setSubtype}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {cat.subtypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Fitting (Pipe only) */}
              {cat?.fittings && (
                <div>
                  <label className="label-meta mb-1.5 block">Fitting *</label>
                  <Select value={fitting} onValueChange={setFitting}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select fitting" /></SelectTrigger>
                    <SelectContent>
                      {cat.fittings.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Size */}
              {cat?.sizes && (
                <div>
                  <label className="label-meta mb-1.5 block">Size *</label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {cat.sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
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

              {/* Qty + Min stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-meta mb-1.5 block">Quantity *</label>
                  <Input className="min-h-[48px]" type="number" placeholder="500" value={totalQty} onChange={e => setTotalQty(e.target.value)} min={1} />
                </div>
                <div>
                  <label className="label-meta mb-1.5 block">Min Stock Alert</label>
                  <Input className="min-h-[48px]" type="number" placeholder="100" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} min={0} />
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="label-meta mb-1.5 block">Unit *</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pb-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
                <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleManualSubmit} disabled={createItem.isPending}>
                  {createItem.isPending ? 'Adding...' : 'Add Item'}
                </Button>
              </div>
            </div>
          )}

          {/* ── CHALLAN TAB ────────────────────────────────────────────── */}
          {tab === 'challan' && (
            <div className="space-y-4 pt-2">

              {/* Photo picker */}
              {!challanPreview ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Take a clear photo of the delivery challan or bill. AI will read the items and quantities automatically.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="min-h-[56px] flex-1" onClick={() => cameraRef.current?.click()}>
                      <Camera className="mr-2 h-5 w-5" /> Camera
                    </Button>
                    <Button variant="outline" className="min-h-[56px] flex-1" onClick={() => galleryRef.current?.click()}>
                      <ImageIcon className="mr-2 h-5 w-5" /> Gallery
                    </Button>
                  </div>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChallanlSelect} />
                  <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleChallanlSelect} />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Challan preview */}
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={challanPreview} alt="Challan" className="w-full max-h-48 object-cover rounded-lg" />
                    {!parsing && parsedItems.length === 0 && (
                      <button
                        onClick={() => { setChallanlPreview(null); setChallanlFile(null); }}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Parse button */}
                  {parsedItems.length === 0 && !confirmed && (
                    <Button
                      className="min-h-[48px] w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={parseChallan}
                      disabled={parsing}
                    >
                      {parsing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading challan with AI...</>
                      ) : (
                        <><FileText className="mr-2 h-4 w-4" /> Read Challan with AI</>
                      )}
                    </Button>
                  )}

                  {/* Parsed items — editable */}
                  {parsedItems.length > 0 && !confirmed && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Review items before updating stock:</p>
                      {parsedItems.map((item, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.matched_id ? (
                                <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">+Add to existing</span>
                              ) : (
                                <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5">New item</span>
                              )}
                            </div>
                            <button onClick={() => removeParsedItem(i)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <Input
                            className="min-h-[40px] text-sm"
                            value={item.item_name}
                            onChange={e => updateParsedItem(i, 'item_name', e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Input
                              className="min-h-[40px] w-24"
                              type="number"
                              value={item.qty}
                              onChange={e => updateParsedItem(i, 'qty', Number(e.target.value))}
                            />
                            <Select value={item.unit} onValueChange={v => updateParsedItem(i, 'unit', v)}>
                              <SelectTrigger className="min-h-[40px] flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}

                      <Button
                        className="min-h-[48px] w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={handleConfirmChallan}
                        disabled={saving}
                      >
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating stock...</> : `✅ Confirm & Update ${parsedItems.length} Items`}
                      </Button>
                    </div>
                  )}

                  {/* Success */}
                  {confirmed && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <CheckCircle2 className="h-12 w-12 text-success" />
                      <p className="text-sm font-medium text-foreground">Stock updated successfully!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
