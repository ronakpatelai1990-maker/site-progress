import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User } from "lucide-react";
import { useUpdateTaskStatus, type Task, type TaskStatus } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  const { role } = useAuth();
  const updateStatus = useUpdateTaskStatus();
  const isContractor = role === "contractor";

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("id, name, location").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!task) return null;

  const site = sites?.find((s) => s.id === task.site_id);

  // Contractors can only toggle between pending and completed
  const availableStatuses: TaskStatus[] = isContractor
    ? ["pending", "completed"]
    : ["pending", "in_progress", "completed"];

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateStatus.mutate(
      { id: task.id, status: newStatus, siteId: task.site_id ?? undefined },
      {
        onSuccess: () => toast.success(`Status → ${STATUS_LABELS[newStatus]}`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          <div className="space-y-2">
            {site && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{site.name} — {site.location}</span>
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {task.deadline}</span>
              </div>
            )}
            {task.assigned_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{task.assigned_name}</span>
              </div>
            )}
            {task.priority && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Priority:</span>
                <span className="capitalize">{task.priority}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Update Status</p>
            <div className={`grid gap-2 ${isContractor ? "grid-cols-2" : "grid-cols-3"}`}>
              {availableStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={task.status === s ? "default" : "outline"}
                  className="min-h-[40px]"
                  onClick={() => handleStatusChange(s)}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
