import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface HexButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  delay?: number;
}

export function HexButton({ icon: Icon, label, onClick, delay = 0 }: HexButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div className="relative w-[110px] h-[120px] flex items-center justify-center">
        {/* Hex background */}
        <svg viewBox="0 0 110 120" className="absolute inset-0 w-full h-full">
          <polygon
            points="55,2 105,28 105,92 55,118 5,92 5,28"
            fill="hsl(var(--card))"
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth="1.5"
            className="transition-all duration-300 group-hover:stroke-[hsl(var(--primary))] group-hover:[filter:drop-shadow(0_0_8px_hsl(var(--primary)/0.4))]"
          />
        </svg>
        {/* Glow dots at vertices */}
        <svg viewBox="0 0 110 120" className="absolute inset-0 w-full h-full pointer-events-none">
          {[[55,2],[105,28],[105,92],[55,118],[5,92],[5,28]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill="hsl(var(--primary))" opacity="0.6"
              className="animate-pulse-neon" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </svg>
        <Icon className="relative z-10 w-7 h-7 text-primary" strokeWidth={1.5} />
      </div>
      <span className="font-mono text-xs text-foreground tracking-wider">{label}</span>
    </motion.button>
  );
}
