import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { role } = useAuth();
  if (!role || !allowedRoles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
