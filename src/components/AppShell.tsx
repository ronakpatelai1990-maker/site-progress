import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { NotificationBell } from './NotificationBell';
import logoImg from '/logo-192.png';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, subtitle, action }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {title && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="Site Stock Sync" className="h-8 w-8 rounded-lg" />
              <div>
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {action}
          </div>
        </header>
      )}

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4 animate-page-enter">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
