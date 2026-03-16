import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useUserRoles, getRoleForUser } from '@/hooks/useUserRoles';
import { EditEmployeeDrawer } from '@/components/EditEmployeeDrawer';
import { AddEmployeeDrawer } from '@/components/AddEmployeeDrawer';
import { User, Phone, Mail, Shield, LogOut, Pencil, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/hooks/useSupabaseData';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

const roleBadgeClass: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  engineer: 'bg-accent/10 text-accent',
  supervisor: 'bg-warning/10 text-warning',
};

export default function ProfilePage() {
  const { profile, role, signOut } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const isAdmin = role === 'admin';
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  const handleEditEmployee = (emp: Profile) => {
    const empRole = getRoleForUser(userRoles, emp.user_id);
    setEditingRole(empRole);
    setEditingEmployee(emp);
  };

  return (
    <AppShell title="Profile" subtitle={roleLabel}>
      {/* Own profile card */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <User className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{profile?.name || 'User'}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass[role as AppRole] || 'bg-primary/10 text-primary'}`}>
              <Shield className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          {profile?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-body">{profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-body">{profile?.email}</span>
          </div>
        </div>
      </div>

      {/* Team list — visible to admin & engineer */}
      {role !== 'supervisor' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="label-meta">
              Team ({profiles.filter(u => u.user_id !== profile?.user_id).length})
            </h2>
            {isAdmin && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 gap-1.5 px-3 text-xs"
                onClick={() => setShowAddEmployee(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Employee
              </Button>
            )}
          </div>

          {profiles.filter(u => u.user_id !== profile?.user_id).length === 0 ? (
            <div className="card-elevated flex flex-col items-center justify-center py-8">
              <User className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">Tap "Add Employee" to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.filter(u => u.user_id !== profile?.user_id).map(p => {
                const empRole = getRoleForUser(userRoles, p.user_id);
                const empRoleLabel = empRole ? empRole.charAt(0).toUpperCase() + empRole.slice(1) : 'User';
                return (
                  <div key={p.id} className="card-elevated flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeClass[empRole as AppRole] || 'bg-muted text-muted-foreground'}`}>
                          <Shield className="h-2.5 w-2.5" />
                          {empRoleLabel}
                        </span>
                        {p.phone && (
                          <span className="text-xs text-muted-foreground truncate">{p.phone}</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleEditEmployee(p)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Button
        variant="outline"
        className="mt-6 min-h-[48px] w-full text-destructive"
        onClick={signOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>

      {isAdmin && (
        <>
          <EditEmployeeDrawer
            employee={editingEmployee}
            employeeRole={editingRole}
            open={!!editingEmployee}
            onOpenChange={(o) => !o && setEditingEmployee(null)}
          />
          <AddEmployeeDrawer
            open={showAddEmployee}
            onOpenChange={setShowAddEmployee}
          />
        </>
      )}
    </AppShell>
  );
}
