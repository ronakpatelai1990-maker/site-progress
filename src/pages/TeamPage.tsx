import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useIsOwner } from '@/hooks/useUserRole';
import { RoleGate } from '@/components/RoleGate';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_ROLES, normalizeRole, type AppUserRole } from '@/lib/roles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  added_at?: string | null;
};

function useTeamMembersTable() {
  return useQuery({
    queryKey: ['team_members_table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members' as any)
        .select('id, name, email, role, phone, added_at')
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TeamMemberRow[];
    },
  });
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Owner: 'destructive',
  Editor: 'default',
  Viewer: 'secondary',
  Commentor: 'outline',
  Contractor: 'outline',
};

export default function TeamPage() {
  const { user } = useAuth();
  const isOwner = useIsOwner();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useTeamMembersTable();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppUserRole>('Editor');

  const [removeId, setRemoveId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; phone: string | null; role: AppUserRole }) => {
      const { error } = await supabase.from('team_members' as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team_members_table'] });
      await queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Member added');
      setAddOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setRole('Editor');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add member'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: string; newRole: AppUserRole }) => {
      const { error } = await supabase.from('team_members' as any).update({ role: newRole }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team_members_table'] });
      await queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team_members_table'] });
      await queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Member removed');
      setRemoveId(null);
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const currentUserEmail = useMemo(() => (user?.email ?? '').trim().toLowerCase(), [user?.email]);

  return (
    <AppShell
      title="Team"
      subtitle="Manage team members & roles"
      action={
        <RoleGate allowedRoles={['Owner']}>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </RoleGate>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                const normalized = normalizeRole(m.role) ?? (m.role as AppUserRole);
                const isSelf = m.email?.toLowerCase() === currentUserEmail;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                        {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isOwner && !isSelf ? (
                        <Select
                          value={normalized}
                          onValueChange={val => updateRoleMutation.mutate({ id: m.id, newRole: val as AppUserRole })}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map(r => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleBadgeVariant[normalized] ?? 'outline'}>{normalized}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <RoleGate allowedRoles={['Owner']}>
                        {!isSelf && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setRemoveId(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </RoleGate>
                    </TableCell>
                  </TableRow>
                );
              })}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No team members yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">Name</Label>
              <Input id="tm-name" value={name} onChange={e => setName(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-email">Email</Label>
              <Input id="tm-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={v => setRole(v as AppUserRole)}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-phone">Phone (optional)</Label>
              <Input id="tm-phone" value={phone} onChange={e => setPhone(e.target.value)} className="min-h-[44px]" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!name.trim() || !email.trim()) {
                  toast.error('Name and email are required');
                  return;
                }
                addMutation.mutate({
                  name: name.trim(),
                  email: email.trim().toLowerCase(),
                  phone: phone.trim() ? phone.trim() : null,
                  role,
                });
              }}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding…' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={open => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>This will remove them from the team list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeId && removeMutation.mutate(removeId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
