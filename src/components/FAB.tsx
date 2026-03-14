import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  label?: string;
}

export function FAB({ onClick, label = 'Add' }: FABProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-accent px-5 text-accent-foreground shadow-lg"
      style={{ boxShadow: '0 4px 20px hsl(217 91% 60% / 0.35)' }}
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
      <span className="text-sm font-semibold">{label}</span>
    </motion.button>
  );
}
