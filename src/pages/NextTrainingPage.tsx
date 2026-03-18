import { useApp } from '@/lib/context';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';

const NextTrainingPage = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const nextTraining = data.trainings
    .filter(t => t.teamId === activeTeamId && t.date > today && t.status === 'planejado')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm font-medium mb-6">Próximo Treino</h2>

      {nextTraining ? (
        <button
          onClick={() => navigate(`/treino/${nextTraining.id}`)}
          className="w-full card-surface neon-border rounded-lg p-4 text-left"
        >
          <h3 className="font-mono text-sm text-foreground">{nextTraining.name}</h3>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {format(new Date(nextTraining.date), 'dd/MM/yyyy')} · {nextTraining.duration}min · {nextTraining.modules.length} módulos
          </p>
        </button>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-body text-sm mb-4">Nenhum treino futuro agendado</p>
          <button
            onClick={() => navigate('/criar-treino')}
            className="bg-primary text-primary-foreground font-mono text-xs px-6 py-2 rounded hover:neon-glow transition-all"
          >
            Criar Treino
          </button>
        </div>
      )}
    </div>
  );
};

export default NextTrainingPage;
