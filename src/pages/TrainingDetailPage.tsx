import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { MODULE_TYPE_LABELS, ModuleStatus, POSITION_LABELS } from '@/lib/types';
import { ArrowLeft, Sparkles, Play, CheckCircle2, MinusCircle, XCircle, ChevronRight, Pause, TimerReset, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

/* ─── Fundamento label helper (safe) ─── */
const fundLabel = (f?: string): string => {
  if (!f) return '';
  const map: Record<string, string> = {
    aquecimento: 'Aquecimento', toque: 'Toque', manchete: 'Manchete',
    tecnico: 'Técnico', tatico: 'Tático', jogo: 'Jogo', fisico: 'Físico',
  };
  return map[f] || f;
};

/* ─── Execution mode ─── */
type ExecPhase = 'running' | 'between' | 'summary';

const statusOptions: { value: ModuleStatus; label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }[] = [
  { value: 'concluido', label: 'Concluído', icon: CheckCircle2, color: 'text-green-400', bg: 'border-green-400/50 bg-green-400/10 hover:bg-green-400/20' },
  { value: 'parcial',   label: 'Parcial',   icon: MinusCircle,  color: 'text-yellow-400', bg: 'border-yellow-400/50 bg-yellow-400/10 hover:bg-yellow-400/20' },
  { value: 'nao_fez',   label: 'Não fez',   icon: XCircle,      color: 'text-red-400',    bg: 'border-red-400/50 bg-red-400/10 hover:bg-red-400/20' },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TrainingDetailPage = () => {
  const { id } = useParams();
  const { data, updateTraining, deleteTraining } = useApp();
  const navigate = useNavigate();

  const training = data.trainings.find(t => t.id === id);

  /* ─── Execution state ─── */
  const [execActive, setExecActive] = useState(false);
  const [execPhase, setExecPhase] = useState<ExecPhase>('running');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [execStatuses, setExecStatuses] = useState<Record<string, ModuleStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Delete confirm ─── */
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startTimer = (seconds: number) => {
    clearTimer();
    setTimeLeft(seconds);
    setPaused(false);
  };

  useEffect(() => {
    if (!execActive || execPhase !== 'running' || paused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [execActive, execPhase, paused, currentIndex]);

  if (!training) return <div className="p-4 text-muted-foreground font-mono text-sm">Treino não encontrado</div>;

  const modules = training.modules;

  /* ─── Normal detail helpers ─── */
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
    updateTraining({
      ...training,
      modules: training.modules.map(m => m.id === moduleId ? { ...m, skillObservation } : m),
    });
  };

  const cancelTraining = () => updateTraining({ ...training, status: 'cancelado' });

  const handleDelete = () => {
    deleteTraining(training.id);
    navigate(-1);
  };

  /* ─── Execution helpers ─── */
  const startExecution = () => {
    setExecStatuses({});
    setCurrentIndex(0);
    setExecPhase('running');
    startTimer(modules[0].duration * 60);
    setExecActive(true);
  };

  const handleExecStatus = (status: ModuleStatus) => {
    const mod = modules[currentIndex];
    const newStatuses = { ...execStatuses, [mod.id]: status };
    setExecStatuses(newStatuses);
    clearTimer();

    if (currentIndex + 1 < modules.length) {
      setCurrentIndex(prev => prev + 1);
      setExecPhase('between');
    } else {
      // Save all statuses and finish
      const updatedModules = training.modules.map(m => ({
        ...m,
        status: newStatuses[m.id] ?? m.status,
      }));
      const nonWarmup = updatedModules.filter(m => m.type !== 'aquecimento');
      const allDone = nonWarmup.every(m => m.status === 'concluido');
      const anyDone = nonWarmup.some(m => m.status === 'concluido' || m.status === 'parcial');
      updateTraining({
        ...training,
        modules: updatedModules,
        status: allDone ? 'concluido' : anyDone ? 'parcial' : 'planejado',
      });
      setExecPhase('summary');
    }
  };

  const handleStartNextModule = () => {
    setExecPhase('running');
    startTimer(modules[currentIndex].duration * 60);
  };

  const exitExecution = () => {
    clearTimer();
    setExecActive(false);
    setExecPhase('running');
  };

  const trainingStatusColor: Record<string, string> = {
    planejado: 'text-status-planned',
    concluido: 'text-status-done',
    parcial: 'text-status-partial',
    cancelado: 'text-status-cancelled',
  };

  /* ─── EXECUTION MODE ─── */
  if (execActive) {
    /* Summary */
    if (execPhase === 'summary') {
      const counts = { concluido: 0, parcial: 0, nao_fez: 0 };
      modules.forEach(m => {
        const s = execStatuses[m.id] || 'nao_fez';
        counts[s]++;
      });
      return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-50">
          <div className="text-center mb-8">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Treino Concluído</p>
            <h2 className="font-mono text-2xl font-bold neon-text">{training.name}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-10">
            <div className="card-surface border border-green-400/30 rounded-xl p-4 text-center">
              <p className="font-mono text-3xl font-bold text-green-400">{counts.concluido}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Concluídos</p>
            </div>
            <div className="card-surface border border-yellow-400/30 rounded-xl p-4 text-center">
              <p className="font-mono text-3xl font-bold text-yellow-400">{counts.parcial}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Parciais</p>
            </div>
            <div className="card-surface border border-red-400/30 rounded-xl p-4 text-center">
              <p className="font-mono text-3xl font-bold text-red-400">{counts.nao_fez}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Não fizeram</p>
            </div>
          </div>
          <div className="space-y-2 w-full max-w-xs mb-8">
            {modules.map(m => {
              const s = execStatuses[m.id] || 'nao_fez';
              const c = s === 'concluido' ? 'text-green-400' : s === 'parcial' ? 'text-yellow-400' : 'text-red-400';
              const dot = s === 'concluido' ? '●' : s === 'parcial' ? '◐' : '○';
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={`font-mono text-lg ${c}`}>{dot}</span>
                  <span className="font-mono text-sm text-foreground">{m.description || fundLabel(m.fundamento) || MODULE_TYPE_LABELS[m.type]}</span>
                  <span className="font-mono text-xs text-muted-foreground ml-auto">{m.duration}min</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={exitExecution}
            className="w-full max-w-xs bg-primary text-primary-foreground font-mono text-base py-4 rounded-xl hover:neon-glow transition-all"
          >
            Fechar
          </button>
        </div>
      );
    }

    const currentMod = modules[currentIndex];
    const timerPct = currentMod ? Math.max(0, (timeLeft / (currentMod.duration * 60)) * 100) : 0;
    const timerColor = timeLeft === 0 ? 'text-red-400' : timeLeft < 60 ? 'text-yellow-400' : 'text-green-400';

    /* Between modules */
    if (execPhase === 'between') {
      return (
        <div className="fixed inset-0 bg-background flex flex-col px-6 pt-10 pb-8 z-50">
          <button onClick={exitExecution} className="flex items-center gap-1 text-muted-foreground font-mono text-xs mb-8">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Sair do treino
          </button>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">
              Próximo bloco · {currentIndex + 1}/{modules.length}
            </p>
            <h2 className="font-mono text-2xl font-bold text-foreground mb-2">
              {currentMod.description || fundLabel(currentMod.fundamento) || MODULE_TYPE_LABELS[currentMod.type]}
            </h2>
            {currentMod.fundamento && (
              <span className="font-mono text-sm text-primary">{fundLabel(currentMod.fundamento)}</span>
            )}
            {(currentMod.skills || []).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {(currentMod.skills || []).map(s => (
                  <span key={s} className="font-mono text-xs px-3 py-1 rounded-full border border-primary/30 text-primary bg-primary/5">{s}</span>
                ))}
              </div>
            )}
            <p className="font-mono text-lg text-muted-foreground mt-4">{currentMod.duration} min</p>
            {currentMod.skillObservation && (
              <p className="font-body text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed italic">{currentMod.skillObservation}</p>
            )}
          </div>
          <button
            onClick={handleStartNextModule}
            className="w-full bg-primary text-primary-foreground font-mono text-lg py-5 rounded-2xl hover:neon-glow transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" strokeWidth={1.5} /> Iniciar Módulo
          </button>
        </div>
      );
    }

    /* Running */
    return (
      <div className="fixed inset-0 bg-background flex flex-col px-6 pt-6 pb-8 z-50">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={exitExecution} className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Sair
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            Bloco {currentIndex + 1} de {modules.length}
          </span>
        </div>

        {/* Module info */}
        <div className="flex-1 flex flex-col">
          <p className="font-mono text-xs text-primary uppercase tracking-widest mb-2">
            {fundLabel(currentMod.fundamento) || MODULE_TYPE_LABELS[currentMod.type]}
          </p>
          <h2 className="font-mono text-2xl font-bold text-foreground mb-3 leading-tight">
            {currentMod.description || fundLabel(currentMod.fundamento) || MODULE_TYPE_LABELS[currentMod.type]}
          </h2>

          {(currentMod.skills || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(currentMod.skills || []).map(s => (
                <span key={s} className="font-mono text-sm px-3 py-1.5 rounded-full border border-primary/40 text-primary bg-primary/10">{s}</span>
              ))}
            </div>
          )}

          {currentMod.skillObservation && (
            <p className="font-body text-base text-muted-foreground mb-4 leading-relaxed">{currentMod.skillObservation}</p>
          )}
          {currentMod.observation && (
            <p className="font-body text-sm text-muted-foreground leading-relaxed italic">{currentMod.observation}</p>
          )}

          {/* Timer */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            {/* Progress ring */}
            <div className="relative w-48 h-48 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={timeLeft === 0 ? '#f87171' : timeLeft < 60 ? '#facc15' : 'hsl(var(--primary))'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerPct / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-4xl font-bold ${timerColor}`}>{formatTime(timeLeft)}</span>
                <span className="font-mono text-xs text-muted-foreground mt-1">{currentMod.duration} min total</span>
              </div>
            </div>

            {/* Pause / Reset */}
            <div className="flex gap-4">
              <button
                onClick={() => setPaused(p => !p)}
                className="flex items-center gap-2 font-mono text-sm text-muted-foreground border border-border/40 rounded-lg px-4 py-2 hover:border-primary/30"
              >
                {paused ? <Play className="w-4 h-4" strokeWidth={1.5} /> : <Pause className="w-4 h-4" strokeWidth={1.5} />}
                {paused ? 'Retomar' : 'Pausar'}
              </button>
              <button
                onClick={() => startTimer(currentMod.duration * 60)}
                className="flex items-center gap-2 font-mono text-sm text-muted-foreground border border-border/40 rounded-lg px-4 py-2 hover:border-primary/30"
              >
                <TimerReset className="w-4 h-4" strokeWidth={1.5} /> Reiniciar
              </button>
            </div>
          </div>
        </div>

        {/* Status buttons */}
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider">Registrar execução</p>
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleExecStatus(opt.value)}
              className={`w-full flex items-center justify-center gap-3 border rounded-xl py-4 font-mono text-base font-semibold transition-all ${opt.bg} ${opt.color}`}
            >
              <opt.icon className="w-6 h-6" />
              {opt.label}
              <ChevronRight className="w-5 h-5 ml-auto" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── NORMAL DETAIL VIEW ─── */
  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
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

      {/* Training info card */}
      <div className="card-surface neon-border rounded-xl p-4 mb-5">
        <h2 className="font-mono text-base font-semibold text-foreground">{training.name}</h2>
        <div className="flex items-center flex-wrap gap-3 mt-2">
          <span className="font-mono text-xs text-muted-foreground">{format(new Date(training.date), 'dd/MM/yyyy')}</span>
          <span className="font-mono text-xs text-muted-foreground">{training.duration}min</span>
          <span className={`font-mono text-xs font-semibold ${trainingStatusColor[training.status]}`}>
            {training.status.toUpperCase()}
          </span>
          {training.focusTag && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {training.focusTag}
            </span>
          )}
        </div>
      </div>

      {/* Iniciar Treino button */}
      {training.modules.length > 0 && training.status !== 'cancelado' && (
        <button
          onClick={startExecution}
          className="w-full flex items-center justify-center gap-3 bg-primary/15 border border-primary/40 text-primary font-mono text-base font-semibold py-4 rounded-xl mb-5 hover:bg-primary/25 hover:neon-glow transition-all"
        >
          <Play className="w-5 h-5" strokeWidth={1.5} /> Iniciar Treino
        </button>
      )}

      {/* Modules header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Módulos · {modules.length}
        </h3>
        {training.status !== 'cancelado' && (
          <button onClick={cancelTraining} className="font-mono text-[10px] text-muted-foreground hover:text-destructive">
            Cancelar Treino
          </button>
        )}
      </div>

      {/* Module list */}
      <div className="space-y-3 mb-6">
        {training.modules.map((mod, idx) => (
          <div key={mod.id} className="card-surface neon-border rounded-xl p-4">
            {/* Module header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-primary">{MODULE_TYPE_LABELS[mod.type]}</span>
                  <span className="font-mono text-xs text-muted-foreground">{mod.duration}min</span>
                  {mod.blockType && (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      mod.blockType === 'geral' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                    }`}>
                      {mod.blockType === 'geral' ? 'Geral' : 'Posição'}
                    </span>
                  )}
                </div>
                {mod.fundamento && (
                  <p className="font-mono text-xs text-foreground/70 mt-0.5">{fundLabel(mod.fundamento)}</p>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">#{idx + 1}</span>
            </div>

            {mod.description && (
              <p className="font-body text-base font-semibold text-foreground mb-2">{mod.description}</p>
            )}

            {(mod.skills || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(mod.skills || []).map(s => (
                  <span key={s} className="font-mono text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                ))}
              </div>
            )}

            {mod.blockType === 'posicao' && (mod.positions || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(mod.positions || []).map(pos => (
                  <span key={pos} className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {POSITION_LABELS[pos]}
                  </span>
                ))}
              </div>
            )}

            {/* Skill observation — editable during execution */}
            <div className="mb-3">
              <label className="font-mono text-[10px] text-primary uppercase tracking-widest">Obs. Técnica da Habilidade</label>
              <textarea
                value={mod.skillObservation || ''}
                onChange={e => updateModuleObservation(mod.id, e.target.value)}
                placeholder="Registrar observação técnica específica..."
                rows={2}
                className="w-full bg-background border border-primary/20 rounded-lg px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none mt-1"
              />
            </div>

            {mod.observation && (
              <p className="font-body text-xs text-muted-foreground mb-3 italic">{mod.observation}</p>
            )}

            {/* Status buttons */}
            <div className="flex gap-2">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateModuleStatus(mod.id, opt.value)}
                  className={`flex-1 font-mono text-xs py-2.5 rounded-lg border transition-all ${
                    mod.status === opt.value
                      ? `${opt.bg} ${opt.color} font-semibold`
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
          <p className="text-center text-muted-foreground font-body text-sm py-6">Nenhum módulo</p>
        )}
      </div>

      {/* Delete training */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 border border-destructive/30 text-destructive/70 font-mono text-sm py-3 rounded-xl hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Excluir Treino
        </button>
      ) : (
        <div className="card-surface border border-destructive/30 rounded-xl p-4 space-y-3">
          <p className="font-mono text-sm text-center text-destructive">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-border rounded-lg py-2.5 font-mono text-sm text-muted-foreground hover:bg-muted/30"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-destructive/80 text-destructive-foreground font-mono text-sm py-2.5 rounded-lg hover:bg-destructive"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingDetailPage;
