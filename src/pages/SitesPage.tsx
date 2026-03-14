import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TaskCard } from '@/components/TaskCard';
import { TaskDetailDrawer } from '@/components/TaskDetailDrawer';
import { FAB } from '@/components/FAB';
import { CreateSiteDrawer } from '@/components/CreateSiteDrawer';
import { CreateTaskDrawer } from '@/components/CreateTaskDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSites, useTasks, useProfiles, useInventory, Task } from '@/hooks/useSupabaseData';
import { MapPin, Calendar, User, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SitesPage() {
  const { role } = useAuth();
  const { data: sites = [] } = useSites();
  const { data: tasks = [] } = useTasks();
  const { data: profiles = [] } = useProfiles();
  const { data: inventory = [] } = useInventory();
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const siteTasks = selectedSite ? tasks.filter(t => t.site_id === selectedSite) : [];
  const site = selectedSite ? sites.find(s => s.id === selectedSite) : null;
  const canCreate = role === 'admin' || role === 'engineer';

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
            const engineer = profiles.find(p => p.user_id === s.engineer_id);
            const siteTaskCount = tasks.filter(t => t.site_id === s.id).length;
            const pending = tasks.filter(t => t.site_id === s.id && t.status !== 'completed').length;

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
                    Started {s.start_date}
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
          {sites.length === 0 && (
            <div className="card-elevated flex items-center justify-center py-12">
              <p className="text-muted-foreground">No sites yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {canCreate && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCreateTask(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/30 py-3 text-sm font-medium text-accent"
            >
              <Plus className="h-4 w-4" />
              Add Task to {site?.name}
            </motion.button>
          )}
          {siteTasks.length === 0 ? (
            <div className="card-elevated flex items-center justify-center py-12">
              <p className="text-muted-foreground">No tasks for this site</p>
            </div>
          ) : (
            siteTasks.map(task => (
              <TaskCard key={task.id} task={task} sites={sites} profiles={profiles} showSite={false} onClick={() => setSelectedTask(task)} />
            ))
          )}
        </div>
      )}

      {canCreate && !selectedSite && <FAB onClick={() => setShowCreateSite(true)} label="Site" />}

      <TaskDetailDrawer
        task={selectedTask}
        sites={sites}
        profiles={profiles}
        inventory={inventory}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />

      <CreateSiteDrawer
        open={showCreateSite}
        onOpenChange={setShowCreateSite}
        profiles={profiles}
      />

      <CreateTaskDrawer
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        sites={sites}
        profiles={profiles}
        defaultSiteId={selectedSite || undefined}
      />
    </AppShell>
  );
}
