import { useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Fetch sites for the filter dropdown
// ============================================================

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

// ============================================================
// Loading skeleton
// ============================================================

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {["Todo", "In Progress", "Done", "Blocked"].map((col) => (
        <div key={col} className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];

export default function MyTasksPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] =
    useState<TaskStatus>("todo");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: groupedTasks, isLoading } = useTasks(selectedSiteId);
  const { data: sites } = useSites();
  const updateStatus = useUpdateTaskStatus();

  // ---- Stats ----
  const totalTasks =
    (groupedTasks?.todo.length ?? 0) +
    (groupedTasks?.in_progress.length ?? 0) +
    (groupedTasks?.done.length ?? 0) +
    (groupedTasks?.blocked.length ?? 0);
  const doneTasks = groupedTasks?.done.length ?? 0;
  const blockedTasks = groupedTasks?.blocked.length ?? 0;

  const selectedSiteName = sites?.find((s) => s.id === selectedSiteId)?.name;

  // ---- Handlers ----

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null);
    setFormDefaultStatus(status);
    setFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setDetailTask(null);
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDropTask = (taskId: string, newStatus: TaskStatus) => {
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
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* ---- Page header ---- */}
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                My Tasks
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedSiteName ? (
                <span>{selectedSiteName} · </span>
              ) : null}
              {totalTasks} task{totalTasks !== 1 ? "s" : ""}
              {totalTasks > 0 && (
                <>
                  {" · "}
                  <span className="text-green-600">{doneTasks} done</span>
                  {blockedTasks > 0 && (
                    <>
                      {" · "}
                      <span className="text-red-500">{blockedTasks} blocked</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Site filter */}
            <Select
              value={selectedSiteId ?? "all"}
              onValueChange={(v) =>
                setSelectedSiteId(v === "all" ? undefined : v)
              }
            >
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sites</SelectItem>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* New task button */}
            <Button
              size="sm"
              className="h-9"
              onClick={() => handleAddTask("todo")}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New task
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Kanban board ---- */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {isLoading ? (
          <KanbanSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0 lg:min-w-[800px]">
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

      {/* ---- Modals ---- */}
      <TaskFormModal
        open={formOpen}
        onClose={handleFormClose}
        task={editingTask}
        defaultStatus={formDefaultStatus}
        siteId={selectedSiteId}
      />

      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
      />
    </div>
  );
}
