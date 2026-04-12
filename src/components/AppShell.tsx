import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { NotificationBell } from './NotificationBell';
import { LowStockBell } from './LowStockBell';
import logoImg from '/logo-192.png';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, subtitle, action }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <DesktopSidebar />

      <div className="min-w-0 flex-1 flex flex-col">
        {title && (
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex w-full max-w-lg md:max-w-3xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={logoImg} alt="Site Stock Sync" className="h-8 w-8 rounded-lg md:hidden" />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
                  {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <LowStockBell />
                <NotificationBell />
                {action}
              </div>
            </div>
          </header>
        )}

        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-4 pb-24 pt-4 md:pb-10 animate-page-enter">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
