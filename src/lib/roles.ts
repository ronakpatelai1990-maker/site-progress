export type AppUserRole = 'Owner' | 'Editor' | 'Viewer' | 'Commentor' | 'Contractor';

export const ALL_ROLES: AppUserRole[] = ['Owner', 'Editor', 'Viewer', 'Commentor', 'Contractor'];

export function normalizeRole(role: string | null | undefined): AppUserRole | null {
  if (!role) return null;
  const r = role.trim().toLowerCase();
  if (r === 'owner') return 'Owner';
  if (r === 'editor') return 'Editor';
  if (r === 'viewer') return 'Viewer';
  if (r === 'commentor' || r === 'commenter') return 'Commentor';
  if (r === 'contractor') return 'Contractor';
  return null;
}

// Back-compat mapping from current Supabase enum `app_role`
export function mapLegacyRole(role: string | null | undefined): AppUserRole | null {
  const r = (role ?? '').toLowerCase();
  if (!r) return null;
  if (r === 'admin') return 'Owner';
  if (r === 'engineer') return 'Editor';
  if (r === 'supervisor') return 'Viewer';
  if (r === 'contractor') return 'Contractor';
  return null;
}

export type Permission =
  | 'view:app'
  | 'view:team'
  | 'manage:team'
  | 'view:reports'
  | 'view:stock'
  | 'edit:stock'
  | 'view:daily'
  | 'edit:daily'
  | 'view:sites'
  | 'edit:sites'
  | 'delete:sites'
  | 'view:tasks'
  | 'edit:tasks'
  | 'delete:tasks'
  | 'comment:tasks'
  | 'comment:daily';

export function hasPermission(role: AppUserRole | null, permission: Permission): boolean {
  if (!role) return permission === 'view:app';
  if (role === 'Owner') return true;

  if (role === 'Editor') {
    if (permission === 'delete:sites') return false;
    if (permission === 'manage:team' || permission === 'view:team') return false;
    if (permission === 'delete:tasks') return false;
    return true;
  }

  if (role === 'Viewer') {
    return (
      permission === 'view:app' ||
      permission === 'view:tasks' ||
      permission === 'view:sites' ||
      permission === 'view:daily' ||
      permission === 'view:stock' ||
      permission === 'view:reports' ||
      permission === 'comment:tasks' ||
      permission === 'comment:daily'
    );
  }

  if (role === 'Commentor') {
    return (
      permission === 'view:app' ||
      permission === 'view:tasks' ||
      permission === 'view:daily' ||
      permission === 'comment:tasks' ||
      permission === 'comment:daily'
    );
  }

  if (role === 'Contractor') {
    return permission === 'view:app' || permission === 'view:tasks' || permission === 'edit:tasks';
  }

  return false;
}

export function canAccessRoute(role: AppUserRole | null, pathname: string): boolean {
  if (pathname === '/' || pathname === '') return hasPermission(role, 'view:app');
  if (pathname.startsWith('/profile')) return hasPermission(role, 'view:app');

  if (pathname.startsWith('/my-tasks')) return hasPermission(role, 'view:tasks');
  if (pathname.startsWith('/sites')) return hasPermission(role, 'view:sites');
  if (pathname.startsWith('/daily')) return hasPermission(role, 'view:daily');
  if (pathname.startsWith('/inventory')) return hasPermission(role, 'view:stock');
  if (pathname.startsWith('/reports') || pathname.startsWith('/stock-report')) return hasPermission(role, 'view:reports');
  if (pathname.startsWith('/team')) return hasPermission(role, 'view:team');

  return true;
}

