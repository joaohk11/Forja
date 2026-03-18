import { useState } from 'react';
import { useApp } from '@/lib/context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Training, TrainingModule, ModuleType, MODULE_TYPE_LABELS, Position, POSITION_LABELS, BlockType } from '@/lib/types';
import { generateId } from '@/lib/store';
import { Plus, Trash2, Users, Globe, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const moduleTypes: ModuleType[] = ['aquecimento', 'fundamento', 'tecnico', 'tatico', 'jogo', 'fisico'];
const positions: Position[] = ['levantador', 'ponteiro', 'central', 'oposto', 'libero'];

const CreateTrainingPage = () => {
  const { activeTeamId, addTraining } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [name, setName] = useState('');
  const [date, setDate] = useState(params.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(120);
  const [modules, setModules] = useState<TrainingModule[]>([]);

  const addModule = (blockType: BlockType) => {
    setModules([...modules, {
      id: generateId(),
      type: 'fundamento',
      blockType,
      description: '',
      duration: 20,
      status: 'nao_fez',
      observation: '',
      skillObservation: '',
      positions: blockType === 'posicao' ? [] : undefined,
    }]);
  };

  const updateModule = (id: string, updates: Partial<TrainingModule>) => {
    setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const togglePosition = (moduleId: string, pos: Position) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || mod.blockType !== 'posicao') return;
    const current = mod.positions || [];
    const next = current.includes(pos) ? current.filter(p => p !== pos) : [...current, pos];
    updateModule(moduleId, { positions: next });
  };

  const removeModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addTraining({
      teamId: activeTeamId,
      name,
      date,
      duration,
      modules,
      status: 'planejado',
    } as Omit<Training, 'id'>);
    navigate('/calendario');
  };

  return (
    <div className="px-4 py-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-sm font-medium">Criar Treino</h2>
        <button
          onClick={() => navigate('/ia-treinador?tab=treino')}
          className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all"
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.5} /> Criar com IA
        </button>
      </div>

      <div className="space-y-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome do treino"
          className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Data</label>
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Duração (min)</label>
            <input
              type="number" value={duration}
              onChange={e => setDuration(parseInt(e.target.value) || 120)}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-3">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Blocos de Treino</h3>
          <div className="flex gap-2">
            <button onClick={() => addModule('geral')} className="flex items-center gap-1 text-primary font-mono text-[10px] border border-primary/30 rounded px-2 py-1 hover:bg-primary/10">
              <Globe className="w-3 h-3" strokeWidth={1.5} /> Geral
            </button>
            <button onClick={() => addModule('posicao')} className="flex items-center gap-1 text-primary font-mono text-[10px] border border-primary/30 rounded px-2 py-1 hover:bg-primary/10">
              <Users className="w-3 h-3" strokeWidth={1.5} /> Por Posição
            </button>
          </div>
        </div>

        {modules.map((mod, idx) => (
          <div key={mod.id} className="card-surface neon-border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">Bloco {idx + 1}</span>
                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                  mod.blockType === 'geral'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-accent/10 text-accent border border-accent/20'
                }`}>
                  {mod.blockType === 'geral' ? 'Geral' : 'Por Posição'}
                </span>
              </div>
              <button onClick={() => removeModule(mod.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={mod.type}
                onChange={e => updateModule(mod.id, { type: e.target.value as ModuleType })}
                className="bg-background border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {moduleTypes.map(t => <option key={t} value={t}>{MODULE_TYPE_LABELS[t]}</option>)}
              </select>
              <input
                type="number" value={mod.duration} min={1}
                onChange={e => updateModule(mod.id, { duration: parseInt(e.target.value) || 10 })}
                placeholder="Min"
                className="bg-background border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <input
              value={mod.description}
              onChange={e => updateModule(mod.id, { description: e.target.value })}
              placeholder="Habilidade / Fundamento (ex: Ataque, Manchete, Bloqueio)"
              className="w-full bg-background border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none"
            />

            <div>
              <label className="font-mono text-[9px] text-primary uppercase tracking-widest">Observação Técnica da Habilidade</label>
              <textarea
                value={mod.skillObservation || ''}
                onChange={e => updateModule(mod.id, { skillObservation: e.target.value })}
                placeholder="Ex: atraso no tempo de salto, leitura lenta do levantador..."
                rows={2}
                className="w-full bg-background border border-primary/20 rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none resize-none mt-1"
              />
            </div>

            <input
              value={mod.observation}
              onChange={e => updateModule(mod.id, { observation: e.target.value })}
              placeholder="Observação geral do bloco"
              className="w-full bg-background border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none"
            />

            {mod.blockType === 'posicao' && (
              <div>
                <label className="font-mono text-[10px] text-muted-foreground mb-1 block">Posições participantes</label>
                <div className="flex flex-wrap gap-1.5">
                  {positions.map(pos => {
                    const selected = (mod.positions || []).includes(pos);
                    return (
                      <button
                        key={pos}
                        onClick={() => togglePosition(mod.id, pos)}
                        className={`font-mono text-[10px] px-2 py-1 rounded border transition-all ${
                          selected ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {POSITION_LABELS[pos]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded mt-6 hover:neon-glow transition-all"
        >
          Salvar Treino
        </button>
      </div>
    </div>
  );
};

export default CreateTrainingPage;
