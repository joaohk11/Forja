import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { TrainingSuggestion, Training, MODULE_TYPE_LABELS } from '@/lib/types';
import { generateId } from '@/lib/store';
import { ArrowLeft, CheckCircle2, XCircle, Edit2, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const SuggestionsPage = () => {
  const navigate = useNavigate();
  const { data, updateSuggestionStatus, deleteTrainingSuggestion } = useApp();

  const [editingSuggestion, setEditingSuggestion] = useState<TrainingSuggestion | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editTrainingName, setEditTrainingName] = useState('');

  const suggestions = (data.trainingSuggestions || []).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
  const pending = suggestions.filter(s => s.status === 'pending');
  const resolved = suggestions.filter(s => s.status !== 'pending');

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd/MM/yyyy HH:mm');
    } catch {
      return iso;
    }
  };

  const typeLabels: Record<string, string> = {
    module_status: 'Marcação de módulo',
    module_observation: 'Observação em módulo',
    module_add: 'Adicionar módulo',
    module_edit: 'Alterar módulo',
    full_training: 'Treino completo',
    general: 'Sugestão geral',
  };

  const handleApprove = (s: TrainingSuggestion) => {
    updateSuggestionStatus(s.id, 'approved');
  };

  const handleReject = (s: TrainingSuggestion) => {
    updateSuggestionStatus(s.id, 'rejected');
  };

  const handleEditBeforeApprove = (s: TrainingSuggestion) => {
    setEditingSuggestion(s);
    setEditDesc(s.description);
    setEditTrainingName(s.trainingName);
  };

  const handleApproveEdited = () => {
    if (!editingSuggestion) return;
    if (editingSuggestion.type === 'full_training' && editingSuggestion.proposedChange?.newTraining) {
      const newTraining: Training = {
        ...editingSuggestion.proposedChange.newTraining,
        id: generateId(),
        name: editTrainingName || editingSuggestion.trainingName,
      };
      updateSuggestionStatus(editingSuggestion.id, 'approved', newTraining);
    } else {
      updateSuggestionStatus(editingSuggestion.id, 'approved');
    }
    setEditingSuggestion(null);
  };

  const relatedTraining = (s: TrainingSuggestion) =>
    s.trainingId ? data.trainings.find(t => t.id === s.trainingId) : null;

  const SuggestionCard = ({ s }: { s: TrainingSuggestion }) => {
    const training = relatedTraining(s);
    const isPending = s.status === 'pending';
    return (
      <div className={`card-surface rounded-lg p-4 border ${
        isPending ? 'neon-border' : s.status === 'approved' ? 'border-green-500/30' : 'border-red-500/30'
      }`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                {typeLabels[s.type] || s.type}
              </span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                s.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {s.status === 'pending' ? 'Pendente' : s.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
              </span>
            </div>
            <p className="font-mono text-xs text-foreground mt-1.5 font-medium">{s.auxiliaryName}</p>
            <p className="font-body text-[10px] text-muted-foreground">{formatDate(s.createdAt)}</p>
          </div>
          <button
            onClick={() => deleteTrainingSuggestion(s.id)}
            className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Training info */}
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-mono text-[10px] text-muted-foreground">
            Treino: <span className="text-foreground">{s.trainingName}</span>
          </p>
          {training && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Data: <span className="text-foreground">
                {format(new Date(training.date + 'T12:00:00'), 'dd/MM/yyyy')}
              </span>
            </p>
          )}
        </div>

        {/* Proposed change */}
        <div className="border-t border-border pt-2 mt-2">
          <p className="font-mono text-[10px] text-muted-foreground mb-1">Alteração proposta:</p>
          <p className="font-body text-xs text-foreground">{s.description}</p>

          {s.type === 'full_training' && s.proposedChange?.newTraining && (
            <div className="mt-2 bg-muted/20 rounded p-2">
              <p className="font-mono text-[10px] text-primary">Treino: {s.proposedChange.newTraining.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{s.proposedChange.newTraining.duration}min</p>
              {s.proposedChange.newTraining.modules.map((m, i) => (
                <p key={i} className="font-mono text-[10px] text-muted-foreground">
                  · {MODULE_TYPE_LABELS[m.type]}: {m.description?.slice(0, 60)}...
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isPending && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleApprove(s)}
              className="flex-1 flex items-center justify-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 font-mono text-[10px] py-2 rounded hover:bg-green-500/30 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
            </button>
            <button
              onClick={() => handleEditBeforeApprove(s)}
              className="flex-1 flex items-center justify-center gap-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] py-2 rounded hover:bg-primary/20 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
            <button
              onClick={() => handleReject(s)}
              className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] py-2 rounded hover:bg-red-500/20 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Rejeitar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Edit modal
  if (editingSuggestion) {
    return (
      <div className="px-4 py-6">
        <button onClick={() => setEditingSuggestion(null)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-2">Editar antes de Aprovar</h2>
        <p className="font-body text-xs text-muted-foreground mb-6">
          Sugestão de: <span className="text-foreground">{editingSuggestion.auxiliaryName}</span>
        </p>

        <div className="space-y-4">
          {editingSuggestion.type === 'full_training' && (
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Nome do Treino</label>
              <input
                value={editTrainingName}
                onChange={e => setEditTrainingName(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Descrição da alteração</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApproveEdited}
              className="flex-1 flex items-center justify-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 font-mono text-sm py-3 rounded hover:bg-green-500/30"
            >
              <CheckCircle2 className="w-4 h-4" /> Aprovar Alteração
            </button>
            <button
              onClick={() => setEditingSuggestion(null)}
              className="px-4 border border-border text-muted-foreground font-mono text-sm py-3 rounded hover:border-primary/50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-lg font-bold neon-text">Sugestões do Auxiliar</h2>
        {pending.length > 0 && (
          <span className="font-mono text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full">
            {pending.length} pendente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-primary/30 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">Nenhuma sugestão recebida</p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            As sugestões do auxiliar técnico aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <h3 className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-3">Pendentes</h3>
              <div className="space-y-3">
                {pending.map(s => <SuggestionCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3 mt-4">Resolvidas</h3>
              <div className="space-y-3">
                {resolved.map(s => <SuggestionCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionsPage;
