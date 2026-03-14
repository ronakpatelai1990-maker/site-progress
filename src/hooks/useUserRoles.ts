import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

export interface UserRole {
  user_id: string;
  role: AppRole;
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
  });
}

export function getRoleForUser(roles: UserRole[], userId: string): AppRole | null {
  return roles.find(r => r.user_id === userId)?.role ?? null;
}
