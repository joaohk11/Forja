import { useState, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Training, TrainingModule, ModuleType, Position, POSITION_LABELS, BlockType } from '@/lib/types';
import { generateId } from '@/lib/store';
import { Plus, Trash2, Users, Globe, Sparkles, Copy, Bookmark, BookOpen, Zap, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

/* ─── Fundamento system ─── */
type Fundamento = 'aquecimento' | 'toque' | 'manchete' | 'tecnico' | 'tatico' | 'jogo' | 'fisico';

const FUNDAMENTO_LABELS: Record<Fundamento, string> = {
  aquecimento: 'Aquecimento', toque: 'Toque', manchete: 'Manchete',
  tecnico: 'Técnico', tatico: 'Tático', jogo: 'Jogo', fisico: 'Físico',
};

const FUNDAMENTO_TO_TYPE: Record<Fundamento, ModuleType> = {
  aquecimento: 'aquecimento', toque: 'fundamento', manchete: 'fundamento',
  tecnico: 'tecnico', tatico: 'tatico', jogo: 'jogo', fisico: 'fisico',
};

const FUNDAMENTO_OPTIONS: Record<Fundamento, string[]> = {
  aquecimento: ['Deslocamento', 'Ativação articular', 'Corrida leve', 'Passe livre'],
  toque: ['Controle de bola', 'Precisão', 'Deslocamento', 'Tempo de bola', 'Consistência'],
  manchete: ['Controle de bola', 'Precisão', 'Deslocamento', 'Tempo de bola', 'Consistência'],
  tecnico: ['Saque', 'Passe', 'Levantamento', 'Ataque', 'Bloqueio', 'Defesa', 'Cobertura'],
  tatico: ['Posicionamento', 'Sistema de jogo', 'Rotação', 'Leitura de jogo', 'Cobertura tática', 'Transição defesa/ataque'],
  jogo: ['Jogo reduzido', 'Jogo condicionado', 'Jogo livre', 'Simulação de ponto', 'Side-out', 'Contra-ataque'],
  fisico: ['Força', 'Explosão', 'Velocidade', 'Agilidade', 'Resistência', 'Coordenação'],
};

const FOCUS_TAGS = ['Passe', 'Defesa', 'Ataque', 'Sistema', 'Físico'];

/* ─── Module templates (localStorage) ─── */
const TEMPLATES_KEY = 'forja_module_templates';

interface ModuleTemplate {
  id: string;
  name: string;
  fundamento?: Fundamento;
  skills?: string[];
  duration: number;
  observation?: string;
  skillObservation?: string;
}

function loadTemplates(): ModuleTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
function saveTemplateToStorage(t: ModuleTemplate) {
  const list = loadTemplates();
  const exists = list.findIndex(x => x.name === t.name && x.fundamento === t.fundamento);
  if (exists >= 0) { list[exists] = t; } else { list.push(t); }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
}
function deleteTemplate(id: string) {
  const list = loadTemplates().filter(t => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
}

/* ─── Treino Rápido ─── */
function gerarTreinoRapido(dur: number): TrainingModule[] {
  const s = (f: number) => Math.max(5, Math.round(dur * f));
  const mod = (fundamento: Fundamento, skills: string[], obs: string, frac: number): TrainingModule => ({
    id: generateId(), blockType: 'geral',
    type: FUNDAMENTO_TO_TYPE[fundamento], fundamento,
    description: FUNDAMENTO_LABELS[fundamento], skills,
    duration: s(frac), status: 'nao_fez', observation: obs, skillObservation: '',
  });
  return [
    mod('aquecimento', ['Deslocamento', 'Ativação articular'], 'Aquecimento geral e mobilização articular.', 0.08),
    mod('toque',       ['Controle de bola', 'Precisão'],      'Duplas a 3m, 30 toques por jogador.', 0.12),
    mod('tecnico',     ['Ataque', 'Levantamento'],            'Trabalho de ataque por posição com levantamento.', 0.2),
    mod('tecnico',     ['Defesa', 'Bloqueio'],                'Defesa em situação e posicionamento de bloqueio.', 0.15),
    mod('tatico',      ['Sistema de jogo', 'Rotação'],        'Sistema tático em situação de jogo.', 0.15),
    mod('jogo',        ['Jogo livre'],                        'Jogo completo com rotação após cada ponto.', 0.25),
    mod('fisico',      ['Explosão', 'Força'],                 'Escada de agilidade + salto vertical.', 0.05),
  ];
}

/* ─── AI module generation ─── */
async function generateModuleWithAI(context: string): Promise<Partial<TrainingModule>> {
  const resp = await fetch('/api/ai-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: `Crie um módulo de treino de vôlei. Responda APENAS com JSON válido, sem texto adicional, sem markdown. Formato exato: {"fundamento":"tecnico","skills":["Ataque","Bloqueio"],"duration":15,"description":"Nome do exercício","observation":"Descrição prática em 1-2 frases"}. Fundamento deve ser um de: aquecimento, toque, manchete, tecnico, tatico, jogo, fisico. ${context}`,
      }],
    }),
  });
  const data = await resp.json();
  const text: string = data.text || '';
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('Resposta inválida da IA');
}

