import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AppUserRole, Permission } from '@/lib/roles';
import { hasPermission } from '@/lib/roles';

type RoleGateProps =
  | {
      allowedRoles: AppUserRole[];
      requiredPermission?: never;
      children: ReactNode;
      fallback?: ReactNode;
    }
  | {
      allowedRoles?: never;
      requiredPermission: Permission;
      children: ReactNode;
      fallback?: ReactNode;
    };

export function RoleGate({ allowedRoles, requiredPermission, children, fallback = null }: RoleGateProps) {
  const { appRole } = useAuth();

  if (!appRole) return <>{fallback}</>;
  // Deny-by-default if misconfigured.
  if (!allowedRoles && !requiredPermission) return <>{fallback}</>;
  if (requiredPermission && !hasPermission(appRole, requiredPermission)) return <>{fallback}</>;
  if (allowedRoles && !allowedRoles.includes(appRole)) return <>{fallback}</>;
  return <>{children}</>;
}
