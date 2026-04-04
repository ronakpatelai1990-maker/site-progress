import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
  const { role } = useAuth();
  return role;
}

export function useCanEdit() {
  const { role, profile } = useAuth();
  if (!role) return false;
  if (role === 'admin' || role === 'engineer') return true;
  if (profile?.can_edit) return true;
  return false;
}

export function useCanComment() {
  const { role } = useAuth();
  if (!role) return false;
  return ['admin', 'engineer', 'supervisor', 'contractor'].includes(role);
}

export function useIsOwner() {
  const { role } = useAuth();
  return role === 'admin';
}
