import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { FAB } from '@/components/FAB';
import { CreateTaskDrawer } from '@/components/CreateTaskDrawer';
import { OnboardingScreens } from '@/components/OnboardingScreens';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, useProfiles, getLowStockItems, Task } from '@/hooks/useSupabaseData';
import { useDailyReports } from '@/hooks/useDailyReports';
import { hasPermission } from '@/lib/roles';
import { useCanEdit } from '@/hooks/useUserRole';
import { MapPin, ClipboardList, CheckCircle2, AlertTriangle, FileText, Plus, Package, BarChart3, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, profile, appRole } = useAuth();
  const canEdit = useCanEdit();
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: inventory = [] } = useInventory();
  const { data: profiles = [] } = useProfiles();
  const { data: dailyReports = [] } = useDailyReports();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('onboarding_done')) {
      setShowOnboarding(true);
    }
  }, []);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const lowStockItems = getLowStockItems(inventory);

  const isContractor = appRole === 'Contractor';
  const isSupervisorLegacy = role === 'supervisor';
  const visibleTasks = isContractor || isSupervisorLegacy
    ? tasks.filter(t => t.assigned_to === user?.id && t.status !== 'completed')
    : pendingTasks;

  const firstName = profile?.name?.split(' ')[0] || 'there';
  const canCreate = canEdit;
  const showOpsOverview = !isContractor;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReports = useMemo(
    () => dailyReports.filter(r => r.report_date === todayStr),
    [dailyReports, todayStr]
  );

  const isLoading = sitesLoading || tasksLoading;

  if (showOnboarding) {
    return <OnboardingScreens onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <AppShell
      title={isContractor || isSupervisorLegacy ? 'My Tasks' : 'Site Stock Sync'}
      subtitle={`Welcome, ${firstName}`}
    >
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {showOpsOverview && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                {hasPermission(appRole, 'view:sites') && (
                  <StatCard label="Sites" value={sites.length} icon={MapPin} onClick={() => navigate('/sites')} />
                )}
                <StatCard label="Pending" value={pendingTasks.length} icon={ClipboardList} variant="warning" />
                <StatCard label="Completed" value={completedTasks.length} icon={CheckCircle2} variant="success" />
                {hasPermission(appRole, 'view:stock') && (
                  <StatCard
                    label="Low Stock"
                    value={lowStockItems.length}
                    icon={AlertTriangle}
                    variant={lowStockItems.length > 0 ? 'destructive' : 'default'}
                    onClick={() => navigate('/inventory')}
                  />
                )}
              </div>

              {/* Quick actions */}
              {canCreate && (
                <div className="mt-5">
                  <h2 className="label-meta mb-2">Quick Actions</h2>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(
                      [
                        hasPermission(appRole, 'edit:daily')
                          ? { label: 'Add Report', icon: FileText as LucideIcon, action: () => navigate('/daily') }
                          : null,
                        hasPermission(appRole, 'view:stock')
                          ? { label: 'Check Stock', icon: Package as LucideIcon, action: () => navigate('/inventory') }
                          : null,
                        hasPermission(appRole, 'edit:tasks')
                          ? { label: 'Add Task', icon: Plus as LucideIcon, action: () => setShowCreateTask(true) }
                          : null,
                        hasPermission(appRole, 'view:reports')
                          ? { label: 'Usage Report', icon: BarChart3 as LucideIcon, action: () => navigate('/stock-report') }
                          : null,
                      ].filter(Boolean) as Array<{ label: string; icon: LucideIcon; action: () => void }>
                    ).map(entry => (
                      <motion.button
                        key={entry.label}
                        whileTap={{ scale: 0.95 }}
                        onClick={entry.action}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <entry.icon className="h-4 w-4 text-accent" />
                        {entry.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's reports */}
              {hasPermission(appRole, 'view:daily') && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="label-meta">Today's Reports</h2>
                    <button onClick={() => navigate('/daily')} className="text-xs font-semibold text-accent">
                      View all →
                    </button>
                  </div>
                  {todaysReports.length === 0 ? (
                    <div className="card-elevated flex flex-col items-center justify-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No reports submitted today</p>
                      {canCreate && hasPermission(appRole, 'edit:daily') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5 text-accent border-accent/30"
                          onClick={() => navigate('/daily')}
                        >
                          <Plus className="h-3.5 w-3.5" /> Submit Report
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaysReports.map(report => {
                        const site = sites.find(s => s.id === report.site_id);
                        const workCount = report.work_rows?.length || 0;
                        const matCount = report.material_rows?.length || 0;
                        const preview =
                          report.tomorrow_plan?.trim() ||
                          report.issues?.trim() ||
                          (report.weather ? `Weather: ${report.weather}` : 'Daily report');
                        return (
                          <motion.button
                            key={report.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/daily')}
                            className="card-elevated w-full text-left p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-amber">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{site?.name || 'Unknown site'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{preview}</p>
                                <div className="flex gap-3 mt-1.5">
                                  {typeof report.total_workers === 'number' && report.total_workers > 0 && (
                                    <span className="text-xs text-muted-foreground">👷 {report.total_workers}</span>
                                  )}
                                  {workCount > 0 && <span className="text-xs text-muted-foreground">🧱 {workCount}</span>}
                                  {matCount > 0 && <span className="text-xs text-muted-foreground">📦 {matCount}</span>}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Active tasks */}
          <div className="mt-5">
            <h2 className="label-meta mb-2">
              {isContractor || isSupervisorLegacy ? `${visibleTasks.length} tasks remaining` : 'Active Tasks'}
            </h2>
            <div className="space-y-3">
              {visibleTasks.map(task => (
                <TaskCard key={task.id} task={task} sites={sites} profiles={profiles} onClick={() => setSelectedTask(task)} />
              ))}
              {visibleTasks.length === 0 && (
                <div className="card-elevated flex flex-col items-center justify-center py-10">
                  <CheckCircle2 className="h-8 w-8 text-success/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No active tasks</p>
                  {canCreate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5 text-accent border-accent/30"
                      onClick={() => setShowCreateTask(true)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Create Task
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {canCreate && <FAB onClick={() => setShowCreateTask(true)} label="Task" />}

      <TaskDetailDrawer
        task={selectedTask} sites={sites} profiles={profiles} inventory={inventory}
        open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}
      />
      <CreateTaskDrawer
        open={showCreateTask} onOpenChange={setShowCreateTask}
        sites={sites} profiles={profiles}
      />
    </AppShell>
  );
}
