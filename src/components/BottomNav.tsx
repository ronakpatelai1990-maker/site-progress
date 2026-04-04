import { Home, MapPin, Package, User, BarChart3, ClipboardList, ListChecks, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, useInventory, getLowStockItems } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';

const baseNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/my-tasks', icon: ListChecks, label: 'My Tasks' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/daily', icon: ClipboardList, label: 'Daily' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const adminNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/my-tasks', icon: ListChecks, label: 'My Tasks' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/daily', icon: ClipboardList, label: 'Daily' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const { role } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();
  const navItems = role === 'admin' ? adminNavItems : baseNavItems;

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const lowStockCount = getLowStockItems(inventory).length;

  const getBadge = (to: string) => {
    if (to === '/' && pendingCount > 0) return pendingCount;
    if (to === '/my-tasks' && pendingCount > 0) return pendingCount;
    if (to === '/inventory' && lowStockCount > 0) return lowStockCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const badge = getBadge(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative touch-target flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
