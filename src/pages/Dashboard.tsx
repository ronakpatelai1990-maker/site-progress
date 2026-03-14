import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { FAB } from '@/components/FAB';
import { CreateTaskDrawer } from '@/components/CreateTaskDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, useProfiles, getLowStockItems, Task } from '@/hooks/useSupabaseData';
import { MapPin, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, profile } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();
  const { data: profiles = [] } = useProfiles();
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
