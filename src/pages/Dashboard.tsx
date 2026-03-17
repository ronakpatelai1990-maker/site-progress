import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { FAB } from '@/components/FAB';
import { CreateTaskDrawer } from '@/components/CreateTaskDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, useProfiles, getLowStockItems, Task } from '@/hooks/useSupabaseData';
import { useDailyReports } from '@/hooks/useDailyReports';
import { MapPin, ClipboardList, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, profile } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();
  const { data: profiles = [] } = useProfiles();
  const { data: dailyReports = [] } = useDailyReports();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const lowStockItems = getLowStockItems(inventory);

  const isSupervisor = role === 'supervisor';
  const visibleTasks = isSupervisor
    ? tasks.filter(t => t.assigned_to === user?.id && t.status !== 'completed')
    : pendingTasks;

  const firstName = profile?.name?.split(' ')[0] || 'there';
  const canCreate = role === 'admin' || role === 'engineer';

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReports = useMemo(
    () => dailyReports.filter(r => r.report_date === todayStr),
    [dailyReports, todayStr]
  );

  return (
    <AppShell
      title={isSupervisor ? 'My Tasks' : 'Dashboard'}
      subtitle={`Welcome, ${firstName}`}
    >
      {!isSupervisor && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sites" value={sites.length} icon={MapPin} onClick={() => navigate('/sites')} />
          <StatCard label="Pending" value={pendingTasks.length} icon={ClipboardList} variant="warning" />
          <StatCard label="Completed" value={completedTasks.length} icon={CheckCircle2} variant="success" />
          <StatCard
            label="Low Stock"
            value={lowStockItems.length}
            icon={AlertTriangle}
            variant={lowStockItems.length > 0 ? 'destructive' : 'default'}
            onClick={() => navigate('/inventory')}
          />
        </div>
      )}

      {/* Today's Daily Reports Summary */}
      {!isSupervisor && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="label-meta">Today's Reports</h2>
            <button
              onClick={() => navigate('/daily')}
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </button>
          </div>
          {todaysReports.length === 0 ? (
            <div className="card-elevated flex items-center justify-center py-8">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No reports submitted today</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysReports.map(report => {
                const site = sites.find(s => s.id === report.site_id);
                const manpowerArr = (report.manpower as { role: string; count: number }[]) || [];
                const totalWorkers = manpowerArr.reduce((sum, m) => sum + (m.count || 0), 0);
                const materialsArr = (report.materials_used as { inventory_id: string; qty_used: number }[]) || [];
                return (
                  <button
                    key={report.id}
                    onClick={() => navigate('/daily')}
                    className="card-elevated w-full text-left p-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <FileText className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {site?.name || 'Unknown site'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {report.work_description}
                        </p>
                        <div className="flex gap-3 mt-1.5">
                          {totalWorkers > 0 && (
                            <span className="text-xs text-muted-foreground">
                              👷 {totalWorkers} workers
                            </span>
                          )}
                          {materialsArr.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              📦 {materialsArr.length} materials
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="label-meta mb-3">
          {isSupervisor ? `${visibleTasks.length} tasks remaining` : 'Active Tasks'}
        </h2>
        <div className="space-y-3">
          {visibleTasks.map(task => (
            <TaskCard key={task.id} task={task} sites={sites} profiles={profiles} onClick={() => setSelectedTask(task)} />
          ))}
          {visibleTasks.length === 0 && (
            <div className="card-elevated flex items-center justify-center py-12">
              <p className="text-muted-foreground">No active tasks</p>
            </div>
          )}
        </div>
      </div>

      {canCreate && <FAB onClick={() => setShowCreateTask(true)} label="Task" />}

      <TaskDetailDrawer
        task={selectedTask}
        sites={sites}
        profiles={profiles}
        inventory={inventory}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />

      <CreateTaskDrawer
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        sites={sites}
        profiles={profiles}
      />
    </AppShell>
  );
}
