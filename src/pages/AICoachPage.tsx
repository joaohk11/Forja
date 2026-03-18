import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { streamAI, AIMessage } from '@/lib/ai';
import { generateId } from '@/lib/store';
import { POSITION_LABELS, Position, TECHNICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTE_LABELS, getAthleteAttributeScore, calculateAthleteLevel } from '@/lib/types';
import { ArrowLeft, Sparkles, Brain, MessageSquare, Send, RefreshCw, Save, Loader2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const positions: Position[] = ['levantador', 'ponteiro', 'central', 'oposto', 'libero'];

type AIView = 'main' | 'treino' | 'atleta' | 'chat';

const AICoachPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, activeTeamId, addTraining } = useApp();

  const initialTab = params.get('tab');
  const initialAthleteId = params.get('athleteId');
  const initialTrainingId = params.get('trainingId');

  const [view, setView] = useState<AIView>(
    initialTab === 'treino' ? 'treino' :
    initialTab === 'atleta' ? 'atleta' :
    initialTab === 'chat' ? 'chat' : 'main'
  );

  // --- Generate Training State ---
  const [trainCategory, setTrainCategory] = useState('');
  const [trainTime, setTrainTime] = useState(120);
  const [trainObjective, setTrainObjective] = useState('');
  const [trainPositions, setTrainPositions] = useState<Position[]>([]);
  const [trainResult, setTrainResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Analyze Athlete State ---
  const [selectedAthleteId, setSelectedAthleteId] = useState(initialAthleteId || '');
  const [athleteAnalysis, setAthleteAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Chat State ---
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const teamAthletes = data.athletes.filter(a => a.teamId === activeTeamId);
  const selectedAthlete = teamAthletes.find(a => a.id === selectedAthleteId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-trigger for improve training
  useEffect(() => {
    if (initialTrainingId && initialTab === 'chat') {
      const training = data.trainings.find(t => t.id === initialTrainingId);
      if (training) {
        const msg = `Analise e sugira melhorias para este treino:\n\nNome: ${training.name}\nData: ${training.date}\nDuração: ${training.duration}min\nMódulos:\n${training.modules.map((m, i) => `${i + 1}. ${m.type} - ${m.description} (${m.duration}min)`).join('\n')}`;
        handleChatSend(msg);
      }
    }
  }, []);

  const getAthleteContext = () => {
    if (!selectedAthlete) return {};
    const scores: Record<string, number> = {};
    TECHNICAL_ATTRIBUTES.forEach(attr => {
      scores[TECHNICAL_ATTRIBUTE_LABELS[attr]] = getAthleteAttributeScore(selectedAthlete.id, attr, data.evalTests, data.evalResults);
    });
    return {
      nome: selectedAthlete.name,
      posicao: POSITION_LABELS[selectedAthlete.position],
      altura: selectedAthlete.height,
      idade: selectedAthlete.age,
      nivel: calculateAthleteLevel(selectedAthlete.id, data.evalTests, data.evalResults),
      atributos: scores,
      observacao: selectedAthlete.observation,
    };
  };

  const handleGenerateTraining = () => {
    if (!trainObjective.trim()) return;
    setIsGenerating(true);
    setTrainResult('');

    const posLabels = trainPositions.map(p => POSITION_LABELS[p]).join(', ') || 'Todas';
    const prompt = `Crie um treino de voleibol estruturado com as seguintes especificações:
- Categoria: ${trainCategory || 'Não especificada'}
- Tempo total: ${trainTime} minutos
- Objetivo: ${trainObjective}
- Posições participantes: ${posLabels}

Formate a resposta com:
## TREINO
### Aquecimento
(exercícios e tempo)
### Exercício Principal
(exercícios e tempo)
### Exercício Complementar
(exercícios e tempo)
### Situação de Jogo
(exercícios e tempo)
### Tempo Estimado Total`;

    let result = '';
    streamAI({
      messages: [{ role: 'user', content: prompt }],
      context: {
        atletas_disponiveis: teamAthletes.map(a => ({
          nome: a.name, posicao: POSITION_LABELS[a.position], numero: a.number,
        })),
      },
      onDelta: (text) => { result += text; setTrainResult(result); },
      onDone: () => setIsGenerating(false),
      onError: (err) => { setTrainResult(`Erro: ${err}`); setIsGenerating(false); },
    });
  };

  const handleSaveGeneratedTraining = () => {
    if (!trainResult) return;
    addTraining({
      teamId: activeTeamId,
      name: trainObjective || 'Treino IA',
      date: new Date().toISOString().slice(0, 10),
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
    });
    navigate('/calendario');
  };

  const handleAnalyzeAthlete = () => {
    if (!selectedAthlete) return;
    setIsAnalyzing(true);
    setAthleteAnalysis('');

    const ctx = getAthleteContext();
    const prompt = `Analise este atleta de voleibol e forneça:

## Análise Técnica
## Pontos Fortes
## Pontos a Desenvolver
## Sugestões de Treino
## Função Tática Ideal

Dados do atleta:
- Nome: ${ctx.nome}
- Posição: ${ctx.posicao}
- Altura: ${ctx.altura}cm
- Idade: ${ctx.idade} anos
- Nível: ${ctx.nivel}
- Atributos: ${JSON.stringify(ctx.atributos)}
${ctx.observacao ? `- Observação: ${ctx.observacao}` : ''}`;

    let result = '';
    streamAI({
      messages: [{ role: 'user', content: prompt }],
      onDelta: (text) => { result += text; setAthleteAnalysis(result); },
      onDone: () => setIsAnalyzing(false),
      onError: (err) => { setAthleteAnalysis(`Erro: ${err}`); setIsAnalyzing(false); },
    });
  };

  const handleGenerateAthleteTraining = () => {
    if (!selectedAthlete) return;
    setView('treino');
    setTrainObjective(`Treino específico para ${selectedAthlete.name} (${POSITION_LABELS[selectedAthlete.position]})`);
    setTrainPositions([selectedAthlete.position]);
  };

  const handleChatSend = (overrideMsg?: string) => {
    const msg = overrideMsg || chatInput.trim();
    if (!msg) return;
    const userMsg: AIMessage = { role: 'user', content: msg };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatting(true);

    let assistantContent = '';
    streamAI({
      messages: newMessages,
      context: {
        time: data.teams.find(t => t.id === activeTeamId)?.name,
        total_atletas: teamAthletes.length,
        total_treinos: data.trainings.filter(t => t.teamId === activeTeamId).length,
      },
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

  const toggleTrainPosition = (pos: Position) => {
    setTrainPositions(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

  // Main view
  if (view === 'main') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-2">IA do Treinador</h2>
        <p className="font-body text-xs text-muted-foreground mb-6">Assistente inteligente para treinos e análises</p>

        <div className="space-y-3">
          <button
            onClick={() => setView('treino')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Criar Treino com IA</h3>
              <p className="font-body text-[10px] text-muted-foreground">Gere treinos estruturados automaticamente</p>
            </div>
          </button>

          <button
            onClick={() => setView('atleta')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Analisar Atleta</h3>
              <p className="font-body text-[10px] text-muted-foreground">Análise técnica e sugestões de treino</p>
            </div>
          </button>

          <button
            onClick={() => setView('chat')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Perguntar ao Treinador</h3>
              <p className="font-body text-[10px] text-muted-foreground">Chat direto com assistente de voleibol</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Generate Training view
  if (view === 'treino') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => setView('main')} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-6">Criar Treino com IA</h2>

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Categoria da equipe</label>
            <input
              value={trainCategory}
              onChange={e => setTrainCategory(e.target.value)}
              placeholder="Ex: Sub-18, Adulto, Iniciante..."
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
              placeholder="Ex: Melhorar recepção e ataque de ponta..."
              rows={3}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-muted-foreground mb-1 block">Posições participantes</label>
            <div className="flex flex-wrap gap-1.5">
              {positions.map(pos => (
                <button
                  key={pos}
                  onClick={() => toggleTrainPosition(pos)}
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
            {isGenerating ? 'Gerando...' : 'GERAR TREINO COM IA'}
          </button>

          {trainResult && (
            <div className="card-surface neon-border rounded-lg p-4 mt-4">
              <div className="prose prose-sm prose-invert max-w-none font-body text-sm text-foreground">
                <ReactMarkdown>{trainResult}</ReactMarkdown>
              </div>
              {!isGenerating && (
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveGeneratedTraining} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow flex items-center justify-center gap-1">
                    <Save className="w-3 h-3" /> Salvar Treino
                  </button>
                  <button onClick={handleGenerateTraining} className="flex-1 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50 flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Gerar Novo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Analyze Athlete view
  if (view === 'atleta') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => setView('main')} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
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

          {selectedAthlete && (
            <div className="card-surface neon-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-12 bg-muted rounded flex items-center justify-center">
                  {selectedAthlete.photo
                    ? <img src={selectedAthlete.photo} alt={selectedAthlete.name} className="w-full h-full object-cover rounded" />
                    : <User className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="font-mono text-sm font-bold text-foreground">{selectedAthlete.name}</p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    {POSITION_LABELS[selectedAthlete.position]} · {selectedAthlete.height}cm · {selectedAthlete.age} anos
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {TECHNICAL_ATTRIBUTES.map(attr => {
                  const score = getAthleteAttributeScore(selectedAthlete.id, attr, data.evalTests, data.evalResults);
                  return (
                    <div key={attr} className="flex items-center justify-between text-[10px] font-mono px-2 py-1 bg-muted/30 rounded">
                      <span className="text-muted-foreground">{TECHNICAL_ATTRIBUTE_LABELS[attr]}</span>
                      <span className="text-primary">{Math.round(score)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeAthlete}
                  disabled={isAnalyzing}
                  className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  {isAnalyzing ? 'Analisando...' : 'ANALISAR COM IA'}
                </button>
                <button
                  onClick={handleGenerateAthleteTraining}
                  className="flex-1 border border-primary text-primary font-mono text-xs py-2 rounded hover:bg-primary/10 flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Gerar Treino
                </button>
              </div>
            </div>
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
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => setView('main')} className="p-1 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div>
          <h2 className="font-mono text-sm font-bold neon-text">Chat do Treinador</h2>
          <p className="font-mono text-[10px] text-muted-foreground">Assistente de voleibol</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-primary/30 mx-auto mb-3" />
            <p className="font-mono text-xs text-muted-foreground">Faça uma pergunta sobre treinos,<br />táticas ou desenvolvimento de atletas</p>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'card-surface neon-border'
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
  );
};

export default AICoachPage;
