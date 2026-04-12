import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mapLegacyRole, normalizeRole, type AppUserRole } from '@/lib/roles';

export function useUserRole(siteId?: string) {
  const { user, appRole, role } = useAuth();

  // Prefer per-site role from `project_members` (if it exists), then `team_members`, else AuthProvider fallback.
  const { data } = useQuery({
    queryKey: ['user_role', user?.id, user?.email, siteId],
    queryFn: async (): Promise<AppUserRole | null> => {
      if (!user) return null;

      // 1) project_members (site-specific)
      if (siteId) {
        try {
          const { data: pm } = await supabase
            .from('project_members' as any)
            .select('role')
            .eq('site_id', siteId)
            .or(`user_id.eq.${user.id},email.eq.${(user.email ?? '').toLowerCase()}`)
            .maybeSingle();
          const r = normalizeRole(pm?.role);
          if (r) return r;
        } catch {
          // ignore
        }
      }

      // 2) team_members (org-level)
      try {
        const email = (user.email ?? '').trim().toLowerCase();
        if (email) {
          const { data: tm } = await supabase
            .from('team_members' as any)
            .select('role')
            .eq('email', email)
            .maybeSingle();
          const r = normalizeRole(tm?.role);
          if (r) return r;
        }
      } catch {
        // ignore
      }

      return appRole ?? mapLegacyRole(role);
    },
    enabled: !!user,
  });

  return data ?? appRole ?? mapLegacyRole(role);
}

export function useCanEdit() {
  const { appRole, profile, role } = useAuth();
  const effective = appRole ?? mapLegacyRole(role);
  if (!effective) return false;
  if (effective === 'Owner' || effective === 'Editor') return true;
  if (profile?.can_edit) return true; // back-compat toggle
  return false;
}

export function useCanComment() {
  const { appRole, role } = useAuth();
  const effective = appRole ?? mapLegacyRole(role);
  if (!effective) return false;
  return effective === 'Owner' || effective === 'Editor' || effective === 'Viewer' || effective === 'Commentor' || effective === 'Contractor';
}

export function useIsOwner() {
  const { appRole, role } = useAuth();
  const effective = appRole ?? mapLegacyRole(role);
  return effective === 'Owner';
}
