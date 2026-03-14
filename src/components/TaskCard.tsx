import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Task, Site, Profile } from '@/hooks/useSupabaseData';

interface TaskCardProps {
  task: Task;
  sites: Site[];
  profiles: Profile[];
  onClick?: () => void;
  showSite?: boolean;
}

export function TaskCard({ task, sites, profiles, onClick, showSite = true }: TaskCardProps) {
  const site = sites.find(s => s.id === task.site_id);
  const assignee = profiles.find(p => p.user_id === task.assigned_to);

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card-elevated w-full p-4 text-left transition-colors duration-150"
      layout
    >
      <p className="text-body font-semibold text-foreground">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showSite && site && (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            <MapPin className="h-3 w-3" />
            {site.name}
          </span>
        )}
        {task.deadline && (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            <Clock className="h-3 w-3" />
            {task.deadline}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={task.status} />
        {assignee && (
          <span className="text-xs text-muted-foreground">{assignee.name}</span>
        )}
      </div>
    </motion.button>
  );
}
