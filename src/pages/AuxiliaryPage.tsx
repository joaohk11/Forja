import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { streamAI, AIMessage } from '@/lib/ai';
import { toast } from 'sonner';
import { generateId } from '@/lib/store';
import {
  Training, ModuleStatus, MODULE_TYPE_LABELS,
  POSITION_LABELS, Position, TECHNICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTE_LABELS,
  getAthleteAttributeScore, calculateAthleteLevel,
} from '@/lib/types';
import {
  Dumbbell, Users, Brain, ChevronRight, ArrowLeft, CheckCircle2,
  MinusCircle, XCircle, Send, Loader2, Sparkles, MessageSquare,
  User, Save, RefreshCw, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

type Tab = 'treinos' | 'atletas' | 'ia';
type TrainingView = 'list' | 'detail';
type AIView = 'main' | 'atleta' | 'treino' | 'chat';

const statusOptions: { value: ModuleStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'concluido', label: 'Concluído', icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-400' },
  { value: 'parcial', label: 'Parcial', icon: <MinusCircle className="w-3 h-3" />, color: 'text-yellow-400' },
  { value: 'nao_fez', label: 'Não fez', icon: <XCircle className="w-3 h-3" />, color: 'text-red-400' },
];

const AuxiliaryPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { data, updateTraining, addTrainingSuggestion } = useApp();

  const team = data.teams.find(t => t.id === teamId);
  const teamAthletes = data.athletes.filter(a => a.teamId === teamId).sort((a, b) => a.number - b.number);
  const teamTrainings = data.trainings
    .filter(t => t.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const storageKey = `forja_auxiliary_name_${teamId}`;
  const [auxName, setAuxName] = useState(() => localStorage.getItem(storageKey) || '');
  const [nameInput, setNameInput] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(!localStorage.getItem(storageKey));

  const [tab, setTab] = useState<Tab>('treinos');

  // Training view
  const [trainingView, setTrainingView] = useState<TrainingView>('list');
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [obsInputs, setObsInputs] = useState<Record<string, string>>({});
  const [showObsForm, setShowObsForm] = useState<string | null>(null);

  // Suggestion for module edit
  const [showSuggestForm, setShowSuggestForm] = useState<string | null>(null);
  const [suggestDesc, setSuggestDesc] = useState('');

  // IA view
  const [aiView, setAIView] = useState<AIView>('main');
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [athleteAnalysis, setAthleteAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trainCategory, setTrainCategory] = useState('');
  const [trainTime, setTrainTime] = useState(120);
  const [trainObjective, setTrainObjective] = useState('');
  const [trainPositions, setTrainPositions] = useState<Position[]>([]);
  const [trainResult, setTrainResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSetName = () => {
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    setAuxName(name);
    localStorage.setItem(storageKey, name);
    setShowNamePrompt(false);
  };

  const handleModuleStatus = (moduleId: string, status: ModuleStatus) => {
    if (!selectedTraining) return;
    const updated: Training = {
      ...selectedTraining,
      modules: selectedTraining.modules.map(m => m.id === moduleId ? { ...m, status } : m),
    };
    const nonWarmup = updated.modules.filter(m => m.type !== 'aquecimento');
    const allDone = nonWarmup.every(m => m.status === 'concluido');
    const anyDone = nonWarmup.some(m => m.status === 'concluido' || m.status === 'parcial');
    updated.status = allDone ? 'concluido' : anyDone ? 'parcial' : 'planejado';
    updateTraining(updated);
    setSelectedTraining(updated);
  };

  const handleSaveObservation = (moduleId: string) => {
    if (!selectedTraining) return;
    const obs = obsInputs[moduleId] || '';
    const updated: Training = {
      ...selectedTraining,
      modules: selectedTraining.modules.map(m => m.id === moduleId ? { ...m, observation: obs } : m),
    };
    updateTraining(updated);
    setSelectedTraining(updated);
    setShowObsForm(null);
  };

  const handleProposeSuggestion = (moduleId: string) => {
    if (!selectedTraining || !suggestDesc.trim()) return;
    addTrainingSuggestion({
      teamId: teamId!,
      trainingId: selectedTraining.id,
      trainingName: selectedTraining.name,
      auxiliaryName: auxName,
      type: 'module_edit',
      description: suggestDesc,
      proposedChange: { moduleId },
    });
    setSuggestDesc('');
    setShowSuggestForm(null);
    toast.success('Sugestão enviada ao treinador!');
  };

  const handleAnalyzeAthlete = () => {
    const athlete = teamAthletes.find(a => a.id === selectedAthleteId);
    if (!athlete) return;
    setIsAnalyzing(true);
    setAthleteAnalysis('');
    const scores: Record<string, number> = {};
    TECHNICAL_ATTRIBUTES.forEach(attr => {
      scores[TECHNICAL_ATTRIBUTE_LABELS[attr]] = getAthleteAttributeScore(athlete.id, attr, data.evalTests, data.evalResults);
    });
    const prompt = `Analise este atleta de voleibol e forneça:\n\n## Análise Técnica\n## Pontos Fortes\n## Pontos a Desenvolver\n## Sugestões de Treino\n## Função Tática Ideal\n\nDados do atleta:\n- Nome: ${athlete.name}\n- Posição: ${POSITION_LABELS[athlete.position]}\n- Altura: ${athlete.height}cm\n- Idade: ${athlete.age} anos\n- Nível: ${calculateAthleteLevel(athlete.id, data.evalTests, data.evalResults)}\n- Atributos: ${JSON.stringify(scores)}`;
    let result = '';
    streamAI({
      messages: [{ role: 'user', content: prompt }],
      onDelta: (text) => { result += text; setAthleteAnalysis(result); },
      onDone: () => setIsAnalyzing(false),
      onError: (err) => { setAthleteAnalysis(`Erro: ${err}`); setIsAnalyzing(false); },
    });
  };

  const handleGenerateTraining = () => {
    if (!trainObjective.trim()) return;
    setIsGenerating(true);
    setTrainResult('');
    const posLabels = trainPositions.map(p => POSITION_LABELS[p]).join(', ') || 'Todas';
    const prompt = `Crie um treino de voleibol estruturado:\n- Categoria: ${trainCategory || 'Não especificada'}\n- Tempo: ${trainTime} minutos\n- Objetivo: ${trainObjective}\n- Posições: ${posLabels}\n\nFormate com:\n## TREINO\n### Aquecimento\n### Exercício Principal\n### Exercício Complementar\n### Situação de Jogo\n### Tempo Estimado Total`;
    let result = '';
    streamAI({
      messages: [{ role: 'user', content: prompt }],
      context: { atletas: teamAthletes.map(a => ({ nome: a.name, posicao: POSITION_LABELS[a.position] })) },
      onDelta: (text) => { result += text; setTrainResult(result); },
      onDone: () => setIsGenerating(false),
      onError: (err) => { setTrainResult(`Erro: ${err}`); setIsGenerating(false); },
    });
  };

  const handleSendTrainingAsSuggestion = () => {
    if (!trainResult) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    addTrainingSuggestion({
      teamId: teamId!,
      trainingId: '',
      trainingName: trainObjective || 'Treino IA',
      auxiliaryName: auxName,
      type: 'full_training',
      description: `Treino gerado pela IA: ${trainObjective}`,
      proposedChange: {
        newTraining: {
          teamId: teamId!,
          name: trainObjective || 'Treino IA',
          date: todayStr,
          duration: trainTime,
          modules: [{
            id: generateId(),
            type: 'tecnico',
            blockType: 'geral',
            description: trainResult.slice(0, 200),
            duration: trainTime,
            status: 'nao_fez',
            observation: trainResult,
          }],
          status: 'planejado',
        },
      },
    });
    setTrainResult('');
    toast.success('Treino enviado como sugestão ao treinador!');
  };

  const handleChatSend = (override?: string) => {
    const msg = override || chatInput.trim();
    if (!msg) return;
    const userMsg: AIMessage = { role: 'user', content: msg };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatting(true);
    let assistantContent = '';
    streamAI({
      messages: newMessages,
      context: { time: team?.name, total_atletas: teamAthletes.length },
      onDelta: (text) => {
        assistantContent += text;
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      },
      onDone: () => setIsChatting(false),
      onError: (err) => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${err}` }]);
        setIsChatting(false);
      },
    });
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-mono text-muted-foreground text-sm">Time não encontrado</p>
      </div>
    );
  }

  // Name prompt
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-mono text-xl font-bold neon-text mb-1">FORJA</h1>
            <p className="font-mono text-xs text-muted-foreground">Acesso do Auxiliar Técnico</p>
            <p className="font-mono text-sm text-foreground mt-2">{team.name}</p>
          </div>
          <div className="card-surface neon-border rounded-xl p-6 space-y-4">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Seu nome</label>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetName()}
                placeholder="Nome do auxiliar técnico"
                className="w-full bg-background border border-border rounded px-3 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none mt-1"
                autoFocus
              />
            </div>
            <button
              onClick={handleSetName}
              disabled={!nameInput.trim()}
              className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded hover:neon-glow transition-all disabled:opacity-50"
            >
              ENTRAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">FORJA · Auxiliar</p>
          <h1 className="font-mono text-sm font-bold neon-text">{team.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-muted-foreground">Auxiliar</p>
          <p className="font-mono text-xs text-primary">{auxName}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border flex">
        {([
          { key: 'treinos', label: 'Treinos', icon: <Dumbbell className="w-3.5 h-3.5" /> },
          { key: 'atletas', label: 'Atletas', icon: <Users className="w-3.5 h-3.5" /> },
          { key: 'ia', label: 'IA', icon: <Brain className="w-3.5 h-3.5" /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setTrainingView('list'); setAIView('main'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 font-mono text-xs transition-all ${
              tab === t.key
                ? 'text-primary border-b-2 border-primary neon-text'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">

        {/* TREINOS TAB */}
        {tab === 'treinos' && trainingView === 'list' && (
          <div className="px-4 py-6">
            <h2 className="font-mono text-sm font-medium mb-4">Treinos do Time</h2>
            {teamTrainings.length === 0 ? (
              <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum treino cadastrado</p>
            ) : (
              <div className="space-y-2">
                {teamTrainings.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTraining(t); setTrainingView('detail'); }}
                    className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm text-foreground truncate">{t.name}</h3>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')} · {t.duration}min · {t.modules.length} módulos
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] ${
                        t.status === 'concluido' ? 'text-green-400' :
                        t.status === 'parcial' ? 'text-yellow-400' :
                        t.status === 'cancelado' ? 'text-red-400' : 'text-muted-foreground'
                      }`}>{t.status.toUpperCase()}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRAINING DETAIL */}
        {tab === 'treinos' && trainingView === 'detail' && selectedTraining && (
          <div className="px-4 py-6">
            <button
              onClick={() => { setTrainingView('list'); setShowObsForm(null); setShowSuggestForm(null); }}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
            </button>

            <div className="card-surface neon-border rounded-lg p-4 mb-4">
              <h2 className="font-mono text-sm font-medium text-foreground">{selectedTraining.name}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {format(new Date(selectedTraining.date + 'T12:00:00'), 'dd/MM/yyyy')}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{selectedTraining.duration}min</span>
              </div>
            </div>

            <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Módulos</h3>

            <div className="space-y-3">
              {selectedTraining.modules.map(mod => (
                <div key={mod.id} className="card-surface neon-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-primary">{MODULE_TYPE_LABELS[mod.type]}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{mod.duration}min</span>
                    </div>
                  </div>

                  {mod.description && (
                    <p className="font-body text-xs text-foreground mb-2">{mod.description}</p>
                  )}

                  {mod.positions && mod.positions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {mod.positions.map(pos => (
                        <span key={pos} className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {POSITION_LABELS[pos]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Observation */}
                  {mod.observation && (
                    <p className="font-body text-[10px] text-muted-foreground mb-2 italic">{mod.observation}</p>
                  )}

                  {/* Status buttons */}
                  <div className="flex gap-1 mb-2">
                    {statusOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleModuleStatus(mod.id, opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1 font-mono text-[10px] py-1.5 rounded border transition-all ${
                          mod.status === opt.value
                            ? `bg-muted border-transparent ${opt.color}`
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Observation form */}
                  {showObsForm === mod.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={obsInputs[mod.id] || mod.observation || ''}
                        onChange={e => setObsInputs({ ...obsInputs, [mod.id]: e.target.value })}
                        placeholder="Adicionar observação..."
                        rows={2}
                        className="w-full bg-background border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSaveObservation(mod.id)}
                          className="flex-1 bg-primary text-primary-foreground font-mono text-[10px] py-1.5 rounded"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setShowObsForm(null)}
                          className="px-3 border border-border text-muted-foreground font-mono text-[10px] py-1.5 rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowObsForm(mod.id);
                        setObsInputs({ ...obsInputs, [mod.id]: mod.observation || '' });
                      }}
                      className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      + Observação
                    </button>
                  )}

                  {/* Suggest change */}
                  {showSuggestForm === mod.id ? (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      <p className="font-mono text-[10px] text-primary">Propor alteração neste módulo</p>
                      <textarea
                        value={suggestDesc}
                        onChange={e => setSuggestDesc(e.target.value)}
                        placeholder="Descreva a alteração proposta..."
                        rows={2}
                        className="w-full bg-background border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleProposeSuggestion(mod.id)}
                          disabled={!suggestDesc.trim()}
                          className="flex-1 bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] py-1.5 rounded disabled:opacity-50"
                        >
                          Enviar Sugestão
                        </button>
                        <button
                          onClick={() => { setShowSuggestForm(null); setSuggestDesc(''); }}
                          className="px-3 border border-border text-muted-foreground font-mono text-[10px] py-1.5 rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSuggestForm(mod.id)}
                      className="font-mono text-[10px] text-muted-foreground hover:text-yellow-400 transition-colors ml-3"
                    >
                      + Propor alteração
                    </button>
                  )}
                </div>
              ))}

              {selectedTraining.modules.length === 0 && (
                <p className="text-center text-muted-foreground font-body text-sm py-4">Nenhum módulo</p>
              )}
            </div>
          </div>
        )}

        {/* ATLETAS TAB */}
        {tab === 'atletas' && (
          <div className="px-4 py-6">
            <h2 className="font-mono text-sm font-medium mb-4">Atletas ({teamAthletes.length})</h2>
            {teamAthletes.length === 0 ? (
              <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum atleta cadastrado</p>
            ) : (
              <div className="space-y-2">
                {teamAthletes.map(a => {
                  const scores = TECHNICAL_ATTRIBUTES.map(attr =>
                    getAthleteAttributeScore(a.id, attr, data.evalTests, data.evalResults)
                  );
                  const level = calculateAthleteLevel(a.id, data.evalTests, data.evalResults);
                  return (
                    <div key={a.id} className="card-surface neon-border rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {a.photo
                            ? <img src={a.photo} alt={a.name} className="w-full h-full object-cover rounded" />
                            : <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-primary text-xs">#{a.number}</span>
                            <span className="font-mono text-sm text-foreground truncate">{a.name}</span>
                            {level > 0 && (
                              <span className="font-mono text-[10px] text-primary ml-auto">Nv {level}</span>
                            )}
                          </div>
                          <p className="font-body text-[10px] text-muted-foreground">
                            {POSITION_LABELS[a.position]} · {a.height}cm · {a.age} anos
                          </p>
                        </div>
                        <button
                          onClick={() => { setSelectedAthleteId(a.id); setTab('ia'); setAIView('atleta'); setAthleteAnalysis(''); }}
                          className="p-1.5 text-primary hover:neon-text"
                          title="Analisar com IA"
                        >
                          <Brain className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      {/* Attribute bars */}
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                        {TECHNICAL_ATTRIBUTES.map((attr, i) => (
                          <div key={attr} className="flex items-center gap-1.5">
                            <span className="font-mono text-[8px] text-muted-foreground w-14 text-right truncate">
                              {TECHNICAL_ATTRIBUTE_LABELS[attr]}
                            </span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${scores[i]}%`, boxShadow: '0 0 4px hsl(var(--primary) / 0.4)' }}
                              />
                            </div>
                            <span className="font-mono text-[8px] text-primary w-5 text-right">{Math.round(scores[i])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* IA TAB */}
        {tab === 'ia' && (
          <>
            {/* IA Main */}
            {aiView === 'main' && (
              <div className="px-4 py-6">
                <h2 className="font-mono text-lg font-bold neon-text mb-2">Assistente Técnico IA</h2>
                <p className="font-body text-xs text-muted-foreground mb-6">Análises e sugestões de treino</p>
                <div className="space-y-3">
                  <button
                    onClick={() => setAIView('atleta')}
                    className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-mono text-sm font-medium text-foreground">Analisar Atleta</h3>
                      <p className="font-body text-[10px] text-muted-foreground">Análise técnica e sugestões</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setAIView('treino')}
                    className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-mono text-sm font-medium text-foreground">Sugerir Treino com IA</h3>
                      <p className="font-body text-[10px] text-muted-foreground">Propor treino para aprovação do treinador</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setAIView('chat')}
                    className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-mono text-sm font-medium text-foreground">Chat Técnico</h3>
                      <p className="font-body text-[10px] text-muted-foreground">Perguntas sobre voleibol e táticas</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* IA Analyze Athlete */}
            {aiView === 'atleta' && (
              <div className="px-4 py-6">
                <button onClick={() => setAIView('main')} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
                </button>
                <h2 className="font-mono text-lg font-bold neon-text mb-6">Analisar Atleta com IA</h2>
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground">Selecionar Atleta</label>
                    <select
                      value={selectedAthleteId}
                      onChange={e => { setSelectedAthleteId(e.target.value); setAthleteAnalysis(''); }}
                      className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="">Escolher atleta...</option>
                      {teamAthletes.map(a => (
                        <option key={a.id} value={a.id}>#{a.number} {a.name} - {POSITION_LABELS[a.position]}</option>
                      ))}
                    </select>
                  </div>

                  {selectedAthleteId && (
                    <button
                      onClick={handleAnalyzeAthlete}
                      disabled={isAnalyzing}
                      className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded hover:neon-glow disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      {isAnalyzing ? 'Analisando...' : 'ANALISAR COM IA'}
                    </button>
                  )}

                  {athleteAnalysis && (
                    <div className="card-surface neon-border rounded-lg p-4">
                      <div className="prose prose-sm prose-invert max-w-none font-body text-sm text-foreground">
                        <ReactMarkdown>{athleteAnalysis}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IA Suggest Training */}
            {aiView === 'treino' && (
              <div className="px-4 py-6">
                <button onClick={() => setAIView('main')} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
                </button>
                <h2 className="font-mono text-lg font-bold neon-text mb-2">Sugerir Treino com IA</h2>
                <p className="font-body text-[10px] text-yellow-400 mb-4">O treino gerado será enviado como sugestão para aprovação do treinador</p>
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground">Categoria da equipe</label>
                    <input
                      value={trainCategory}
                      onChange={e => setTrainCategory(e.target.value)}
                      placeholder="Ex: Sub-18, Adulto..."
                      className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground">Tempo total (min)</label>
                    <input
                      type="number" value={trainTime}
                      onChange={e => setTrainTime(parseInt(e.target.value) || 120)}
                      className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground">Objetivo do treino</label>
                    <textarea
                      value={trainObjective}
                      onChange={e => setTrainObjective(e.target.value)}
                      placeholder="Ex: Melhorar recepção e ataque..."
                      rows={3}
                      className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground mb-1 block">Posições participantes</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['levantador', 'ponteiro', 'central', 'oposto', 'libero'] as Position[]).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setTrainPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])}
                          className={`font-mono text-[10px] px-2.5 py-1.5 rounded border transition-all ${
                            trainPositions.includes(pos)
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {POSITION_LABELS[pos]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateTraining}
                    disabled={isGenerating || !trainObjective.trim()}
                    className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded hover:neon-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGenerating ? 'Gerando...' : 'GERAR TREINO'}
                  </button>

                  {trainResult && (
                    <div className="card-surface neon-border rounded-lg p-4">
                      <div className="prose prose-sm prose-invert max-w-none font-body text-sm text-foreground">
                        <ReactMarkdown>{trainResult}</ReactMarkdown>
                      </div>
                      {!isGenerating && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={handleSendTrainingAsSuggestion}
                            className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Enviar ao Treinador
                          </button>
                          <button
                            onClick={handleGenerateTraining}
                            className="flex-1 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50 flex items-center justify-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Gerar Novo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IA Chat */}
            {aiView === 'chat' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 108px)' }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-border">
                  <button onClick={() => setAIView('main')} className="p-1 text-muted-foreground hover:text-primary">
                    <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <div>
                    <h2 className="font-mono text-sm font-bold neon-text">Chat Técnico</h2>
                    <p className="font-mono text-[10px] text-muted-foreground">Assistente de voleibol</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <MessageSquare className="w-10 h-10 text-primary/30 mx-auto mb-3" />
                      <p className="font-mono text-xs text-muted-foreground">Pergunte sobre táticas,<br />exercícios ou análise de jogo</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'card-surface neon-border'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm prose-invert max-w-none font-body text-sm text-foreground">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="font-body text-sm">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="px-4 py-3 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                      placeholder="Pergunte algo sobre voleibol..."
                      className="flex-1 bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                      disabled={isChatting}
                    />
                    <button
                      onClick={() => handleChatSend()}
                      disabled={isChatting || !chatInput.trim()}
                      className="px-4 bg-primary text-primary-foreground rounded hover:neon-glow disabled:opacity-50 transition-all"
                    >
                      {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuxiliaryPage;
