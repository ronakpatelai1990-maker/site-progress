import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/hooks/useSupabaseData';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface EditEmployeeDrawerProps {
  employee: Profile | null;
  employeeRole: AppRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'supervisor', label: 'Supervisor' },
];

export function EditEmployeeDrawer({ employee, employeeRole, open, onOpenChange }: EditEmployeeDrawerProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('engineer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee && open) {
      setName(employee.name);
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setRole(employeeRole || 'engineer');
    }
  }, [employee, employeeRole, open]);

  const handleSave = async () => {
    if (!employee || !name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      // Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null })
        .eq('id', employee.id);
      if (profileErr) throw profileErr;

      // Update role — upsert into user_roles
      if (role !== employeeRole) {
        // Delete existing role
        const { error: deleteErr } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', employee.user_id);
        if (deleteErr) throw deleteErr;

        // Insert new role
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert({ user_id: employee.user_id, role });
        if (insertErr) throw insertErr;
      }

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      toast.success('Employee updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit Employee</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4">
          <div>
            <label className="label-meta mb-1.5 block">Name</label>
            <Input className="min-h-[48px]" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Phone</label>
            <Input className="min-h-[48px]" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Email</label>
            <Input className="min-h-[48px]" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[48px] flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
