import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, subtitle, action }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
        </header>
      )}

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
