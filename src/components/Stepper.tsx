import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function Stepper({ value, onChange, min = 0, max = 9999, step = 1, unit }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className="touch-target rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
      >
        <Minus className="h-5 w-5" />
      </motion.button>

      <div className="min-w-[80px] text-center">
        <span className="tabular-nums text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        className="touch-target rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
      >
        <Plus className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
