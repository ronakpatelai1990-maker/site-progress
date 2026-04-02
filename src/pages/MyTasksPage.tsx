import { useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useInventory, useProfiles, Task } from '@/hooks/useSupabaseData';
import { CheckCircle2, Clock, ListFilter } from 'lucide-react';
import { motion } from 'framer-motion';

type FilterType = 'pending' | 'in_progress' | 'completed' | 'all';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Done' },
];

export default function MyTasksPage() {
  const { user } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: inventory = [] } = useInventory();
  const { data: profiles = [] } = useProfiles();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');

  const myTasks = useMemo(() => {
    const mine = tasks.filter(t => t.assigned_to === user?.id);
    if (filter === 'all') return mine;
    return mine.filter(t => t.status === filter);
  }, [tasks, user?.id, filter]);

  const pendingCount = tasks.filter(t => t.assigned_to === user?.id && t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.assigned_to === user?.id && t.status === 'in_progress').length;

  return (
    <AppShell title="My Tasks" subtitle={`${pendingCount} pending · ${inProgressCount} in progress`}>
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {FILTERS.map(f => (
          <motion.button
            key={f.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-accent text-accent-foreground'
                : 'border border-border bg-card text-foreground hover:bg-secondary'
            }`}
          >
            {f.value === 'pending' && <Clock className="h-3.5 w-3.5" />}
            {f.value === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {f.value === 'all' && <ListFilter className="h-3.5 w-3.5" />}
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {myTasks.map(task => (
          <TaskCard key={task.id} task={task} sites={sites} profiles={profiles} onClick={() => setSelectedTask(task)} />
        ))}
        {myTasks.length === 0 && (
          <div className="card-elevated flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-8 w-8 text-success/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {filter === 'all' ? 'No tasks assigned to you' : `No ${filter.replace('_', ' ')} tasks`}
            </p>
          </div>
        )}
      </div>

      <TaskDetailDrawer
        task={selectedTask} sites={sites} profiles={profiles} inventory={inventory}
        open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </AppShell>
  );
}
