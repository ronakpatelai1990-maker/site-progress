import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================
// Types — matching your exact Supabase column names
// ============================================================

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  site_id: string | null;
  title: string;
  description: string | null;   // maps to your "description" column
  remarks: string | null;       // your extra remarks column
  status: TaskStatus;
  priority: string;             // text column, not enum
  assigned_to: string | null;
  assigned_name: string | null;
  deadline: string | null;      // your column is "deadline" not "due_date"
  created_by: string | null;
  created_at: string;
  updated_at: string;
  position: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  remarks?: string;
  status?: TaskStatus;
  priority?: string;
  assigned_name?: string;
  deadline?: string;
  site_id?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  status?: TaskStatus;
}

export interface GroupedTasks {
  pending: Task[];
  in_progress: Task[];
  completed: Task[];
}

// ============================================================
// Query key factory
// ============================================================

export const taskKeys = {
  all: ["tasks"] as const,
  bySite: (siteId?: string) => ["tasks", siteId] as const,
};

// ============================================================
// useTasks — fetch all tasks grouped by status
// ============================================================

export function useTasks(siteId?: string) {
  return useQuery({
    queryKey: taskKeys.bySite(siteId),
    queryFn: async (): Promise<GroupedTasks> => {
      let query = supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tasks = (data as Task[]) ?? [];

      // Normalise status — handle any unexpected values gracefully
      const normalise = (status: string): TaskStatus => {
        if (["todo", "in_progress", "done", "blocked"].includes(status)) {
          return status as TaskStatus;
        }
        return "todo";
      };

      return {
        todo: tasks.filter((t) => normalise(t.status) === "todo"),
        in_progress: tasks.filter((t) => normalise(t.status) === "in_progress"),
        done: tasks.filter((t) => normalise(t.status) === "done"),
        blocked: tasks.filter((t) => normalise(t.status) === "blocked"),
      };
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnReconnect: true,
  });
}

// ============================================================
// useCreateTask
// ============================================================

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          description: input.description ?? null,
          remarks: input.remarks ?? null,
          status: input.status ?? "todo",
          priority: input.priority ?? "medium",
          assigned_name: input.assigned_name ?? null,
          deadline: input.deadline ?? null,
          site_id: input.site_id ?? null,
          created_by: user?.id ?? null,
          position: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create task: " + error.message);
    },
  });
}

// ============================================================
// useUpdateTask
// ============================================================

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput) => {
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.remarks !== undefined) updateData.remarks = input.remarks;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.assigned_name !== undefined) updateData.assigned_name = input.assigned_name;
      if (input.deadline !== undefined) updateData.deadline = input.deadline;
      if (input.site_id !== undefined) updateData.site_id = input.site_id;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update task: " + error.message);
    },
  });
}

// ============================================================
// useDeleteTask
// ============================================================

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete task: " + error.message);
    },
  });
}

// ============================================================
// useUpdateTaskStatus — optimistic drag-and-drop
// ============================================================

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      siteId,
    }: {
      id: string;
      status: TaskStatus;
      siteId?: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { task: data as Task, siteId };
    },

    // Optimistic update — move card instantly before server responds
    onMutate: async ({ id, status, siteId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.bySite(siteId) });
      const previous = queryClient.getQueryData<GroupedTasks>(
        taskKeys.bySite(siteId)
      );

      if (previous) {
        const allTasks = [
          ...previous.todo,
          ...previous.in_progress,
          ...previous.done,
          ...previous.blocked,
        ];
        const task = allTasks.find((t) => t.id === id);
        if (task) {
          const updatedTask = { ...task, status };
          const without = (list: Task[]) => list.filter((t) => t.id !== id);

          queryClient.setQueryData<GroupedTasks>(taskKeys.bySite(siteId), {
            todo:
              status === "todo"
                ? [...without(previous.todo), updatedTask]
                : without(previous.todo),
            in_progress:
              status === "in_progress"
                ? [...without(previous.in_progress), updatedTask]
                : without(previous.in_progress),
            done:
              status === "done"
                ? [...without(previous.done), updatedTask]
                : without(previous.done),
            blocked:
              status === "blocked"
                ? [...without(previous.blocked), updatedTask]
                : without(previous.blocked),
          });
        }
      }

      return { previous, siteId };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          taskKeys.bySite(context.siteId),
          context.previous
        );
      }
      toast.error("Failed to move task — please try again");
    },

    onSettled: (_data, _error, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.bySite(siteId) });
    },
  });
}
