import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { Task, getSiteById, getUserById } from '@/data/mock';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showSite?: boolean;
}

export function TaskCard({ task, onClick, showSite = true }: TaskCardProps) {
  const site = getSiteById(task.siteId);
  const assignee = getUserById(task.assignedTo);

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card-elevated w-full p-4 text-left transition-colors duration-150"
      layout
    >
      {/* L1: Title */}
      <p className="text-body font-semibold text-foreground">{task.title}</p>

      {/* L2: Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showSite && site && (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            <MapPin className="h-3 w-3" />
            {site.name}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          <Clock className="h-3 w-3" />
          {task.deadline}
        </span>
      </div>

      {/* L3: Status + Assignee */}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={task.status} />
        {assignee && (
          <span className="text-xs text-muted-foreground">{assignee.name}</span>
        )}
      </div>
    </motion.button>
  );
}
