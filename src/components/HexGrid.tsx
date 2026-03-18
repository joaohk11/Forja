import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, PlusSquare, Layers, Users, Shield, Brain } from 'lucide-react';
import { HexButton } from './HexButton';
import { motion } from 'framer-motion';

export function HexGrid() {
  const navigate = useNavigate();

  const buttons = [
    { icon: Calendar, label: 'Treino de Hoje', path: '/treino-hoje', delay: 0.1 },
    { icon: Clock, label: 'Próximo Treino', path: '/proximo-treino', delay: 0.2 },
    { icon: PlusSquare, label: 'Criar Treino', path: '/criar-treino', delay: 0.3 },
    { icon: Layers, label: 'Criar Ciclo', path: '/criar-ciclo', delay: 0.4 },
    { icon: Users, label: 'Atletas', path: '/atletas', delay: 0.5 },
    { icon: Shield, label: 'Sistema Tático', path: '/sistema-tatico', delay: 0.6 },
    { icon: Brain, label: 'IA do Treinador', path: '/ia-treinador', delay: 0.7 },
  ];

  return (
    <div className="relative flex flex-col items-center py-8">
      {/* SVG connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="30%" y1="18%" x2="70%" y2="18%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" />
        <line x1="30%" y1="18%" x2="50%" y2="38%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '0.5s' }} />
        <line x1="70%" y1="18%" x2="50%" y2="38%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '1s' }} />
        <line x1="50%" y1="38%" x2="25%" y2="58%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '1.5s' }} />
        <line x1="50%" y1="38%" x2="75%" y2="58%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '2s' }} />
        <line x1="25%" y1="58%" x2="50%" y2="78%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '2.5s' }} />
        <line x1="75%" y1="58%" x2="50%" y2="78%" stroke="url(#lineGlow)" strokeWidth="1" className="animate-pulse-neon" style={{ animationDelay: '3s' }} />
        {[
          ['50%', '18%'], ['40%', '28%'], ['60%', '28%'],
          ['37%', '48%'], ['63%', '48%'], ['37%', '68%'], ['63%', '68%'],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx} cy={cy} r="3"
            fill="hsl(var(--primary))"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>

      {/* Row 1: 2 hexagons */}
      <div className="flex gap-6 mb-4 relative z-10">
        <HexButton icon={buttons[0].icon} label={buttons[0].label} onClick={() => navigate(buttons[0].path)} delay={buttons[0].delay} />
        <HexButton icon={buttons[1].icon} label={buttons[1].label} onClick={() => navigate(buttons[1].path)} delay={buttons[1].delay} />
      </div>

      {/* Row 2: 1 hex centered */}
      <div className="flex justify-center mb-4 relative z-10">
        <HexButton icon={buttons[2].icon} label={buttons[2].label} onClick={() => navigate(buttons[2].path)} delay={buttons[2].delay} />
      </div>

      {/* Row 3: 2 hexagons */}
      <div className="flex gap-6 mb-4 relative z-10">
        <HexButton icon={buttons[3].icon} label={buttons[3].label} onClick={() => navigate(buttons[3].path)} delay={buttons[3].delay} />
        <HexButton icon={buttons[4].icon} label={buttons[4].label} onClick={() => navigate(buttons[4].path)} delay={buttons[4].delay} />
      </div>

      {/* Row 4: 2 hexagons */}
      <div className="flex gap-6 relative z-10">
        <HexButton icon={buttons[5].icon} label={buttons[5].label} onClick={() => navigate(buttons[5].path)} delay={buttons[5].delay} />
        <HexButton icon={buttons[6].icon} label={buttons[6].label} onClick={() => navigate(buttons[6].path)} delay={buttons[6].delay} />
      </div>
    </div>
  );
}
