import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, type Task, type TaskStatus } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  siteId?: string;
}

export function TaskFormModal({ open, onClose, task, defaultStatus = "pending", siteId }: TaskFormModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedName, setAssignedName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setAssignedName(task.assigned_name || "");
      setDeadline(task.deadline || "");
      setSelectedSiteId(task.site_id || "");
      setStatus(task.status);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssignedName("");
      setDeadline("");
      setSelectedSiteId(siteId || "");
      setStatus(defaultStatus);
    }
  }, [task, defaultStatus, siteId, open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (isEditing) {
      updateTask.mutate({
        id: task.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigned_name: assignedName.trim() || undefined,
        deadline: deadline || undefined,
        site_id: selectedSiteId || undefined,
        status,
      }, { onSuccess: onClose });
    } else {
      createTask.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigned_name: assignedName.trim() || undefined,
        deadline: deadline || undefined,
        site_id: selectedSiteId || undefined,
        status,
      }, { onSuccess: onClose });
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="min-h-[44px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Assigned To</label>
            <Input value={assignedName} onChange={(e) => setAssignedName(e.target.value)} placeholder="Person name" className="min-h-[44px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Site</label>
            <Select value={selectedSiteId || "none"} onValueChange={(v) => setSelectedSiteId(v === "none" ? "" : v)}>
              <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No site</SelectItem>
                {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="min-h-[44px]" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? "Saving..." : isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
