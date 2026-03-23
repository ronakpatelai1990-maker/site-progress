import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
  onClick?: () => void;
}

const gradientStyles = {
  default: 'gradient-navy',
  warning: 'gradient-warning',
  success: 'gradient-success',
  destructive: 'gradient-destructive',
};

export function StatCard({ label, value, icon: Icon, variant = 'default', onClick }: StatCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="card-elevated flex w-full flex-col gap-3 p-4 text-left overflow-hidden relative"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gradientStyles[variant]}`}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
      </div>
      <div>
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} className="text-2xl font-bold text-foreground" />
        ) : (
          <p className="tabular-nums text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="label-meta mt-0.5">{label}</p>
      </div>
      {/* Decorative gradient corner */}
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${gradientStyles[variant]} opacity-10`} />
    </motion.button>
  );
}
