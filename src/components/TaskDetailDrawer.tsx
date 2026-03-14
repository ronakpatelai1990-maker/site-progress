import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { StatusBadge } from './StatusBadge';
import { Stepper } from './Stepper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, User, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTaskStatus, useRecordMaterialUsage } from '@/hooks/useSupabaseData';
import type { Task, Site, Profile, InventoryItem } from '@/hooks/useSupabaseData';

interface TaskDetailDrawerProps {
  task: Task | null;
  sites: Site[];
  profiles: Profile[];
  inventory: InventoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDrawer({ task, sites, profiles, inventory, open, onOpenChange }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();
  const recordMaterial = useRecordMaterialUsage();
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState(1);

  if (!task) return null;

  const site = sites.find(s => s.id === task.site_id);
  const assignee = profiles.find(p => p.user_id === task.assigned_to);
  const selectedInventory = inventory.find(i => i.id === selectedItem);

  const handleRecordMaterial = () => {
    if (!selectedItem || !user) return;
    recordMaterial.mutate(
      { task_id: task.id, inventory_id: selectedItem, qty_used: qty, recorded_by: user.id },
      {
        onSuccess: () => {
          toast.success(`Recorded ${qty} ${selectedInventory?.unit || 'units'} of ${selectedInventory?.item_name}`);
          setShowMaterialForm(false);
          setSelectedItem('');
          setQty(1);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleStatusChange = (newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateStatus.mutate(
      { taskId: task.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{task.title}</DrawerTitle>
          <div className="mt-2">
            <StatusBadge status={task.status} />
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          <p className="text-body text-muted-foreground">{task.description}</p>

          <div className="mt-4 space-y-3">
            {site && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-body">{site.name} — {site.location}</span>
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-body">Due: {task.deadline}</span>
              </div>
            )}
            {assignee && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-body">{assignee.name}</span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="label-meta mb-2">Update Status</p>
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'in_progress', 'completed'] as const).map(status => (
                <motion.button
                  key={status}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleStatusChange(status)}
                  className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    task.status === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {!showMaterialForm ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowMaterialForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/10 py-3 text-sm font-medium text-accent"
              >
                <Package className="h-4 w-4" />
                Record Materials Used
              </motion.button>
            ) : (
              <div className="card-elevated space-y-4 p-4">
                <p className="label-meta">Record Material Usage</p>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="min-h-[48px]">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_name} ({item.available_qty} {item.unit} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedItem && (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">Quantity ({selectedInventory?.unit})</p>
                      <Stepper
                        value={qty}
                        onChange={setQty}
                        min={1}
                        max={selectedInventory?.available_qty || 999}
                        unit={selectedInventory?.unit}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="min-h-[48px] flex-1"
                        onClick={() => { setShowMaterialForm(false); setSelectedItem(''); setQty(1); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={handleRecordMaterial}
                        disabled={recordMaterial.isPending}
                      >
                        {recordMaterial.isPending ? 'Recording...' : 'Record'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" className="min-h-[48px]" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
