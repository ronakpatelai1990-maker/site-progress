import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { Task, TaskStatus } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo: { label: "To Do", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  in_progress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  done: { label: "Done", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  blocked: { label: "Blocked", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onViewDetail: (task: Task) => void;
  onDropTask: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanColumn({ status, tasks, onAddTask, onEditTask, onViewDetail, onDropTask }: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { role } = useAuth();
  const canCreate = role === "admin" || role === "engineer";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onDropTask(taskId, status);
  };

  return (
    <div
      className={`rounded-xl border border-border p-3 ${meta.bg} min-h-[200px]`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${meta.color}`}>{meta.label}</h3>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        {canCreate && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(status)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layoutId={task.id}
            draggable
            onDragStart={(e: any) => {
              e.dataTransfer?.setData("text/plain", task.id);
            }}
            onClick={() => onViewDetail(task)}
            className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-foreground line-clamp-2">{task.title}</p>
            {task.assigned_name && (
              <p className="text-xs text-muted-foreground mt-1">{task.assigned_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {task.priority && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  task.priority === "urgent" ? "bg-destructive/10 text-destructive" :
                  task.priority === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" :
                  task.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {task.priority}
                </span>
              )}
              {task.deadline && (
                <span className="text-xs text-muted-foreground">{task.deadline}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
