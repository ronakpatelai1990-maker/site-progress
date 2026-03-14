import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDailyReport } from '@/hooks/useDailyReports';
import type { Site, InventoryItem } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: Site[];
  inventory: InventoryItem[];
}

interface ManpowerEntry { role: string; count: number }
interface MaterialEntry { inventory_id: string; qty_used: number; unit: string }

const DEFAULT_ROLES = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Painter', 'Welder', 'Operator'];

export function CreateDailyReportDrawer({ open, onOpenChange, sites, inventory }: Props) {
  const { user } = useAuth();
  const createReport = useCreateDailyReport();

  const [siteId, setSiteId] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [manpower, setManpower] = useState<ManpowerEntry[]>([{ role: '', count: 1 }]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [step, setStep] = useState(0); // 0: basics, 1: manpower, 2: materials

  const reset = () => {
    setSiteId('');
    setWorkDescription('');
    setManpower([{ role: '', count: 1 }]);
    setMaterials([]);
    setStep(0);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  // Manpower helpers
  const addManpower = () => setManpower([...manpower, { role: '', count: 1 }]);
  const removeManpower = (i: number) => setManpower(manpower.filter((_, idx) => idx !== i));
  const updateManpower = (i: number, field: keyof ManpowerEntry, value: string | number) => {
    const updated = [...manpower];
    if (field === 'count') updated[i].count = Number(value) || 0;
    else updated[i].role = value as string;
    setManpower(updated);
  };

  // Material helpers
  const addMaterial = () => setMaterials([...materials, { inventory_id: '', qty_used: 0, unit: '' }]);
  const removeMaterial = (i: number) => setMaterials(materials.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof MaterialEntry, value: string | number) => {
    const updated = [...materials];
    if (field === 'qty_used') updated[i].qty_used = Number(value) || 0;
    else if (field === 'inventory_id') {
      updated[i].inventory_id = value as string;
      const item = inventory.find(inv => inv.id === value);
      if (item) updated[i].unit = item.unit;
    } else {
      updated[i].unit = value as string;
    }
    setMaterials(updated);
  };

  const handleSubmit = () => {
    if (!siteId || !workDescription.trim()) {
      toast.error('Please fill in site and work description');
      return;
    }
    const validManpower = manpower.filter(m => m.role.trim() && m.count > 0);
    const validMaterials = materials.filter(m => m.inventory_id && m.qty_used > 0);

    createReport.mutate(
      {
        site_id: siteId,
        report_date: format(new Date(), 'yyyy-MM-dd'),
        work_description: workDescription.trim(),
        manpower: validManpower,
        materials_used: validMaterials,
        created_by: user!.id,
      },
      {
        onSuccess: () => {
          toast.success('Daily report submitted — stock updated');
          handleClose(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const stepTitles = ['Work Details', 'Manpower', 'Materials Used'];

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{stepTitles[step]}</DrawerTitle>
          <div className="flex gap-1 mt-2">
            {stepTitles.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-secondary'}`} />
            ))}
          </div>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[60vh]">
          {/* Step 0: Site & Work */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label-meta mb-1.5 block">Site</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="label-meta mb-1.5 block">Work Done Today</label>
                <Textarea
                  className="min-h-[120px]"
                  value={workDescription}
                  onChange={e => setWorkDescription(e.target.value)}
                  placeholder="Describe the work completed today..."
                  maxLength={2000}
                />
              </div>
            </div>
          )}

          {/* Step 1: Manpower */}
          {step === 1 && (
            <div className="space-y-3">
              {manpower.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={m.role} onValueChange={v => updateManpower(i, 'role', v)}>
                    <SelectTrigger className="min-h-[48px] flex-1"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      {DEFAULT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    className="min-h-[48px] w-20"
                    type="number"
                    min={1}
                    value={m.count}
                    onChange={e => updateManpower(i, 'count', e.target.value)}
                    placeholder="Qty"
                  />
                  {manpower.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeManpower(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" className="min-h-[44px] w-full" onClick={addManpower}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Role
              </Button>
            </div>
          )}

          {/* Step 2: Materials */}
          {step === 2 && (
            <div className="space-y-3">
              {materials.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No materials used? Skip to submit.</p>
              )}
              {materials.map((m, i) => {
                const item = inventory.find(inv => inv.id === m.inventory_id);
                return (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                    <Select value={m.inventory_id} onValueChange={v => updateMaterial(i, 'inventory_id', v)}>
                      <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {inventory.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.item_name} ({inv.available_qty} {inv.unit} avail)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input
                        className="min-h-[48px] flex-1"
                        type="number"
                        min={0}
                        max={item?.available_qty}
                        value={m.qty_used || ''}
                        onChange={e => updateMaterial(i, 'qty_used', e.target.value)}
                        placeholder="Qty used"
                      />
                      <span className="text-sm text-muted-foreground w-16">{m.unit || 'unit'}</span>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => removeMaterial(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" className="min-h-[44px] w-full" onClick={addMaterial}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Material
              </Button>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => setStep(step - 1)}>Back</Button>
            ) : (
              <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => handleClose(false)}>Cancel</Button>
            )}
            {step < 2 ? (
              <Button
                className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!siteId || !workDescription.trim())}
              >
                Next
              </Button>
            ) : (
              <Button
                className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSubmit}
                disabled={createReport.isPending}
              >
                {createReport.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
