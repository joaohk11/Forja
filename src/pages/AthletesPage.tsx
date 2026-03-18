import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { Plus, User, Trash2, Edit2, Brain } from 'lucide-react';
import { Athlete, Position, POSITION_LABELS } from '@/lib/types';
import { generateId } from '@/lib/store';

const positions: Position[] = ['levantador', 'ponteiro', 'oposto', 'central', 'libero'];

const AthletesPage = () => {
  const navigate = useNavigate();
  const { data, activeTeamId, addAthlete, updateAthlete, deleteAthlete } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);

  const teamAthletes = data.athletes
    .filter(a => a.teamId === activeTeamId)
    .sort((a, b) => a.number - b.number);

  const [form, setForm] = useState({
    name: '', number: 1, position: 'ponteiro' as Position,
    height: '', age: 18, observation: '',
  });

  const resetForm = () => {
    setForm({ name: '', number: 1, position: 'ponteiro', height: '', age: 18, observation: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateAthlete({ ...editing, ...form });
    } else {
      addAthlete({ ...form, teamId: activeTeamId, id: generateId() } as any);
    }
    resetForm();
  };

  const startEdit = (a: Athlete) => {
    setForm({ name: a.name, number: a.number, position: a.position, height: a.height, age: a.age, observation: a.observation });
    setEditing(a);
    setShowForm(true);
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-sm font-medium">Atletas ({teamAthletes.length}/25)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/ia-treinador?tab=atleta')}
            className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text transition-all"
          >
            <Brain className="w-3.5 h-3.5" strokeWidth={1.5} /> Analisar com IA
          </button>
          {teamAthletes.length < 25 && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} /> Adicionar
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do atleta"
            className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Camisa</label>
              <input
                type="number" min={1} max={20} value={form.number}
                onChange={e => setForm({ ...form, number: parseInt(e.target.value) || 1 })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Idade</label>
              <input
                type="number" min={10} max={50} value={form.age}
                onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 18 })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Posição</label>
              <select
                value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value as Position })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {positions.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Altura (cm)</label>
              <input
                value={form.height}
                onChange={e => setForm({ ...form, height: e.target.value })}
                placeholder="185"
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <textarea
            value={form.observation}
            onChange={e => setForm({ ...form, observation: e.target.value })}
            placeholder="Observações"
            rows={2}
            className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow transition-all">
              {editing ? 'Salvar' : 'Adicionar'}
            </button>
            <button onClick={resetForm} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {teamAthletes.map(a => (
          <div key={a.id} className="card-surface neon-border rounded-md p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => navigate(`/atleta/${a.id}`)}>
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
              <p className="font-body text-[10px] text-muted-foreground">{POSITION_LABELS[a.position]} · {a.height}cm · {a.age} anos</p>
            </div>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); startEdit(a); }} className="p-1.5 text-muted-foreground hover:text-primary">
                <Edit2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteAthlete(a.id); }} className="p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
        {teamAthletes.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum atleta cadastrado</p>
        )}
      </div>
    </div>
  );
};

export default AthletesPage;
