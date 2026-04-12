import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables, Enums } from '@/integrations/supabase/types';
import { mapLegacyRole, normalizeRole, type AppUserRole } from '@/lib/roles';

type AppRole = Enums<'app_role'>;
type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  appRole: AppUserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  appRole: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [teamRole, setTeamRole] = useState<AppUserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndRole = async (userId: string, email?: string | null) => {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      ]);
      setProfile(profileRes.data);
      setRole(roleRes.data?.role ?? null);

      // Prefer roles from `project_members`/`team_members` when present.
      // This is intentionally defensive so the app continues to work before Supabase schema changes land.
      try {
        const normalizedEmail = (email ?? '').trim().toLowerCase();

        let resolved: AppUserRole | null = null;

        if (normalizedEmail) {
          const { data: teamMember } = await supabase
            .from('team_members' as any)
            .select('role')
            .eq('email', normalizedEmail)
            .maybeSingle();
          resolved = normalizeRole(teamMember?.role) ?? null;
        }

        if (!resolved) {
          const { data: projectMember } = await supabase
            .from('project_members' as any)
            .select('role')
            .or(`user_id.eq.${userId}${normalizedEmail ? `,email.eq.${normalizedEmail}` : ''}`)
            .limit(1)
            .maybeSingle();
          resolved = normalizeRole(projectMember?.role) ?? null;
        }

        setTeamRole(resolved);
      } catch {
        setTeamRole(null);
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchProfileAndRole(session.user.id, session.user.email), 0);
        } else {
          setProfile(null);
          setRole(null);
          setTeamRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const appRole = useMemo<AppUserRole | null>(() => {
    return teamRole ?? mapLegacyRole(role);
  }, [teamRole, role]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, appRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