/* ─── Component ─── */
const positions: Position[] = ['levantador', 'ponteiro', 'central', 'oposto', 'libero'];

const CreateTrainingPage = () => {
  const { activeTeamId, addTraining } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [name, setName] = useState('');
  const [date, setDate] = useState(params.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(120);
  const [focusTag, setFocusTag] = useState('');
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [templates, setTemplates] = useState<ModuleTemplate[]>(loadTemplates);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const refreshTemplates = () => setTemplates(loadTemplates());

  const addModule = useCallback((blockType: BlockType) => {
    setModules(prev => [...prev, {
      id: generateId(), type: 'fundamento', blockType,
      description: '', fundamento: undefined, skills: [],
      duration: 20, status: 'nao_fez', observation: '', skillObservation: '',
      positions: blockType === 'posicao' ? [] : undefined,
    }]);
  }, []);

  const updateModule = useCallback((id: string, updates: Partial<TrainingModule>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const removeModule = useCallback((id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  }, []);

  const duplicateModule = useCallback((mod: TrainingModule) => {
    const copy: TrainingModule = { ...mod, id: generateId(), status: 'nao_fez' };
    setModules(prev => {
      const idx = prev.findIndex(m => m.id === mod.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const saveModuleAsTemplate = (mod: TrainingModule) => {
    const t: ModuleTemplate = {
      id: generateId(),
      name: mod.description || FUNDAMENTO_LABELS[(mod.fundamento as Fundamento) || 'tecnico'] || 'Módulo',
      fundamento: mod.fundamento as Fundamento | undefined,
      skills: mod.skills,
      duration: mod.duration,
      observation: mod.observation,
      skillObservation: mod.skillObservation,
    };
    saveTemplateToStorage(t);
    refreshTemplates();
  };

  const insertTemplate = (t: ModuleTemplate) => {
    const mod: TrainingModule = {
      id: generateId(), blockType: 'geral',
      type: t.fundamento ? FUNDAMENTO_TO_TYPE[t.fundamento] : 'fundamento',
      fundamento: t.fundamento,
      description: t.name, skills: t.skills || [],
      duration: t.duration, status: 'nao_fez',
      observation: t.observation || '', skillObservation: t.skillObservation || '',
    };
    setModules(prev => [...prev, mod]);
  };

  const removeTemplateItem = (id: string) => {
    deleteTemplate(id);
    refreshTemplates();
  };

  const toggleSkill = (moduleId: string, skill: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const current = mod.skills || [];
    const next = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill];
    updateModule(moduleId, { skills: next });
  };

  const togglePosition = (moduleId: string, pos: Position) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || mod.blockType !== 'posicao') return;
    const current = mod.positions || [];
    updateModule(moduleId, { positions: current.includes(pos) ? current.filter(p => p !== pos) : [...current, pos] });
  };

  const selectFundamento = (moduleId: string, f: Fundamento) => {
    updateModule(moduleId, {
      fundamento: f,
      type: FUNDAMENTO_TO_TYPE[f],
      skills: [],
      description: FUNDAMENTO_LABELS[f],
    });
  };

  const handleAIGenerate = async (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    const context = `Foco: ${focusTag || 'geral'}. ${mod?.fundamento ? `Fundamento preferido: ${mod.fundamento}.` : ''}`;
    setAiLoadingId(moduleId);
    try {
      const result = await generateModuleWithAI(context);
      const fundamento = (result.fundamento as Fundamento) || 'tecnico';
      updateModule(moduleId, {
        fundamento,
        type: FUNDAMENTO_TO_TYPE[fundamento],
        skills: (result.skills as string[]) || [],
        duration: (result.duration as number) || 15,
        description: (result.description as string) || FUNDAMENTO_LABELS[fundamento],
        observation: (result.observation as string) || '',
      });
    } catch (e) {
      console.error('AI module error:', e);
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleQuickTraining = () => {
    setModules(gerarTreinoRapido(duration));
    if (!name) setName('Treino Rápido');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addTraining({
      teamId: activeTeamId, name, date, duration, modules,
      status: 'planejado', focusTag: focusTag || undefined,
    } as Omit<Training, 'id'>);
    navigate('/calendario');
  };

  return (
    <div className="px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-mono text-base font-semibold">Criar Treino</h2>
        <div className="flex gap-2">
          <button
            onClick={handleQuickTraining}
            className="flex items-center gap-1 text-yellow-400 font-mono text-xs border border-yellow-400/30 rounded px-2.5 py-1.5 hover:bg-yellow-400/10 transition-all"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.5} /> Treino Rápido
          </button>
          <button
            onClick={() => navigate('/ia-treinador?tab=treino')}
            className="flex items-center gap-1 text-primary font-mono text-xs border border-primary/30 rounded px-2.5 py-1.5 hover:bg-primary/10 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} /> IA
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Nome do treino"
          className="w-full bg-background border border-border rounded-lg px-4 py-3 font-body text-base text-foreground focus:border-primary focus:outline-none"
        />

        {/* Date + Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Data</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-foreground focus:border-primary focus:outline-none mt-1"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Duração (min)</label>
            <input
              type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 120)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-foreground focus:border-primary focus:outline-none mt-1"
            />
          </div>
        </div>

        {/* Focus tag */}
        <div>
          <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Foco do Treino</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {FOCUS_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setFocusTag(focusTag === tag ? '' : tag)}
                className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-all ${
                  focusTag === tag
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Templates section */}
        {templates.length > 0 && (
          <div>
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <BookOpen className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="font-mono text-xs text-primary">Modelos / Favoritos ({templates.length})</span>
              <span className="font-mono text-[10px] text-muted-foreground ml-auto">{showTemplates ? '▲' : '▼'}</span>
            </button>
            {showTemplates && (
              <div className="mt-2 space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="card-surface border border-border/40 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-foreground truncate">{t.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {t.fundamento ? FUNDAMENTO_LABELS[t.fundamento] : '—'} · {t.duration}min
                        {t.skills && t.skills.length > 0 ? ` · ${t.skills.join(', ')}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => insertTemplate(t)}
                      className="font-mono text-[10px] text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/10"
                    >
                      Inserir
                    </button>
                    <button onClick={() => removeTemplateItem(t.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modules header */}
        <div className="flex items-center justify-between pt-2">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Blocos de Treino</h3>
          <div className="flex gap-2">
            <button onClick={() => addModule('geral')} className="flex items-center gap-1 text-primary font-mono text-xs border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10">
              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} /> Geral
            </button>
            <button onClick={() => addModule('posicao')} className="flex items-center gap-1 text-primary font-mono text-xs border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10">
              <Users className="w-3.5 h-3.5" strokeWidth={1.5} /> Posição
            </button>
          </div>
        </div>

        {/* Module cards */}
        {modules.map((mod, idx) => {
          const fundamento = mod.fundamento as Fundamento | undefined;
          const subOptions = fundamento ? FUNDAMENTO_OPTIONS[fundamento] : [];
          const isAiLoading = aiLoadingId === mod.id;

          return (
            <div key={mod.id} className="card-surface neon-border rounded-xl p-4 space-y-4">
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">Bloco {idx + 1}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    mod.blockType === 'geral'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-accent/10 text-accent border border-accent/20'
                  }`}>
                    {mod.blockType === 'geral' ? 'Geral' : 'Por Posição'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveModuleAsTemplate(mod)}
                    title="Salvar como modelo"
                    className="text-muted-foreground hover:text-yellow-400 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => duplicateModule(mod)}
                    title="Duplicar"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => removeModule(mod.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* AI generate button */}
              <button
                onClick={() => handleAIGenerate(mod.id)}
                disabled={isAiLoading}
                className="w-full flex items-center justify-center gap-2 border border-primary/30 rounded-lg py-2.5 font-mono text-sm text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                {isAiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  : <><Sparkles className="w-4 h-4" strokeWidth={1.5} /> Gerar módulo com IA</>
                }
              </button>

              {/* Fundamento picker */}
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Fundamento</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FUNDAMENTO_LABELS) as Fundamento[]).map(f => (
                    <button
                      key={f}
                      onClick={() => selectFundamento(mod.id, f)}
                      className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        fundamento === f
                          ? 'border-primary text-primary bg-primary/10 font-semibold'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {FUNDAMENTO_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-options */}
              {subOptions.length > 0 && (
                <div>
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Habilidades</label>
                  <div className="flex flex-wrap gap-2">
                    {subOptions.map(opt => {
                      const selected = (mod.skills || []).includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleSkill(mod.id, opt)}
                          className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            selected
                              ? 'border-primary text-primary bg-primary/15 font-semibold'
                              : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duration + description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-xs text-muted-foreground mb-1 block">Tempo (min)</label>
                  <input
                    type="number" value={mod.duration} min={1}
                    onChange={e => updateModule(mod.id, { duration: parseInt(e.target.value) || 10 })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-base font-semibold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-muted-foreground mb-1 block">Nome do bloco</label>
                  <input
                    value={mod.description}
                    onChange={e => updateModule(mod.id, { description: e.target.value })}
                    placeholder="Ex: Manchete em duplas"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Skill observation */}
              <div>
                <label className="font-mono text-xs text-primary uppercase tracking-wider mb-1 block">Instrução / Observação Técnica</label>
                <textarea
                  value={mod.skillObservation || ''} rows={2}
                  onChange={e => updateModule(mod.id, { skillObservation: e.target.value })}
                  placeholder="Ex: foco no tempo de salto, leitura do levantador..."
                  className="w-full bg-background border border-primary/20 rounded-lg px-3 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Observation */}
              <input
                value={mod.observation}
                onChange={e => updateModule(mod.id, { observation: e.target.value })}
                placeholder="Observação geral (opcional)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              />

              {/* Position selector */}
              {mod.blockType === 'posicao' && (
                <div>
                  <label className="font-mono text-xs text-muted-foreground mb-2 block">Posições participantes</label>
                  <div className="flex flex-wrap gap-2">
                    {positions.map(pos => {
                      const selected = (mod.positions || []).includes(pos);
                      return (
                        <button
                          key={pos} onClick={() => togglePosition(mod.id, pos)}
                          className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all ${
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
          );
        })}

        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground font-body text-sm">
            Adicione blocos de treino acima
          </div>
        )}

        {/* Add more block buttons (bottom) */}
        {modules.length > 0 && (
          <div className="flex gap-3">
            <button onClick={() => addModule('geral')} className="flex-1 flex items-center justify-center gap-1 text-primary font-mono text-xs border border-dashed border-primary/30 rounded-lg py-3 hover:bg-primary/5">
              <Plus className="w-4 h-4" strokeWidth={1.5} /> Adicionar Bloco
            </button>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full bg-primary text-primary-foreground font-mono text-base py-4 rounded-xl mt-4 hover:neon-glow transition-all disabled:opacity-40"
        >
          Salvar Treino
        </button>
      </div>
    </div>
  );
};

export default CreateTrainingPage;
