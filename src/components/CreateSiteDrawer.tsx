import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateSite } from '@/hooks/useSupabaseData';
import type { Profile } from '@/hooks/useSupabaseData';

interface CreateSiteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: Profile[];
}

export function CreateSiteDrawer({ open, onOpenChange, profiles }: CreateSiteDrawerProps) {
  const createSite = useCreateSite();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [engineerId, setEngineerId] = useState('');

  const reset = () => { setName(''); setLocation(''); setEngineerId(''); };

  const handleSubmit = () => {
    if (!name.trim() || !location.trim() || !engineerId) {
      toast.error('Please fill in all fields');
      return;
    }
    createSite.mutate(
      { name: name.trim(), location: location.trim(), engineer_id: engineerId, start_date: new Date().toISOString().split('T')[0] },
      {
        onSuccess: () => {
          toast.success('Site created');
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
          <DrawerTitle>New Site</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4">
          <div>
            <label className="label-meta mb-1.5 block">Site Name</label>
            <Input className="min-h-[48px]" placeholder="e.g. Downtown Plaza" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Location</label>
            <Input className="min-h-[48px]" placeholder="e.g. Dubai Marina" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Engineer In Charge</label>
            <Select value={engineerId} onValueChange={setEngineerId}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder="Select engineer" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={createSite.isPending}>
            {createSite.isPending ? 'Creating...' : 'Create Site'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
