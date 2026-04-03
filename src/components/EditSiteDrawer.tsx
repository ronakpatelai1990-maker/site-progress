import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateSite, useDeleteSite } from '@/hooks/useSupabaseData';
import type { Site, Profile } from '@/hooks/useSupabaseData';

interface EditSiteDrawerProps {
  site: Site | null;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function EditSiteDrawer({ site, profiles, open, onOpenChange, onDeleted }: EditSiteDrawerProps) {
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync form when site changes
  if (site && !initialized) {
    setName(site.name);
    setLocation(site.location);
    setEngineerId(site.engineer_id);
    setInitialized(true);
  }

  const handleClose = (o: boolean) => {
    if (!o) { setInitialized(false); setShowDeleteConfirm(false); }
    onOpenChange(o);
  };

  const handleSave = () => {
    if (!site || !name.trim() || !location.trim() || !engineerId) {
      toast.error('Please fill in all fields'); return;
    }
    updateSite.mutate(
      { id: site.id, name: name.trim(), location: location.trim(), engineer_id: engineerId },
      { onSuccess: () => { toast.success('Site updated'); handleClose(false); }, onError: (err) => toast.error(err.message) }
    );
  };

  const handleDelete = () => {
    if (!site) return;
    deleteSite.mutate(site.id, {
      onSuccess: () => { toast.success('Site deleted'); handleClose(false); onDeleted?.(); },
      onError: (err) => toast.error(err.message),
    });
  };

  if (!site) return null;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit Site</DrawerTitle>
        </DrawerHeader>
        <div className="px-4">
          {showDeleteConfirm ? (
            <div className="space-y-4 py-4">
              <p className="text-center text-body text-foreground">Delete "<strong>{site.name}</strong>"?</p>
              <p className="text-center text-sm text-muted-foreground">All tasks in this site will also be deleted.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="min-h-[48px] flex-1" onClick={handleDelete} disabled={deleteSite.isPending}>
                  {deleteSite.isPending ? 'Deleting...' : 'Delete Site'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label-meta mb-1.5 block">Site Name</label>
                <Input className="min-h-[48px]" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="label-meta mb-1.5 block">Location</label>
                <Input className="min-h-[48px]" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="label-meta mb-1.5 block">Engineer In Charge</label>
                <Select value={engineerId} onValueChange={setEngineerId}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => handleClose(false)}>Cancel</Button>
                <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={updateSite.isPending}>
                  {updateSite.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <Button variant="ghost" className="min-h-[48px] w-full text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Site
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
