import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useSupabaseData';
import { User, Phone, Mail, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { profile, role, signOut } = useAuth();
  const { data: profiles = [] } = useProfiles();

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  return (
    <AppShell title="Profile" subtitle={roleLabel}>
      <div className="card-elevated p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <User className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{profile?.name || 'User'}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
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

      {role !== 'supervisor' && profiles.length > 1 && (
        <div className="mt-6">
          <h2 className="label-meta mb-3">Team</h2>
          <div className="space-y-2">
            {profiles.filter(u => u.user_id !== profile?.user_id).map(p => (
              <div key={p.id} className="card-elevated flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                </div>
              </div>
            ))}
          </div>
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
    </AppShell>
  );
}
