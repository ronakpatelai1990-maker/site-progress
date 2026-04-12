import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, useInventory, getLowStockItems } from '@/hooks/useSupabaseData';
import { filterNavForRole, type NavKey } from '@/config/nav';

const PRIMARY_KEYS: NavKey[] = ['home', 'my-tasks', 'sites', 'stock', 'profile'];
const MORE_KEYS: NavKey[] = ['daily', 'reports', 'team'];

export function BottomNav() {
  const navigate = useNavigate();
  const { appRole } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();
  const [moreOpen, setMoreOpen] = useState(false);

  const allowed = useMemo(() => filterNavForRole(appRole), [appRole]);

  const primaryItems = PRIMARY_KEYS.map(k => allowed.find(i => i.key === k)).filter(Boolean) as ReturnType<typeof filterNavForRole>;
  const moreItems = MORE_KEYS.map(k => allowed.find(i => i.key === k)).filter(Boolean) as ReturnType<typeof filterNavForRole>;

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const lowStockCount = getLowStockItems(inventory).length;

  const getBadge = (key: NavKey) => {
    if (key === 'my-tasks' && pendingCount > 0) return pendingCount;
    if (key === 'stock' && lowStockCount > 0) return lowStockCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur pb-safe md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between px-1">
        {primaryItems.map(({ to, icon: Icon, label, key }) => {
          const badge = getBadge(key);
          return (
            <NavLink
              key={key}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative touch-target flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors duration-200 shrink-0 min-w-[56px] ${
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
                  <span className="truncate max-w-[64px]">{label}</span>
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

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative touch-target flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium text-muted-foreground shrink-0 min-w-[56px]"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-1 gap-2 pb-6">
              {moreItems.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No additional pages available for your role.</p>
              ) : (
                moreItems.map(item => (
                  <Button
                    key={item.key}
                    variant="secondary"
                    className="justify-start gap-3 h-12"
                    onClick={() => {
                      setMoreOpen(false);
                      navigate(item.to);
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
