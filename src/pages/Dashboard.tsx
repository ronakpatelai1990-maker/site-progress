import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { sites, tasks, getLowStockItems, currentUser, Task } from '@/data/mock';
import { MapPin, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const lowStockItems = getLowStockItems();

  // For supervisors, show only their tasks
  const visibleTasks = currentUser.role === 'supervisor'
    ? tasks.filter(t => t.assignedTo === currentUser.id && t.status !== 'completed')
    : pendingTasks;

  return (
    <AppShell
      title={currentUser.role === 'supervisor' ? 'My Tasks' : 'Dashboard'}
      subtitle={`Welcome, ${currentUser.name.split(' ')[0]}`}
    >
      {/* Stats */}
      {currentUser.role !== 'supervisor' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Sites"
            value={sites.length}
            icon={MapPin}
            onClick={() => navigate('/sites')}
          />
          <StatCard
            label="Pending"
            value={pendingTasks.length}
            icon={ClipboardList}
            variant="warning"
          />
          <StatCard
            label="Completed"
            value={completedTasks.length}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            label="Low Stock"
            value={lowStockItems.length}
            icon={AlertTriangle}
            variant={lowStockItems.length > 0 ? 'destructive' : 'default'}
            onClick={() => navigate('/inventory')}
          />
        </div>
      )}

      {/* Active Tasks */}
      <div className="mt-6">
        <h2 className="label-meta mb-3">
          {currentUser.role === 'supervisor' ? `${visibleTasks.length} tasks remaining` : 'Active Tasks'}
        </h2>
        <div className="space-y-3">
          {visibleTasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
          ))}
          {visibleTasks.length === 0 && (
            <div className="card-elevated flex items-center justify-center py-12">
              <p className="text-muted-foreground">No active tasks</p>
            </div>
          )}
        </div>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </AppShell>
  );
}
