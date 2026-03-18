import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Athlete, POSITION_LABELS, Position, getAthleteAttributeScore } from '@/lib/types';
import { RadarChart } from '@/components/RadarChart';
import { ArrowLeft, RotateCcw, Trash2, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type CourtPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
const COURT_POSITIONS: CourtPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const ROTATION_MAP: Record<CourtPosition, CourtPosition> = {
  P1: 'P6', P6: 'P5', P5: 'P4', P4: 'P3', P3: 'P2', P2: 'P1',
};
const NET_POSITIONS: CourtPosition[] = ['P4', 'P3', 'P2'];
const BACK_POSITIONS: CourtPosition[] = ['P5', 'P6', 'P1'];

const POSITION_GROUPS: { label: string; position: Position }[] = [
  { label: 'Levantadores', position: 'levantador' },
  { label: 'Ponteiros', position: 'ponteiro' },
  { label: 'Centrais', position: 'central' },
  { label: 'Opostos', position: 'oposto' },
  { label: 'Líberos', position: 'libero' },
];

interface RotationAnalysis {
  ataque: number;
  bloqueio: number;
  passe: number;
  defesa: number;
  saque: number;
}

// Libero substitution state: libero is on court replacing a central in back row
interface LiberoSub {
  liberoId: string;
  replacedId: string; // central player replaced
}

function analyzeFormation(
  formation: Record<CourtPosition, string | null>,
  athletes: Athlete[],
  evalTests: any[],
  evalResults: any[],
): RotationAnalysis {
  let ataqueSum = 0, ataqueW = 0;
  let bloqueioSum = 0, bloqueioW = 0;
  let passeSum = 0, passeW = 0;
  let defesaSum = 0, defesaW = 0;
  let sauqueSum = 0, sauqueW = 0;

  for (const courtPos of COURT_POSITIONS) {
    const athleteId = formation[courtPos];
    if (!athleteId) continue;
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) continue;

    const isNet = NET_POSITIONS.includes(courtPos);

    const sc = (attr: string) => getAthleteAttributeScore(athleteId, attr, evalTests, evalResults);
    const ataque = sc('ataque');
    const bloqueio = sc('bloqueio');
    const recepcao = sc('recepcao');
    const defesa = sc('defesa');
    const saque = sc('saque');
    const levantamento = sc('levantamento');

    // Saque: all players
    sauqueSum += saque; sauqueW += 1;

    switch (athlete.position) {
      case 'ponteiro':
        if (isNet) {
          ataqueSum += ataque; ataqueW += 1;
          bloqueioSum += bloqueio; bloqueioW += 1;
        } else {
          passeSum += recepcao; passeW += 1;
          defesaSum += defesa; defesaW += 1;
        }
        break;

      case 'central':
        if (isNet) {
          ataqueSum += ataque; ataqueW += 1;
          bloqueioSum += bloqueio * 1.2; bloqueioW += 1.2; // centrais são principais bloqueadores
        } else {
          passeSum += recepcao * 0.7; passeW += 0.7; // contribuição reduzida no passe
          defesaSum += defesa; defesaW += 1;
        }
        break;

      case 'libero':
        if (!isNet) {
          passeSum += recepcao * 1.5; passeW += 1.5; // líbero tem maior peso no passe
          defesaSum += defesa * 1.5; defesaW += 1.5;
        }
        // Líbero não vai à rede
        break;

      case 'oposto':
        if (isNet) {
          ataqueSum += ataque * 1.1; ataqueW += 1.1; // oposto é principal atacante
          bloqueioSum += bloqueio; bloqueioW += 1;
        } else {
          defesaSum += defesa; defesaW += 1;
          // NÃO conta para passe
        }
        break;

      case 'levantador':
        if (isNet) {
          // Usa levantamento * 0.7 no ataque, ou ataque * 0.5 se levantamento não avaliado
          const efAtaque = levantamento > 0 ? levantamento * 0.7 : ataque * 0.5;
          ataqueSum += efAtaque; ataqueW += 1;
          bloqueioSum += bloqueio; bloqueioW += 1;
        } else {
          defesaSum += defesa; defesaW += 1;
          // NÃO conta para passe
        }
        break;
    }
  }

  return {
    ataque: ataqueW > 0 ? Math.min(100, ataqueSum / ataqueW) : 0,
    bloqueio: bloqueioW > 0 ? Math.min(100, bloqueioSum / bloqueioW) : 0,
    passe: passeW > 0 ? Math.min(100, passeSum / passeW) : 0,
    defesa: defesaW > 0 ? Math.min(100, defesaSum / defesaW) : 0,
    saque: sauqueW > 0 ? Math.min(100, sauqueSum / sauqueW) : 0,
  };
}

