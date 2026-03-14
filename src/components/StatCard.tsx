import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ label, value, icon: Icon, variant = 'default', onClick }: StatCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`card-elevated flex w-full items-center gap-3 p-4 text-left transition-colors duration-150`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${variantStyles[variant]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div>
        <p className="tabular-nums text-2xl font-semibold text-foreground">{value}</p>
        <p className="label-meta mt-0.5">{label}</p>
      </div>
    </motion.button>
  );
}
