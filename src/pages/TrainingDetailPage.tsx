import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { MODULE_TYPE_LABELS, ModuleStatus, POSITION_LABELS } from '@/lib/types';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const statusOptions: { value: ModuleStatus; label: string; color: string }[] = [
  { value: 'concluido', label: 'Concluído', color: 'bg-status-done' },
  { value: 'parcial', label: 'Parcial', color: 'bg-status-partial' },
  { value: 'nao_fez', label: 'Não Fez', color: 'bg-status-cancelled' },
];

const TrainingDetailPage = () => {
  const { id } = useParams();
  const { data, updateTraining } = useApp();
  const navigate = useNavigate();

  const training = data.trainings.find(t => t.id === id);
  if (!training) return <div className="p-4 text-muted-foreground font-mono text-sm">Treino não encontrado</div>;

  const updateModuleStatus = (moduleId: string, status: ModuleStatus) => {
    const updated = {
      ...training,
      modules: training.modules.map(m => m.id === moduleId ? { ...m, status } : m),
    };
    const nonWarmup = updated.modules.filter(m => m.type !== 'aquecimento');
    const allDone = nonWarmup.every(m => m.status === 'concluido');
    const anyDone = nonWarmup.some(m => m.status === 'concluido' || m.status === 'parcial');
    updated.status = allDone ? 'concluido' : anyDone ? 'parcial' : 'planejado';
    updateTraining(updated);
  };

  const updateModuleObservation = (moduleId: string, skillObservation: string) => {
    const updated = {
      ...training,
      modules: training.modules.map(m => m.id === moduleId ? { ...m, skillObservation } : m),
    };
    updateTraining(updated);
  };

  const cancelTraining = () => {
    updateTraining({ ...training, status: 'cancelado' });
  };

  const trainingStatusColor = {
    planejado: 'text-status-planned',
    concluido: 'text-status-done',
    parcial: 'text-status-partial',
    cancelado: 'text-status-cancelled',
  };

  return (
    <div className="px-4 py-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="font-mono text-xs">Voltar</span>
        </button>
        <button
          onClick={() => navigate(`/ia-treinador?tab=chat&trainingId=${training.id}`)}
          className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
        >
          <Sparkles className="w-3.5 h-3.5" /> Melhorar com IA
        </button>
      </div>

      <div className="card-surface neon-border rounded-lg p-4 mb-6">
        <h2 className="font-mono text-sm font-medium text-foreground">{training.name}</h2>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(training.date), 'dd/MM/yyyy')}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{training.duration}min</span>
          <span className={`font-mono text-[10px] ${trainingStatusColor[training.status]}`}>{training.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Módulos</h3>
        {training.status !== 'cancelado' && (
          <button onClick={cancelTraining} className="font-mono text-[10px] text-destructive hover:underline">
            Cancelar Treino
          </button>
        )}
      </div>

      <div className="space-y-2">
        {training.modules.map((mod) => (
          <div key={mod.id} className="card-surface neon-border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">{MODULE_TYPE_LABELS[mod.type]}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{mod.duration}min</span>
                {mod.blockType && (
                  <span className={`font-mono text-[8px] px-1 py-0.5 rounded ${
                    mod.blockType === 'geral' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                  }`}>
                    {mod.blockType === 'geral' ? 'Geral' : 'Posição'}
                  </span>
                )}
              </div>
            </div>

            {mod.description && (
              <p className="font-body text-xs text-foreground mb-1 font-medium">{mod.description}</p>
            )}

            {mod.blockType === 'posicao' && mod.positions && mod.positions.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {mod.positions.map(pos => (
                  <span key={pos} className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {POSITION_LABELS[pos]}
                  </span>
                ))}
              </div>
            )}

            {/* Skill observation — editable during execution */}
            <div className="mb-2">
              <label className="font-mono text-[9px] text-primary uppercase tracking-widest">Obs. Técnica da Habilidade</label>
              <textarea
                value={mod.skillObservation || ''}
                onChange={e => updateModuleObservation(mod.id, e.target.value)}
                placeholder="Registrar observação técnica específica..."
                rows={2}
                className="w-full bg-background border border-primary/20 rounded px-2 py-1.5 font-body text-[10px] text-foreground focus:border-primary focus:outline-none resize-none mt-0.5"
              />
            </div>

            {mod.observation && (
              <p className="font-body text-[10px] text-muted-foreground mb-2 italic">{mod.observation}</p>
            )}

            <div className="flex gap-1">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateModuleStatus(mod.id, opt.value)}
                  className={`flex-1 font-mono text-[10px] py-1.5 rounded border transition-all ${
                    mod.status === opt.value
                      ? `${opt.color} text-primary-foreground border-transparent`
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {training.modules.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-4">Nenhum módulo</p>
        )}
      </div>
    </div>
  );
};

export default TrainingDetailPage;
