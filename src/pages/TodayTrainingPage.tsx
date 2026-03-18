import { useApp } from '@/lib/context';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TodayTrainingPage = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const todayTrainings = data.trainings.filter(
    t => t.teamId === activeTeamId && t.date === today
  );

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm font-medium mb-2">Treino de Hoje</h2>
      <p className="font-mono text-[10px] text-muted-foreground mb-6">{format(new Date(), 'dd/MM/yyyy')}</p>

      {todayTrainings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-body text-sm mb-4">Nenhum treino agendado para hoje</p>
          <button
            onClick={() => navigate(`/criar-treino?date=${today}`)}
            className="bg-primary text-primary-foreground font-mono text-xs px-6 py-2 rounded hover:neon-glow transition-all"
          >
            Criar Treino
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {todayTrainings.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/treino/${t.id}`)}
              className="w-full card-surface neon-border rounded-lg p-4 text-left"
            >
              <h3 className="font-mono text-sm text-foreground">{t.name}</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">{t.duration}min · {t.modules.length} módulos</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayTrainingPage;