function getRotationStrength(analysis: RotationAnalysis): 'forte' | 'equilibrada' | 'fraca' {
  const avg = (analysis.ataque + analysis.bloqueio + analysis.passe + analysis.defesa + analysis.saque) / 5;
  if (avg >= 65) return 'forte';
  if (avg >= 40) return 'equilibrada';
  return 'fraca';
}

function generateInsights(
  formation: Record<CourtPosition, string | null>,
  athletes: Athlete[],
  analysis: RotationAnalysis,
): { fortes: string[]; fracos: string[] } {
  const fortes: string[] = [];
  const fracos: string[] = [];

  const hasLibero = COURT_POSITIONS.some(p => {
    const id = formation[p];
    return id && athletes.find(a => a.id === id)?.position === 'libero';
  });
  const liberoInBack = BACK_POSITIONS.some(p => {
    const id = formation[p];
    return id && athletes.find(a => a.id === id)?.position === 'libero';
  });
  const ponteirosAtRede = NET_POSITIONS.filter(p => {
    const id = formation[p];
    return id && athletes.find(a => a.id === id)?.position === 'ponteiro';
  });
  const centraisAtRede = NET_POSITIONS.filter(p => {
    const id = formation[p];
    return id && athletes.find(a => a.id === id)?.position === 'central';
  });
  const opostoAtRede = NET_POSITIONS.some(p => {
    const id = formation[p];
    return id && athletes.find(a => a.id === id)?.position === 'oposto';
  });

  // Passe
  if (analysis.passe >= 65) {
    if (liberoInBack) fortes.push('Passe forte com líbero atuando no fundo');
    else fortes.push('Passe eficiente');
  } else if (analysis.passe < 40) {
    if (!hasLibero) fracos.push('Passe vulnerável sem líbero em quadra');
    else fracos.push('Passe abaixo do ideal nesta rotação');
  }

  // Ataque
  if (analysis.ataque >= 65) {
    if (opostoAtRede) fortes.push('Ataque forte com oposto na rede');
    if (ponteirosAtRede.length >= 2) fortes.push('Pressão ofensiva com ponteiros na entrada de rede');
    else fortes.push('Ataque eficiente nesta rotação');
  } else if (analysis.ataque < 40) {
    fracos.push('Fraca presença ofensiva na rede');
  }

  // Bloqueio
  if (analysis.bloqueio >= 65) {
    if (centraisAtRede.length > 0) fortes.push(`Bloqueio eficiente com ${centraisAtRede.length > 1 ? 'centrais' : 'central'} na rede`);
    else fortes.push('Bloqueio sólido nesta rotação');
  } else if (analysis.bloqueio < 40) {
    fracos.push('Baixa presença de bloqueio');
  }

  // Defesa
  if (analysis.defesa >= 65) {
    fortes.push('Sistema defensivo sólido no fundo');
  } else if (analysis.defesa < 40) {
    fracos.push('Defesa fraca no fundo de quadra');
  }

  // Saque
  if (analysis.saque >= 65) fortes.push('Saque potente em todos os atletas');

  return { fortes, fracos };
}

