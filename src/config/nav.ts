import type { LucideIcon } from 'lucide-react';
import {
  Home,
  CheckSquare,
  MapPin,
  ClipboardList,
  Package,
  BarChart2,
  Users,
  User,
} from 'lucide-react';
import type { AppUserRole } from '@/lib/roles';
import { hasPermission, type Permission } from '@/lib/roles';

export type NavKey =
  | 'home'
  | 'my-tasks'
  | 'sites'
  | 'daily'
  | 'stock'
  | 'reports'
  | 'team'
  | 'profile';

export interface NavItemDef {
  key: NavKey;
  to: string;
  label: string;
  icon: LucideIcon;
  /** Minimum permission needed to see this link */
  permission: Permission;
}

export const ALL_NAV_ITEMS: NavItemDef[] = [
  { key: 'home', to: '/', label: 'Home', icon: Home, permission: 'view:app' },
  { key: 'my-tasks', to: '/my-tasks', label: 'My Tasks', icon: CheckSquare, permission: 'view:tasks' },
  { key: 'sites', to: '/sites', label: 'Sites', icon: MapPin, permission: 'view:sites' },
  { key: 'daily', to: '/daily', label: 'Daily', icon: ClipboardList, permission: 'view:daily' },
  { key: 'stock', to: '/inventory', label: 'Stock', icon: Package, permission: 'view:stock' },
  { key: 'reports', to: '/reports', label: 'Reports', icon: BarChart2, permission: 'view:reports' },
  { key: 'team', to: '/team', label: 'Team', icon: Users, permission: 'view:team' },
  { key: 'profile', to: '/profile', label: 'Profile', icon: User, permission: 'view:app' },
];

export function filterNavForRole(role: AppUserRole | null): NavItemDef[] {
  return ALL_NAV_ITEMS.filter(i => hasPermission(role, i.permission));
}
