import { useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, User, Calendar, Trash2, Pencil } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { type Task } from "@/hooks/useTasks";

// ============================================================
// Priority config — using text values (not enum)
// ============================================================

const priorityConfig: Record<
  string,
  { label: string; border: string; badge: string }
> = {
  low: {
    label: "Low",
    border: "border-l-gray-400",
    badge: "bg-gray-100 text-gray-700",
  },
  medium: {
    label: "Medium",
    border: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  high: {
    label: "High",
    border: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  urgent: {
    label: "Urgent",
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700",
  },
};

const defaultPriority = {
  label: "Medium",
  border: "border-l-blue-400",
  badge: "bg-blue-100 text-blue-700",
};

// ============================================================
// Props
// ============================================================

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onViewDetail: (task: Task) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

// ============================================================
// Component
// ============================================================

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onViewDetail,
  onDragStart,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priority = priorityConfig[task.priority] ?? defaultPriority;

  // Uses your "deadline" column
  const isOverdue =
    task.deadline &&
    task.status !== "completed" &&
    isPast(parseISO(task.deadline));

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-menu]")) return;
    onViewDetail(task);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id)}
      onClick={handleCardClick}
      className={`
        bg-background border border-border rounded-lg p-3
        border-l-4 ${priority.border}
        cursor-pointer select-none
        hover:shadow-sm transition-shadow
      `}
    >
      {/* Title + menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground leading-snug flex-1">
          {task.title}
        </p>
        <div data-menu>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(task);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(task.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description preview — uses your "description" column */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Remarks preview — your extra "remarks" column */}
      {task.remarks && !task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {task.remarks}
        </p>
      )}

      {/* Priority badge */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.badge}`}
        >
          {priority.label}
        </span>
      </div>

      {/* Bottom — assignee + deadline */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
        {task.assigned_name ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{task.assigned_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <User className="h-3 w-3" />
            <span>Unassigned</span>
          </div>
        )}

        {/* Uses your "deadline" column */}
        {task.deadline && (
          <div
            className={`flex items-center gap-1 text-xs shrink-0 ${
              isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {isOverdue ? "Overdue · " : ""}
              {format(parseISO(task.deadline), "d MMM")}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
