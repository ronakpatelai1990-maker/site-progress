import { NavLink } from 'react-router-dom';
import { filterNavForRole } from '@/config/nav';
import { useAuth } from '@/hooks/useAuth';
import logoImg from '/logo-192.png';

export function DesktopSidebar() {
  const { appRole } = useAuth();
  const items = filterNavForRole(appRole);

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-background/95 md:backdrop-blur md:sticky md:top-0 md:h-screen md:shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <img src={logoImg} alt="Site Stock Sync" className="h-9 w-9 rounded-lg" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">Site Stock Sync</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {items.map(({ to, label, icon: Icon, key }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/15 text-accent' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
