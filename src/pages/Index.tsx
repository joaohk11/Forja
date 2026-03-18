import { useNavigate } from 'react-router-dom';
import { MacrocycleCard } from '@/components/MacrocycleCard';
import { HexGrid } from '@/components/HexGrid';
import { TeamRadars } from '@/components/TeamRadars';
import { useApp } from '@/lib/context';
import { Bell, Link2, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import { getAthleteAttributeScore, TECHNICAL_ATTRIBUTE_LABELS, TechnicalAttribute, TECHNICAL_ATTRIBUTES } from '@/lib/types';

const Dashboard = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const activeTeam = data.teams.find(t => t.id === activeTeamId);

  const pendingSuggestions = (data.trainingSuggestions || []).filter(
    s => s.status === 'pending' && s.teamId === activeTeamId
  );

  const auxiliaryLink = `${window.location.origin}/auxiliar/${activeTeamId}`;

  // Team analysis
  const teamAnalysis = useMemo(() => {
    const athletes = data.athletes.filter(a => a.teamId === activeTeamId);
    if (athletes.length === 0) return null;

    const attrs: TechnicalAttribute[] = TECHNICAL_ATTRIBUTES;
    const scores: { attr: TechnicalAttribute; label: string; avg: number }[] = [];

    for (const attr of attrs) {
      const sc = athletes.map(a =>
        getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || [])
      ).filter(s => s > 0);
      if (sc.length > 0) {
        scores.push({ attr, label: TECHNICAL_ATTRIBUTE_LABELS[attr], avg: sc.reduce((a, b) => a + b, 0) / sc.length });
      }
    }

    if (scores.length === 0) return null;
    scores.sort((a, b) => b.avg - a.avg);

    const top = scores.slice(0, 2);
    const bottom = scores.slice(-2).filter(s => s.avg < 60);

    // Training volume check
    const recentTrainings = data.trainings.filter(t => t.teamId === activeTeamId && t.status === 'concluido');
    const skillVolume: Record<string, number> = {};
    recentTrainings.forEach(t => {
      t.modules.forEach(m => {
        const desc = m.description?.toLowerCase() || '';
        attrs.forEach(attr => {
          const label = TECHNICAL_ATTRIBUTE_LABELS[attr].toLowerCase();
          if (desc.includes(label) || desc.includes(attr)) {
            skillVolume[attr] = (skillVolume[attr] || 0) + 1;
          }
        });
      });
    });

    return { top, bottom, total: athletes.length, scores };
  }, [data.athletes, data.evalTests, data.evalResults, data.trainings, activeTeamId]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] px-4 py-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          {activeTeam?.name || 'Time 1'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(auxiliaryLink).catch(() => {});
              window.open(auxiliaryLink, '_blank');
            }}
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            title="Acesso do Auxiliar"
          >
            <Link2 className="w-3 h-3" strokeWidth={1.5} />
            Auxiliar
          </button>
          {pendingSuggestions.length > 0 && (
            <button
              onClick={() => navigate('/sugestoes')}
              className="flex items-center gap-1 font-mono text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
              {pendingSuggestions.length} sugest{pendingSuggestions.length > 1 ? 'ões' : 'ão'}
            </button>
          )}
        </div>
      </div>

      {/* Pending suggestions banner */}
      {pendingSuggestions.length > 0 && (
        <button
          onClick={() => navigate('/sugestoes')}
          className="w-full mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-yellow-500/15 transition-colors text-left"
        >
          <Bell className="w-4 h-4 text-yellow-400 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-yellow-400 font-medium">
              {pendingSuggestions.length} sugest{pendingSuggestions.length > 1 ? 'ões' : 'ão'} do auxiliar técnico
            </p>
            <p className="font-body text-[10px] text-muted-foreground">Toque para revisar e aprovar</p>
          </div>
          <span className="font-mono text-[10px] text-yellow-400">Ver →</span>
        </button>
      )}

      <MacrocycleCard />
      <div className="flex-1 flex items-center justify-center">
        <HexGrid />
      </div>

      {/* Team Analysis */}
      {teamAnalysis && (teamAnalysis.top.length > 0 || teamAnalysis.bottom.length > 0) && (
        <div className="mt-4 space-y-2">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Análise do Time</h3>

          {teamAnalysis.top.length > 0 && (
            <div className="card-surface border border-green-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-green-400 uppercase tracking-widest">Fundamentos Fortes</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {teamAnalysis.top.map(item => (
                  <div key={item.attr} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{item.label}</span>
                    <span className="font-mono text-xs text-primary font-bold">{Math.round(item.avg)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamAnalysis.bottom.length > 0 && (
            <div className="card-surface border border-red-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-red-400 uppercase tracking-widest">Pontos de Atenção</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {teamAnalysis.bottom.map(item => (
                  <div key={item.attr} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{item.label}</span>
                    <span className="font-mono text-xs text-red-400 font-bold">{Math.round(item.avg)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Radars */}
      <div className="mt-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Radar do Time</h3>
        <TeamRadars teamId={activeTeamId} size={150} />
      </div>
    </div>
  );
};

export default Dashboard;
