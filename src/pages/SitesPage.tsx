import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { sites, tasks, getUserById, Task } from '@/data/mock';
import { MapPin, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SitesPage() {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const siteTasks = selectedSite ? tasks.filter(t => t.siteId === selectedSite) : [];
  const site = selectedSite ? sites.find(s => s.id === selectedSite) : null;

  return (
    <AppShell
      title={site ? site.name : 'Sites'}
      subtitle={site ? site.location : `${sites.length} active sites`}
      action={
        selectedSite ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedSite(null)}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            All Sites
          </motion.button>
        ) : undefined
      }
    >
      {!selectedSite ? (
        <div className="space-y-3">
          {sites.map(s => {
            const engineer = getUserById(s.engineerId);
            const siteTaskCount = tasks.filter(t => t.siteId === s.id).length;
            const pending = tasks.filter(t => t.siteId === s.id && t.status !== 'completed').length;

            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedSite(s.id)}
                className="card-elevated w-full p-4 text-left"
              >
                <p className="text-body font-semibold text-foreground">{s.name}</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Started {s.startDate}
                  </div>
                  {engineer && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {engineer.name}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {siteTaskCount} tasks
                  </span>
                  {pending > 0 && (
                    <span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      {pending} pending
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {siteTasks.length === 0 ? (
            <div className="card-elevated flex items-center justify-center py-12">
              <p className="text-muted-foreground">No tasks for this site</p>
            </div>
          ) : (
            siteTasks.map(task => (
              <TaskCard key={task.id} task={task} showSite={false} onClick={() => setSelectedTask(task)} />
            ))
          )}
        </div>
      )}

      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </AppShell>
  );
}
