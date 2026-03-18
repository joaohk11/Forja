import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { SKILLS, MODULE_TYPE_LABELS } from '@/lib/types';
import { format, subDays, subMonths, parseISO, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

type HistoryView = 'date' | 'technical' | 'fundamentos';
type PeriodFilter = 'semana' | 'mes' | 'mesociclo' | 'macrociclo';

const FUNDAMENTOS = [
  'ataque', 'recepção', 'bloqueio', 'defesa', 'cobertura',
  'manchete', 'toque', 'movimento de ataque', 'movimento de bloqueio',
] as const;

const FUNDAMENTO_LABELS: Record<string, string> = {
  'ataque': 'Ataque',
  'recepção': 'Recepção',
  'bloqueio': 'Bloqueio',
  'defesa': 'Defesa',
  'cobertura': 'Cobertura',
  'manchete': 'Manchete',
  'toque': 'Toque',
  'movimento de ataque': 'Mov. Ataque',
  'movimento de bloqueio': 'Mov. Bloqueio',
};

const ALERT_THRESHOLD = 0.08; // 8% - below this percentage triggers alert

const HistoryPage = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<HistoryView>('date');
  const [period, setPeriod] = useState<PeriodFilter>('mes');

  const teamTrainings = data.trainings
    .filter(t => t.teamId === activeTeamId && t.status !== 'planejado')
    .sort((a, b) => b.date.localeCompare(a.date));

  // Filter trainings by period
  const filteredTrainings = useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'semana':
        cutoff = subDays(now, 7);
        break;
      case 'mes':
        cutoff = subMonths(now, 1);
        break;
      case 'mesociclo': {
        const meso = data.mesocycles.find(m => {
          const macro = data.macrocycles.find(mc => mc.id === m.macrocycleId && mc.teamId === activeTeamId);
          return macro && isAfter(now, parseISO(m.startDate));
        });
        cutoff = meso ? parseISO(meso.startDate) : subMonths(now, 2);
        break;
      }
      case 'macrociclo': {
        const macro = data.macrocycles.find(mc => mc.teamId === activeTeamId && isAfter(now, parseISO(mc.startDate)));
        cutoff = macro ? parseISO(macro.startDate) : subMonths(now, 6);
        break;
      }
      default:
        cutoff = subMonths(now, 1);
    }

    return teamTrainings.filter(t => isAfter(parseISO(t.date), cutoff));
  }, [teamTrainings, period, data.mesocycles, data.macrocycles, activeTeamId]);

  // Calculate skill stats
  const skillStats = () => {
    const stats: Record<string, { total: number; done: number }> = {};
    const allSkills = [...SKILLS.fundamento, ...SKILLS.ataque, ...SKILLS.defesa];
    allSkills.forEach(s => { stats[s] = { total: 0, done: 0 }; });

    teamTrainings.forEach(t => {
      t.modules
        .filter(m => m.type === 'tecnico' || m.type === 'fundamento')
        .forEach(m => {
          const desc = m.description.toLowerCase();
          allSkills.forEach(skill => {
            if (desc.includes(skill.toLowerCase())) {
              stats[skill].total++;
              if (m.status === 'concluido') stats[skill].done++;
            }
          });
        });
    });
    return stats;
  };

  // Calculate fundamentos map
  const fundamentosData = useMemo(() => {
    const counts: Record<string, number> = {};
    FUNDAMENTOS.forEach(f => { counts[f] = 0; });

    filteredTrainings.forEach(t => {
      t.modules
        .filter(m => m.type === 'tecnico' || m.type === 'fundamento')
        .forEach(m => {
          const desc = m.description.toLowerCase();
          FUNDAMENTOS.forEach(fund => {
            if (desc.includes(fund)) {
              counts[fund]++;
            }
          });
        });
    });

    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const sorted = FUNDAMENTOS
      .map(f => ({
        key: f,
        label: FUNDAMENTO_LABELS[f],
        count: counts[f],
        pct: total > 0 ? counts[f] / total : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...sorted.map(s => s.count), 1);
    const alerts = sorted.filter(s => total > 0 && s.pct < ALERT_THRESHOLD && s.pct > 0 || (total > 3 && s.count === 0));

    return { sorted, maxCount, total, alerts };
  }, [filteredTrainings]);

  const stats = skillStats();

  const statusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-status-done';
      case 'parcial': return 'bg-status-partial';
      case 'cancelado': return 'bg-status-cancelled';
      default: return 'bg-status-planned';
    }
  };

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm font-medium mb-4">Histórico</h2>

      <div className="flex gap-2 mb-6">
        {([
          { key: 'date' as HistoryView, label: 'Por Data' },
          { key: 'technical' as HistoryView, label: 'Técnico' },
          { key: 'fundamentos' as HistoryView, label: 'Fundamentos' },
        ]).map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${
              view === v.key ? 'border-primary text-primary neon-border' : 'border-border text-muted-foreground'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'date' ? (
        <div className="space-y-2">
          {teamTrainings.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/treino/${t.id}`)}
              className="w-full card-surface neon-border rounded-md p-3 flex items-center gap-3 text-left"
            >
              <div className={`w-2 h-2 rounded-full ${statusColor(t.status)}`} />
              <div className="flex-1">
                <p className="font-mono text-xs text-foreground">{t.name}</p>
                <p className="font-body text-[10px] text-muted-foreground">{format(new Date(t.date), 'dd/MM/yyyy')} · {t.modules.length} módulos</p>
              </div>
            </button>
          ))}
          {teamTrainings.length === 0 && (
            <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum treino realizado</p>
          )}
        </div>
      ) : view === 'technical' ? (
        <div className="space-y-6">
          {Object.entries(SKILLS).map(([category, skills]) => (
            <div key={category}>
              <h3 className="font-mono text-xs text-primary uppercase tracking-widest mb-3">
                {category === 'fundamento' ? 'Fundamento' : category === 'ataque' ? 'Ataque' : 'Defesa'}
              </h3>
              <div className="space-y-2">
                {skills.map(skill => {
                  const s = stats[skill];
                  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                  return (
                    <div key={skill} className="card-surface neon-border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-foreground">{skill}</span>
                        <span className="font-mono text-[10px] text-primary">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">{s.done}/{s.total} treinos</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mapa de Fundamentos Treinados */
        <div className="space-y-4">
          <h3 className="font-mono text-xs text-primary uppercase tracking-widest">Mapa de Fundamentos Treinados</h3>

          {/* Period filters */}
          <div className="flex gap-2">
            {([
              { key: 'semana' as PeriodFilter, label: 'Semana' },
              { key: 'mes' as PeriodFilter, label: 'Mês' },
              { key: 'mesociclo' as PeriodFilter, label: 'Mesociclo' },
              { key: 'macrociclo' as PeriodFilter, label: 'Macrociclo' },
            ]).map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`flex-1 font-mono text-[10px] py-1.5 rounded border transition-all ${
                  period === p.key
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Bar chart */}
          <div className="card-surface neon-border rounded-lg p-4 space-y-3">
            {fundamentosData.sorted.map(item => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-foreground">{item.label}</span>
                  <span className="font-mono text-[10px] text-primary">{item.count}x</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / fundamentosData.maxCount) * 100}%`,
                      boxShadow: '0 0 6px hsl(var(--primary) / 0.5)',
                    }}
                  />
                </div>
              </div>
            ))}
            {fundamentosData.total === 0 && (
              <p className="text-center text-muted-foreground font-mono text-xs py-4">Nenhum treino no período selecionado</p>
            )}
          </div>

          {/* Percentage distribution */}
          {fundamentosData.total > 0 && (
            <div className="card-surface neon-border rounded-lg p-4">
              <h4 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Distribuição Percentual</h4>
              <div className="grid grid-cols-2 gap-2">
                {fundamentosData.sorted.filter(s => s.count > 0).map(item => (
                  <div key={item.key} className="flex items-center justify-between px-2 py-1 rounded bg-muted/30">
                    <span className="font-mono text-[10px] text-foreground">{item.label}</span>
                    <span className="font-mono text-[10px] text-primary font-bold">{Math.round(item.pct * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {fundamentosData.alerts.length > 0 && fundamentosData.total > 0 && (
            <div className="space-y-2">
              {fundamentosData.alerts.map(alert => (
                <div key={alert.key} className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="font-mono text-[10px] text-yellow-200/80">
                    Treinamento de <span className="text-yellow-400 font-bold">{alert.label}</span> está{' '}
                    {alert.count === 0 ? 'ausente' : 'abaixo do ideal'} no período selecionado.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
