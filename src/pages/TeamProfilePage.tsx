import { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { POSITION_LABELS } from '@/lib/types';
import { TeamRadars } from '@/components/TeamRadars';
import { Camera, Trash2, Users, Ruler, Clock, User, Plus, Edit2, ArrowLeft, X, ImagePlus } from 'lucide-react';

const TeamProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, updateTeamName, updateTeamPhoto, deleteAthlete } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const team = data.teams.find(t => t.id === id);
  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === id).sort((a, b) => a.number - b.number),
    [data.athletes, id]
  );

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(team?.name ?? '');

  if (!team) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground font-body">Time não encontrado</p>
      </div>
    );
  }

  const avgHeight = teamAthletes.length
    ? (teamAthletes.reduce((s, a) => s + (parseFloat(a.height) || 0), 0) / teamAthletes.length).toFixed(1)
    : null;

  const avgAge = teamAthletes.length
    ? (teamAthletes.reduce((s, a) => s + a.age, 0) / teamAthletes.length).toFixed(1)
    : null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateTeamPhoto(team.id, ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNameSave = () => {
    if (nameValue.trim()) {
      updateTeamName(team.id, nameValue.trim());
    } else {
      setNameValue(team.name);
    }
    setEditingName(false);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
      </div>

      {/* Cover / Team Photo Area */}
      <div className="relative mx-4 rounded-xl overflow-hidden neon-border card-surface">
        <div className="h-44 flex items-center justify-center bg-muted/30 relative group">
          {team.photo ? (
            <img src={team.photo} alt={team.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus className="w-10 h-10" strokeWidth={1} />
              <span className="font-mono text-[10px] uppercase tracking-widest">Foto do Time</span>
            </div>
          )}
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
            >
              <Camera className="w-5 h-5" strokeWidth={1.5} />
            </button>
            {team.photo && (
              <button
                onClick={() => updateTeamPhoto(team.id, undefined)}
                className="p-2.5 rounded-full bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 transition-colors"
              >
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Team name */}
        <div className="p-4 flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                className="flex-1 bg-background border border-primary/50 rounded px-3 py-1.5 font-mono text-lg text-foreground focus:outline-none focus:border-primary"
              />
              <button onClick={handleNameSave} className="text-primary font-mono text-xs px-2 py-1 border border-primary/40 rounded hover:bg-primary/10">OK</button>
              <button onClick={() => { setNameValue(team.name); setEditingName(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameValue(team.name); setEditingName(true); }}
              className="flex items-center gap-2 group/name"
            >
              <h2 className="font-mono text-xl font-bold neon-text">{team.name}</h2>
              <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {teamAthletes.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
          <StatCard icon={Users} label="Atletas" value={String(teamAthletes.length)} />
          <StatCard icon={Ruler} label="Alt. Média" value={avgHeight ? `${avgHeight} cm` : '—'} />
          <StatCard icon={Clock} label="Idade Média" value={avgAge ? `${avgAge} anos` : '—'} />
        </div>
      ) : (
        <div className="mx-4 mt-4 card-surface neon-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground font-body text-sm">Nenhum atleta cadastrado neste time</p>
        </div>
      )}

      {/* Athletes List */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-sm font-medium text-foreground">Atletas ({teamAthletes.length}/25)</h3>
          {teamAthletes.length < 25 && (
            <button
              onClick={() => navigate('/atletas')}
              className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} /> Adicionar Atleta
            </button>
          )}
        </div>
        <div className="space-y-2">
          {teamAthletes.map(a => (
            <div
              key={a.id}
              className="card-surface neon-border rounded-md p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => navigate(`/atleta/${a.id}`)}
            >
              <div className="w-10 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                {a.photo ? (
                  <img src={a.photo} alt={a.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary text-xs">#{a.number}</span>
                  <span className="font-mono text-sm text-foreground truncate">{a.name}</span>
                </div>
                <p className="font-body text-[10px] text-muted-foreground">
                  {POSITION_LABELS[a.position]} · {a.height}cm · {a.age} anos
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteAthlete(a.id); }}
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Team Radars */}
      <div className="mx-4 mt-6">
        <h3 className="font-mono text-sm font-medium text-foreground mb-3">Radar do Time</h3>
        <TeamRadars teamId={team.id} size={160} />
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card-surface neon-border rounded-lg p-3 text-center">
      <Icon className="w-5 h-5 text-primary mx-auto mb-1" strokeWidth={1.5} />
      <p className="font-mono text-lg font-bold neon-text">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default TeamProfilePage;
