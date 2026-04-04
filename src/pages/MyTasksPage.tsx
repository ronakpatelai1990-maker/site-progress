import { useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import {
  useTasks,
  useUpdateTaskStatus,
  type Task,
  type TaskStatus,
} from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {["Pending", "In Progress", "Completed"].map((col) => (
        <div key={col} className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

const COLUMNS: TaskStatus[] = ["pending", "in_progress", "completed"];

export default function MyTasksPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>("pending");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const { role } = useAuth();
  const { data: groupedTasks, isLoading } = useTasks(selectedSiteId);
  const { data: sites } = useSites();
  const updateStatus = useUpdateTaskStatus();

  const isContractor = role === "contractor";
  const canCreate = role === "admin" || role === "engineer";

  const totalTasks =
    (groupedTasks?.pending.length ?? 0) +
    (groupedTasks?.in_progress.length ?? 0) +
    (groupedTasks?.completed.length ?? 0);
  const completedTasks = groupedTasks?.completed.length ?? 0;

  const selectedSiteName = sites?.find((s) => s.id === selectedSiteId)?.name;

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null);
    setFormDefaultStatus(status);
    setFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    if (isContractor) return; // contractors can't edit
    setDetailTask(null);
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDeleteTask = (_id: string) => {
    // handled in form modal
  };

  const handleDropTask = (taskId: string, newStatus: TaskStatus) => {
    // Contractors can only move to pending or completed
    if (isContractor && newStatus === "in_progress") return;
    updateStatus.mutate({
      id: taskId,
      status: newStatus,
      siteId: selectedSiteId,
    });
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTask(null);
  };

  return (
     <AppShell
        title="My Tasks"
        subtitle={`${selectedSiteName ? selectedSiteName + " · " : ""}${totalTasks} task${totalTasks !== 1 ? "s" : ""}${totalTasks > 0 ? ` · ${completedTasks} done` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Select
              value={selectedSiteId ?? "all"}
              onValueChange={(v) => setSelectedSiteId(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sites</SelectItem>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreate && (
              <Button size="sm" className="h-9" onClick={() => handleAddTask("pending")}>
                <Plus className="h-4 w-4 mr-1.5" />
                New
              </Button>
            )}
          </div>
        }
      >
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <KanbanSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 lg:min-w-[600px]">
              {COLUMNS.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={groupedTasks?.[status] ?? []}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onViewDetail={setDetailTask}
                  onDropTask={handleDropTask}
                />
              ))}
            </div>
          )}
        </div>

        {canCreate && (
          <TaskFormModal
            open={formOpen}
            onClose={handleFormClose}
            task={editingTask}
            defaultStatus={formDefaultStatus}
            siteId={selectedSiteId}
          />
        )}

        <TaskDetailModal
          task={detailTask}
          open={!!detailTask}
          onClose={() => setDetailTask(null)}
        />
      </AppShell>
  );
}
