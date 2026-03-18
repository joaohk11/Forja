import { useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { RadarChart } from '@/components/RadarChart';
import {
  POSITION_LABELS,
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  calculateAthleteLevel, getAthleteAttributeScore, getAthleteAttributeLastDate,
} from '@/lib/types';
import { ArrowLeft, User, Camera, Trash2, Star, Brain, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const formatAttrDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

const AthleteProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, updateAthlete } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const athlete = data.athletes.find(a => a.id === id);
  const team = athlete ? data.teams.find(t => t.id === athlete.teamId) : null;

  const physicalScores = useMemo(() => {
    if (!athlete) return PHYSICAL_ATTRIBUTES.map(() => 0);
    return PHYSICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeScore(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const physicalDates = useMemo(() => {
    if (!athlete) return PHYSICAL_ATTRIBUTES.map(() => null as string | null);
    return PHYSICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeLastDate(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const technicalScores = useMemo(() => {
    if (!athlete) return TECHNICAL_ATTRIBUTES.map(() => 0);
    return TECHNICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeScore(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const technicalDates = useMemo(() => {
    if (!athlete) return TECHNICAL_ATTRIBUTES.map(() => null as string | null);
    return TECHNICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeLastDate(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const level = useMemo(() => {
    if (!athlete) return 0;
    return calculateAthleteLevel(athlete.id, data.evalTests || [], data.evalResults || []);
  }, [athlete, data.evalTests, data.evalResults]);

  if (!athlete) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground font-body">Atleta não encontrado</p>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateAthlete({ ...athlete, photo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const physicalLabels = PHYSICAL_ATTRIBUTES.map(a => PHYSICAL_ATTRIBUTE_LABELS[a]);
  const technicalLabels = TECHNICAL_ATTRIBUTES.map(a => TECHNICAL_ATTRIBUTE_LABELS[a]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/ia-treinador?tab=atleta&athleteId=${athlete.id}`)}
            className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
          >
            <Brain className="w-3.5 h-3.5" /> Analisar
          </button>
          <button
            onClick={() => navigate(`/ia-treinador?tab=treino`)}
            className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
          >
            <Sparkles className="w-3.5 h-3.5" /> Treino IA
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="mx-4 card-surface neon-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          {/* Photo */}
          <div className="relative group">
            <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {athlete.photo ? (
                <img src={athlete.photo} alt={athlete.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-lg">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary">
                <Camera className="w-4 h-4" strokeWidth={1.5} />
              </button>
              {athlete.photo && (
                <button onClick={() => updateAthlete({ ...athlete, photo: undefined })} className="p-1.5 rounded-full bg-destructive/20 border border-destructive/40 text-destructive">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-primary text-xs">#{athlete.number}</span>
              <h2 className="font-mono text-lg font-bold neon-text truncate">{athlete.name}</h2>
            </div>
            <p className="font-body text-xs text-muted-foreground">
              {POSITION_LABELS[athlete.position]} · {athlete.height}cm · {athlete.age} anos
            </p>
            {team && <p className="font-mono text-[10px] text-primary/70 mt-1">{team.name}</p>}
          </div>
        </div>

        {/* Level badge */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <span className="font-mono text-sm text-foreground">Nível do Atleta</span>
          </div>
          <span className="font-mono text-2xl font-bold neon-text">{level || '—'}</span>
        </div>
      </div>

      {/* Physical attributes */}
      <div className="mx-4 mt-6">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Atributos Físicos</h3>
        <div className="card-surface neon-border rounded-lg p-4">
          <div className="space-y-2.5 mb-4">
            {PHYSICAL_ATTRIBUTES.map((attr, i) => (
              <div key={attr}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-20 text-right">{PHYSICAL_ATTRIBUTE_LABELS[attr]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${physicalScores[i]}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}
                    />
                  </div>
                  <span className="font-mono text-xs text-primary w-8 text-right">{Math.round(physicalScores[i])}</span>
                </div>
                {physicalDates[i] && (
                  <p className="font-mono text-[8px] text-muted-foreground text-right mt-0.5 pr-0 pl-24">
                    Última atualização: {formatAttrDate(physicalDates[i])}
                  </p>
                )}
              </div>
            ))}
          </div>
          <RadarChart labels={physicalLabels} values={physicalScores} title="Radar Físico" size={240} />
        </div>
      </div>

      {/* Technical attributes */}
      <div className="mx-4 mt-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Atributos Técnicos</h3>
        <div className="card-surface neon-border rounded-lg p-4">
          <div className="space-y-2.5 mb-4">
            {TECHNICAL_ATTRIBUTES.map((attr, i) => (
              <div key={attr}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-24 text-right">{TECHNICAL_ATTRIBUTE_LABELS[attr]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${technicalScores[i]}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}
                    />
                  </div>
                  <span className="font-mono text-xs text-primary w-8 text-right">{Math.round(technicalScores[i])}</span>
                </div>
                {technicalDates[i] && (
                  <p className="font-mono text-[8px] text-muted-foreground text-right mt-0.5 pr-0 pl-28">
                    Última atualização: {formatAttrDate(technicalDates[i])}
                  </p>
                )}
              </div>
            ))}
          </div>
          <RadarChart labels={technicalLabels} values={technicalScores} title="Radar Técnico" size={240} />
        </div>
      </div>

      {/* Observation */}
      {athlete.observation && (
        <div className="mx-4 mt-4 card-surface neon-border rounded-lg p-4">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Observação</h3>
          <p className="font-body text-sm text-foreground">{athlete.observation}</p>
        </div>
      )}
    </div>
  );
};

export default AthleteProfilePage;
