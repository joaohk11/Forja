import { Calendar, ChevronRight } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function MacrocycleCard() {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();

  const macro = data.macrocycles.find(m => m.teamId === activeTeamId);

  return (
    <motion.button
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => navigate('/periodizacao')}
      className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left"
    >
      <Calendar className="w-6 h-6 text-primary flex-shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <h2 className="font-mono text-sm font-medium text-foreground">Macrociclo</h2>
        <p className="font-mono text-xs text-muted-foreground truncate">
          {macro ? macro.name : 'Nenhum ciclo ativo'}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.5} />
    </motion.button>
  );
}
