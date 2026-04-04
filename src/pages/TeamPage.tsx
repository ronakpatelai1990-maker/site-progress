import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useIsOwner, useCanEdit } from '@/hooks/useUserRole';
import { RoleGate } from '@/components/RoleGate';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface TeamMember {
  user_id: string;
  name: string;
  email: string | null;
  role: AppRole | null;
  can_edit: boolean;
}

function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, name, email, can_edit'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data.map(r => [r.user_id, r.role]));
      return profilesRes.data.map(p => ({
        ...p,
        role: rolesMap.get(p.user_id) ?? null,
      })) as TeamMember[];
    },
  });
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  engineer: 'default',
  supervisor: 'secondary',
  contractor: 'outline',
};

export default function TeamPage() {
  const { user } = useAuth();
  const isOwner = useIsOwner();
  const _canEdit = useCanEdit();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useTeamMembers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('contractor');

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (roleErr) throw roleErr;
      const { error: profileErr } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
    setInviteEmail('');
    setInviteOpen(false);
  };

  return (
    <AppShell
      title="Team"
      subtitle="Manage team members & roles"
      action={
        <RoleGate allowedRoles={['admin', 'engineer']}>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
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
                {isOwner && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground text-sm">{m.name}</p>
                      {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner && m.user_id !== user?.id ? (
                      <Select
                        value={m.role ?? undefined}
                        onValueChange={(val) =>
                          updateRoleMutation.mutate({ userId: m.user_id, newRole: val as AppRole })
                        }
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant[m.role ?? ''] ?? 'outline'}>
                        {m.role ?? 'No role'}
                      </Badge>
                    )}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      {m.user_id !== user?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeMemberMutation.mutate(m.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
