interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed';
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
  in_progress: { label: 'In Progress', className: 'bg-accent/10 text-accent' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
        status === 'pending' ? 'bg-warning' :
        status === 'in_progress' ? 'bg-accent' : 'bg-success'
      }`} />
      {config.label}
    </span>
  );
}
