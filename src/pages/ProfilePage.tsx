import { AppShell } from '@/components/AppShell';
import { currentUser, users, getEngineers, getSupervisors } from '@/data/mock';
import { User, Phone, Mail, Shield } from 'lucide-react';

export default function ProfilePage() {
  const roleLabel = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

  return (
    <AppShell title="Profile" subtitle={roleLabel}>
      {/* User card */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <User className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{currentUser.name}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Shield className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-body">{currentUser.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-body">{currentUser.email}</span>
          </div>
        </div>
      </div>

      {/* Team - only for admin/engineer */}
      {currentUser.role !== 'supervisor' && (
        <div className="mt-6">
          <h2 className="label-meta mb-3">Team</h2>
          <div className="space-y-2">
            {users.filter(u => u.id !== currentUser.id).map(user => (
              <div key={user.id} className="card-elevated flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role} · {user.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
