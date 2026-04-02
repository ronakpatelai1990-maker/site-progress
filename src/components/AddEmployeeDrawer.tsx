import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface AddEmployeeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'contractor', label: 'Contractor' },
];

export function AddEmployeeDrawer({ open, onOpenChange }: AddEmployeeDrawerProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('engineer');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setRole('engineer');
  };

  const handleAdd = async () => {
  if (!name.trim()) return toast.error('Name is required');
  if (!email.trim()) return toast.error('Email is required');
  if (!password || password.length < 6) return toast.error('Password must be at least 6 characters');

  setSaving(true);
  try {
    // Step 1: Sign up the new user
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (signUpErr) throw signUpErr;
    const userId = data.user?.id;
    if (!userId) throw new Error('User creation failed');

    // Step 2: Insert profile
    const { error: profileErr } = await supabase.from('profiles').insert({
      user_id: userId,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim(),
    });
    if (profileErr) throw profileErr;

    // Step 3: Assign role
    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
    });
    if (roleErr) throw roleErr;

    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['user_roles'] });
    toast.success(`${name} added as ${role}`);
    reset();
    onOpenChange(false);
  } catch (err: any) {
    toast.error(err.message || 'Failed to add employee');
  } finally {
    setSaving(false);
  }
};

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Add New Employee</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 overflow-y-auto">
          <div>
            <label className="label-meta mb-1.5 block">Full Name *</label>
            <Input
              className="min-h-[48px]"
              placeholder="e.g. Rajesh Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Email *</label>
            <Input
              className="min-h-[48px]"
              type="email"
              placeholder="e.g. rajesh@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Password *</label>
            <Input
              className="min-h-[48px]"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Phone</label>
            <Input
              className="min-h-[48px]"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="label-meta mb-1.5 block">Role *</label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pb-2">
            <Button
              variant="outline"
              className="min-h-[48px] flex-1"
              onClick={() => { reset(); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[48px] flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Employee'}
            </Button>
          </div>
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
