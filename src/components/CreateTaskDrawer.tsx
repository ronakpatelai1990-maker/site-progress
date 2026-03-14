import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateTask } from '@/hooks/useSupabaseData';
import type { Site, Profile } from '@/hooks/useSupabaseData';

interface CreateTaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: Site[];
  profiles: Profile[];
  defaultSiteId?: string;
}

export function CreateTaskDrawer({ open, onOpenChange, sites, profiles, defaultSiteId }: CreateTaskDrawerProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState(defaultSiteId || '');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');

  const reset = () => { setTitle(''); setDescription(''); setSiteId(defaultSiteId || ''); setAssignedTo(''); setDeadline(''); };

  const handleSubmit = () => {
    if (!title.trim() || !siteId || !assignedTo) {
      toast.error('Please fill in required fields');
      return;
    }
    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        site_id: siteId,
        assigned_to: assignedTo,
        deadline: deadline || null,
        status: 'pending',
      },
      {
        onSuccess: () => {
          toast.success('Task created');
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
          <DrawerTitle>New Task</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          <div>
            <label className="label-meta mb-1.5 block">Task Title *</label>
            <Input className="min-h-[48px]" placeholder="e.g. Foundation Pour" value={title} onChange={e => setTitle(e.target.value)} maxLength={150} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Description</label>
            <Textarea placeholder="Task details..." value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Site *</label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Assign To *</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Deadline</label>
            <Input className="min-h-[48px]" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={createTask.isPending}>
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