export default function TacticalSystemPage() {
  const navigate = useNavigate();
  const { data } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState(data.activeTeamId);
  const [tab, setTab] = useState<'sistema' | 'rodizio'>('sistema');
  const [formation, setFormation] = useState<Record<CourtPosition, string | null>>({
    P1: null, P2: null, P3: null, P4: null, P5: null, P6: null,
  });
  const [selectingPosition, setSelectingPosition] = useState<CourtPosition | null>(null);
  const [liberoSub, setLiberoSub] = useState<LiberoSub | null>(null);
  const [showLiberoConfig, setShowLiberoConfig] = useState(false);

  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === selectedTeamId),
    [data.athletes, selectedTeamId]
  );

  const assignedIds = useMemo(() => new Set(Object.values(formation).filter(Boolean) as string[]), [formation]);

  const getAthlete = (id: string | null): Athlete | undefined =>
    id ? teamAthletes.find(a => a.id === id) : undefined;

  const handleSelectAthlete = (athleteId: string) => {
    if (!selectingPosition) return;
    const athlete = teamAthletes.find(a => a.id === athleteId);

    // Líbero só pode ir para o fundo
    if (athlete?.position === 'libero' && NET_POSITIONS.includes(selectingPosition)) {
      setSelectingPosition(null);
      return;
    }

    setFormation(prev => ({ ...prev, [selectingPosition]: athleteId }));
    setSelectingPosition(null);
  };

  const clearFormation = () => {
    setFormation({ P1: null, P2: null, P3: null, P4: null, P5: null, P6: null });
    setLiberoSub(null);
  };

  const handleRotation = () => {
    setFormation(prev => {
      const next: Record<CourtPosition, string | null> = { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null };
      for (const pos of COURT_POSITIONS) {
        next[ROTATION_MAP[pos]] = prev[pos];
      }

      // Handle libero substitution: if libero would go to net, swap with replaced player
      if (liberoSub) {
        const liberoNextPos = (Object.entries(next) as [CourtPosition, string | null][])
          .find(([, id]) => id === liberoSub.liberoId)?.[0];

        if (liberoNextPos && NET_POSITIONS.includes(liberoNextPos)) {
          // Libero can't go to net: replace them with the central they substituted
          next[liberoNextPos] = liberoSub.replacedId;
          // Find a back position for libero — put them in the position the replaced player came from
          const replacedNewPos = (Object.entries(next) as [CourtPosition, string | null][])
            .find(([, id]) => id === liberoSub.replacedId && id !== liberoSub.replacedId)?.[0];
          if (replacedNewPos && BACK_POSITIONS.includes(replacedNewPos)) {
            // Already handled
          }
          // The libero sits out this rotation if they'd be at net
        }
      }

      return next;
    });
  };

  const analysis = useMemo(
    () => analyzeFormation(formation, teamAthletes, data.evalTests, data.evalResults),
    [formation, teamAthletes, data.evalTests, data.evalResults]
  );

  const hasPlayersOnCourt = COURT_POSITIONS.some(p => formation[p]);

  const strength = useMemo(() => hasPlayersOnCourt ? getRotationStrength(analysis) : null, [analysis, hasPlayersOnCourt]);

  const insights = useMemo(
    () => hasPlayersOnCourt ? generateInsights(formation, teamAthletes, analysis) : { fortes: [], fracos: [] },
    [formation, teamAthletes, analysis, hasPlayersOnCourt]
  );

  const radarLabels = ['Ataque', 'Bloqueio', 'Passe', 'Defesa', 'Saque'];
  const radarValues = useMemo(
    () => [analysis.ataque, analysis.bloqueio, analysis.passe, analysis.defesa, analysis.saque],
    [analysis]
  );

  const rotationHistory = useMemo(() => {
    if (!hasPlayersOnCourt) return [];
    const history: { rotation: number; analysis: RotationAnalysis }[] = [];
    let current = { ...formation };
    for (let i = 0; i < 6; i++) {
      history.push({ rotation: i + 1, analysis: analyzeFormation(current, teamAthletes, data.evalTests, data.evalResults) });
      const next: Record<CourtPosition, string | null> = { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null };
      for (const pos of COURT_POSITIONS) next[ROTATION_MAP[pos]] = current[pos];
      current = next;
    }
    return history;
  }, [formation, teamAthletes, data.evalTests, data.evalResults, hasPlayersOnCourt]);

  const strengthIndicator = {
    forte: { emoji: '🟢', label: 'Rotação Forte', cls: 'text-green-400 border-green-400/30 bg-green-400/10' },
    equilibrada: { emoji: '🟡', label: 'Rotação Equilibrada', cls: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
    fraca: { emoji: '🔴', label: 'Rotação Fraca', cls: 'text-red-400 border-red-400/30 bg-red-400/10' },
  };

  // Team analysis
  const teamAnalysis = useMemo(() => {
    if (teamAthletes.length === 0) return null;
    const attrs = ['ataque', 'bloqueio', 'recepcao', 'defesa', 'saque', 'levantamento'];
    const scores: Record<string, number> = {};
    for (const attr of attrs) {
      const sc = teamAthletes.map(a => getAthleteAttributeScore(a.id, attr, data.evalTests, data.evalResults)).filter(s => s > 0);
      scores[attr] = sc.length > 0 ? sc.reduce((a, b) => a + b, 0) / sc.length : 0;
    }

    const sorted = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const labels: Record<string, string> = {
      ataque: 'ataque', bloqueio: 'bloqueio', recepcao: 'recepção', defesa: 'defesa', saque: 'saque', levantamento: 'levantamento',
    };

    const top = sorted.slice(0, 2).map(([k]) => labels[k]);
    const bottom = sorted.slice(-2).map(([k]) => labels[k]);

    const levScore = scores['levantamento'] || 0;
    const hasLiberoAthletes = teamAthletes.some(a => a.position === 'libero');

    const lines: string[] = [];
    if (top.length > 0) {
      lines.push(`O time apresenta bom desempenho em ${top.join(' e ')}.`);
    }
    if (levScore > 60) {
      lines.push('O levantamento de qualidade está impulsionando a eficiência ofensiva.');
    } else if (levScore > 0 && levScore < 40) {
      lines.push('O baixo nível de levantamento está limitando a eficiência do ataque.');
    }
    if (bottom.length > 0 && bottom[0] !== top[0]) {
      lines.push(`Pontos de atenção: ${bottom.join(' e ')} necessitam de maior foco.`);
    }
    if (!hasLiberoAthletes) {
      lines.push('Nenhum líbero cadastrado — isso impacta o sistema defensivo.');
    }

    return lines.join(' ');
  }, [teamAthletes, data.evalTests, data.evalResults]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-mono text-lg font-bold neon-text tracking-wider">Sistema Tático</h1>
          <p className="font-mono text-[10px] text-muted-foreground">Formação 5x1 · Análise inteligente de rotações</p>
        </div>
      </div>

      {/* Team analysis banner */}
      {teamAnalysis && (
        <div className="card-surface border border-primary/20 rounded-lg px-4 py-3 mb-4">
          <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">Análise do Time</p>
          <p className="font-body text-xs text-muted-foreground leading-relaxed">{teamAnalysis}</p>
        </div>
      )}

      {/* Team selector */}
      <div className="flex gap-2 mb-4">
        {data.teams.map(team => (
          <button key={team.id}
            onClick={() => { setSelectedTeamId(team.id); clearFormation(); }}
            className={`flex-1 font-mono text-xs py-2 px-3 rounded border transition-all ${
              selectedTeamId === team.id ? 'border-primary text-primary neon-border' : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {team.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ key: 'sistema' as const, label: 'Sistema de Vôlei' }, { key: 'rodizio' as const, label: 'Rodízio' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${
              tab === t.key ? 'border-primary text-primary bg-primary/10 neon-border' : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rotation strength indicator */}
      {hasPlayersOnCourt && strength && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded border mb-4 ${strengthIndicator[strength].cls}`}>
          <span className="text-base">{strengthIndicator[strength].emoji}</span>
          <span className="font-mono text-xs font-bold">{strengthIndicator[strength].label}</span>
        </div>
      )}

      {/* Court */}
      <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-lg border border-primary/30 bg-card overflow-hidden neon-border mb-4">
        <div className="absolute inset-0">
          <div className="absolute left-0 right-0 h-[3px] bg-primary/60 shadow-[0_0_8px_hsl(var(--primary)/0.5)]" style={{ top: '12%' }} />
          <span className="absolute font-mono text-[9px] text-primary/60 uppercase tracking-widest" style={{ top: '6%', left: '50%', transform: 'translateX(-50%)' }}>Rede</span>
          <div className="absolute left-0 right-0 h-[2px] bg-primary/40" style={{ top: '45%' }} />
          <div className="absolute top-0 bottom-0 left-[5%] w-[1px] bg-primary/15" />
          <div className="absolute top-0 bottom-0 right-[5%] w-[1px] bg-primary/15" />
          <div className="absolute left-0 right-0 bg-primary/5" style={{ top: '12%', height: '33%' }} />
        </div>
        <div className="absolute flex justify-around px-[10%]" style={{ top: '22%', left: 0, right: 0 }}>
          {(['P4', 'P3', 'P2'] as CourtPosition[]).map(pos => (
            <CourtPositionCircle key={pos} pos={pos} athlete={getAthlete(formation[pos])} isNet={true}
              onClick={() => setSelectingPosition(pos)} />
          ))}
        </div>
        <div className="absolute flex justify-around px-[10%]" style={{ top: '65%', left: 0, right: 0 }}>
          {(['P5', 'P6', 'P1'] as CourtPosition[]).map(pos => (
            <CourtPositionCircle key={pos} pos={pos} athlete={getAthlete(formation[pos])} isNet={false}
              onClick={() => setSelectingPosition(pos)} />
          ))}
        </div>
      </div>

      {/* Libero config */}
      {teamAthletes.some(a => a.position === 'libero') && (
        <div className="mb-4 max-w-sm mx-auto w-full">
          <button
            onClick={() => setShowLiberoConfig(!showLiberoConfig)}
            className="w-full flex items-center justify-between px-3 py-2 rounded border border-border text-muted-foreground font-mono text-[10px] hover:border-primary/30 transition-all"
          >
            <span>Configurar substituição do líbero</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showLiberoConfig ? 'rotate-180' : ''}`} />
          </button>
          {showLiberoConfig && (
            <div className="mt-2 card-surface border border-border rounded p-3 space-y-2">
              <p className="font-body text-[10px] text-muted-foreground">Selecione o central que o líbero está substituindo:</p>
              <div className="space-y-1">
                {teamAthletes.filter(a => a.position === 'central').map(central => {
                  const libero = teamAthletes.find(a => a.position === 'libero' && assignedIds.has(a.id));
                  const selected = liberoSub?.replacedId === central.id;
                  return (
                    <button key={central.id}
                      onClick={() => {
                        if (libero) {
                          setLiberoSub(selected ? null : { liberoId: libero.id, replacedId: central.id });
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border text-left transition-all ${
                        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'
                      }`}
                    >
                      <span className="font-mono text-[10px]">#{central.number} {central.name}</span>
                      {selected && <span className="font-mono text-[9px] text-primary ml-auto">substituto pelo líbero</span>}
                    </button>
                  );
                })}
              </div>
              {liberoSub && (
                <button onClick={() => setLiberoSub(null)} className="font-mono text-[10px] text-destructive hover:underline">
                  Remover substituição
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 max-w-sm mx-auto w-full">
        <button onClick={clearFormation}
          className="flex-1 flex items-center justify-center gap-2 font-mono text-xs py-2 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all">
          <Trash2 className="w-4 h-4" /> Limpar
        </button>
        {tab === 'rodizio' && (
          <button onClick={handleRotation}
            className="flex-1 flex items-center justify-center gap-2 font-mono text-xs py-2 rounded border border-primary text-primary neon-border transition-all hover:bg-primary/10">
            <RotateCcw className="w-4 h-4" /> Simular Rodízio
          </button>
        )}
      </div>

      {/* Rotation Analysis Panel */}
      {hasPlayersOnCourt && (
        <div className="mb-6">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Análise da Rotação</h3>
          <div className="card-surface neon-border rounded-lg p-4 space-y-3">
            {[
              { label: 'Ataque', value: analysis.ataque, desc: 'Linha da rede' },
              { label: 'Bloqueio', value: analysis.bloqueio, desc: 'Linha da rede' },
              { label: 'Passe', value: analysis.passe, desc: 'Líbero + Ponteiros' },
              { label: 'Defesa', value: analysis.defesa, desc: 'Linha de trás' },
              { label: 'Saque', value: analysis.saque, desc: 'Todos' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{item.label}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">({item.desc})</span>
                  </div>
                  <span className="font-mono text-xs text-primary font-bold">{Math.round(item.value)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${item.value}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths and weaknesses */}
      {hasPlayersOnCourt && (insights.fortes.length > 0 || insights.fracos.length > 0) && (
        <div className="mb-6 space-y-3">
          {insights.fortes.length > 0 && (
            <div className="card-surface border border-green-500/20 rounded-lg p-4">
              <p className="font-mono text-[10px] text-green-400 uppercase tracking-widest mb-2">✅ Pontos Fortes</p>
              <ul className="space-y-1">
                {insights.fortes.map((item, i) => (
                  <li key={i} className="font-body text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insights.fracos.length > 0 && (
            <div className="card-surface border border-red-500/20 rounded-lg p-4">
              <p className="font-mono text-[10px] text-red-400 uppercase tracking-widest mb-2">⚠️ Pontos Fracos</p>
              <ul className="space-y-1">
                {insights.fracos.map((item, i) => (
                  <li key={i} className="font-body text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Formation Radar */}
      {hasPlayersOnCourt && (
        <div className="flex flex-col items-center mb-6">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Radar da Formação</h3>
          <div className="card-surface neon-border rounded-lg p-4">
            <RadarChart labels={radarLabels} values={radarValues} size={220} />
          </div>
        </div>
      )}

      {/* Rotation History */}
      {tab === 'rodizio' && rotationHistory.length > 0 && (
        <div className="mb-8">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Histórico das 6 Rotações</h3>
          <div className="card-surface neon-border rounded-lg p-4 space-y-2">
            {rotationHistory.map((r, i) => {
              const avgScore = (r.analysis.ataque + r.analysis.bloqueio + r.analysis.passe + r.analysis.defesa) / 4;
              const bestAvg = Math.max(...rotationHistory.map(h => (h.analysis.ataque + h.analysis.bloqueio + h.analysis.passe + h.analysis.defesa) / 4));
              const isBest = avgScore === bestAvg && bestAvg > 0;
              const str = getRotationStrength(r.analysis);
              const dot = str === 'forte' ? '🟢' : str === 'equilibrada' ? '🟡' : '🔴';
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded ${isBest ? 'bg-primary/10 border border-primary/30' : ''}`}>
                  <span className="font-mono text-xs text-muted-foreground w-14">Rot. {r.rotation}</span>
                  <span className="text-sm">{dot}</span>
                  <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      { label: 'Ataque', v: r.analysis.ataque },
                      { label: 'Bloqueio', v: r.analysis.bloqueio },
                      { label: 'Passe', v: r.analysis.passe },
                      { label: 'Defesa', v: r.analysis.defesa },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1">
                        <span className="font-mono text-[9px] text-muted-foreground w-12">{item.label}</span>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.v}%` }} />
                        </div>
                        <span className="font-mono text-[9px] text-primary w-5 text-right">{Math.round(item.v)}</span>
                      </div>
                    ))}
                  </div>
                  {isBest && <span className="font-mono text-[9px] text-primary">★</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Athlete selector panel */}
      <AnimatePresence>
        {selectingPosition && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setSelectingPosition(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 right-0 bottom-0 max-h-[70vh] bg-card border-t border-primary/30 rounded-t-xl z-50 overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-mono text-sm font-bold neon-text">Selecionar Atleta — {selectingPosition}</h3>
                  {NET_POSITIONS.includes(selectingPosition) && (
                    <p className="font-mono text-[9px] text-muted-foreground">Líbero não pode jogar na rede</p>
                  )}
                </div>
                <button onClick={() => setSelectingPosition(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formation[selectingPosition] && (
                <button
                  onClick={() => { setFormation(prev => ({ ...prev, [selectingPosition]: null })); setSelectingPosition(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 border-b border-border font-mono"
                >
                  <Trash2 className="w-4 h-4" /> Remover Atleta
                </button>
              )}

              <div className="p-4 space-y-4">
                {POSITION_GROUPS.map(group => {
                  const athletes = teamAthletes.filter(a => {
                    if (a.position !== group.position) return false;
                    if (assignedIds.has(a.id)) return false;
                    // Líbero cannot go to net
                    if (a.position === 'libero' && NET_POSITIONS.includes(selectingPosition)) return false;
                    return true;
                  });
                  if (athletes.length === 0) return null;
                  return (
                    <div key={group.position}>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{group.label}</p>
                      {athletes.map(a => (
                        <button key={a.id} onClick={() => handleSelectAthlete(a.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-primary/10 transition-all">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-mono text-xs text-primary">
                            {a.number}
                          </div>
                          <div className="text-left">
                            <p className="text-sm text-foreground">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{POSITION_LABELS[a.position]}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {teamAthletes.filter(a => !assignedIds.has(a.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 font-mono">Nenhum atleta disponível</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CourtPositionCircle({ pos, athlete, isNet, onClick }: {
  pos: CourtPosition; athlete?: Athlete; isNet: boolean; onClick: () => void;
}) {
  const isLibero = athlete?.position === 'libero';
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 transition-all ${
        isLibero
          ? 'border-yellow-400/70 shadow-[0_0_12px_rgba(234,179,8,0.3)] bg-yellow-400/10'
          : isNet
          ? 'border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.3)] bg-primary/10'
          : 'border-primary/30 bg-card'
      } hover:border-primary hover:shadow-[0_0_16px_hsl(var(--primary)/0.5)]`}
    >
      {athlete ? (
        <>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate max-w-[54px]">
            {athlete.name.split(' ')[0]}
          </span>
          <span className={`text-[8px] font-mono ${isLibero ? 'text-yellow-400' : 'text-primary'}`}>
            {POSITION_LABELS[athlete.position]}
          </span>
          <span className="text-[8px] text-muted-foreground font-mono">{pos}</span>
        </>
      ) : (
        <span className="font-mono text-sm text-primary/70">{pos}</span>
      )}
    </button>
  );
}
