import { Home, MapPin, Package, User, BarChart3, ClipboardList } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const baseNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/daily', icon: ClipboardList, label: 'Daily' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const adminNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/daily', icon: ClipboardList, label: 'Daily' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const { role } = useAuth();
  const navItems = role === 'admin' ? adminNavItems : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `touch-target flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-muted-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
