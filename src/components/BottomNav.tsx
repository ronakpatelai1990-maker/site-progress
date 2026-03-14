import { Home, MapPin, Package, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getLowStockItems } from '@/data/mock';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sites', icon: MapPin, label: 'Sites' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const lowStockCount = getLowStockItems().length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `touch-target flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-muted-foreground'
              }`
            }
          >
            <span className="relative">
              <Icon className="h-6 w-6" strokeWidth={1.8} />
              {label === 'Stock' && lowStockCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-subtle-pulse">
                  {lowStockCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
