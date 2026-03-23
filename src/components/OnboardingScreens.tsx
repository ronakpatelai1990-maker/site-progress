import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, Package, ClipboardList, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const slides = [
  {
    icon: HardHat,
    title: 'Welcome to Site Stock Sync',
    description: 'Your all-in-one construction site management app. Track stock, manage tasks, and submit daily reports — all from your phone.',
    color: 'gradient-amber',
  },
  {
    icon: Package,
    title: 'Smart Inventory Management',
    description: 'Real-time stock tracking with automatic deductions, low-stock alerts, and challan scanning. Never run out of materials.',
    color: 'gradient-success',
  },
  {
    icon: ClipboardList,
    title: 'Daily Progress Reports',
    description: 'Submit site reports with photos, manpower details, and material usage. Everything synced and accessible anytime.',
    color: 'gradient-navy',
  },
];

export function OnboardingScreens({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else {
      localStorage.setItem('onboarding_done', 'true');
      onComplete();
    }
  };

  const skip = () => {
    localStorage.setItem('onboarding_done', 'true');
    onComplete();
  };

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6">
      <button
        onClick={skip}
        className="absolute top-4 right-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" /> Skip
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-xs"
        >
          <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-3xl ${slide.color}`}>
            <slide.icon className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">{slide.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 mt-10 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-accent' : 'w-2 bg-muted'
            }`}
          />
        ))}
      </div>

      <Button
        onClick={next}
        className="min-h-[52px] w-full max-w-xs gap-2 gradient-amber text-accent-foreground border-0 text-base font-semibold rounded-2xl"
      >
        {current < slides.length - 1 ? 'Next' : 'Get Started'}
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
