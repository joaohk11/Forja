import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { format, differenceInWeeks, parseISO, isWithinInterval } from 'date-fns';

type ConfirmTarget = { type: 'macro' | 'meso' | 'micro'; id: string; name: string } | null;

const PeriodizationPage = () => {
  const {
    data, activeTeamId,
    addMacrocycle, addMesocycle, addMicrocycle,
    deleteMacrocycle, deleteMesocycle, deleteMicrocycle,
  } = useApp();

  const [showMacroForm, setShowMacroForm] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [expandedMeso, setExpandedMeso] = useState<string | null>(null);
  const [showMesoForm, setShowMesoForm] = useState<string | null>(null);
  const [showMicroForm, setShowMicroForm] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const macros = data.macrocycles.filter(m => m.teamId === activeTeamId);

  const [macroForm, setMacroForm] = useState({ name: '', startDate: '', type: '6months' as '6months' | '1year' });
  const [mesoForm, setMesoForm] = useState({ name: '', startDate: '', endDate: '' });
  const [microForm, setMicroForm] = useState({ name: '', startDate: '', endDate: '' });

  const handleAddMacro = () => {
    if (!macroForm.name || !macroForm.startDate) return;
    const startDate = new Date(macroForm.startDate);
    const months = macroForm.type === '6months' ? 6 : 12;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    addMacrocycle({
      teamId: activeTeamId,
      name: macroForm.name,
      startDate: macroForm.startDate,
      endDate: format(endDate, 'yyyy-MM-dd'),
      type: macroForm.type,
    });
    setMacroForm({ name: '', startDate: '', type: '6months' });
    setShowMacroForm(false);
  };

  const handleAddMeso = (macroId: string) => {
    if (!mesoForm.name || !mesoForm.startDate || !mesoForm.endDate) return;
    const start = parseISO(mesoForm.startDate);
    const end = parseISO(mesoForm.endDate);
    const weeks = Math.max(1, differenceInWeeks(end, start));
    addMesocycle({ macrocycleId: macroId, name: mesoForm.name, startDate: mesoForm.startDate, endDate: mesoForm.endDate, weeks });
    setMesoForm({ name: '', startDate: '', endDate: '' });
    setShowMesoForm(null);
  };

  const handleAddMicro = (mesoId: string) => {
    if (!microForm.name || !microForm.startDate || !microForm.endDate) return;
    const start = parseISO(microForm.startDate);
    const end = parseISO(microForm.endDate);
    const weeks = Math.max(1, differenceInWeeks(end, start));
    addMicrocycle({ mesocycleId: mesoId, name: microForm.name, startDate: microForm.startDate, endDate: microForm.endDate, weeks });
    setMicroForm({ name: '', startDate: '', endDate: '' });
    setShowMicroForm(null);
  };

  const handleConfirmDelete = () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === 'macro') deleteMacrocycle(confirmTarget.id);
    if (confirmTarget.type === 'meso') deleteMesocycle(confirmTarget.id);
    if (confirmTarget.type === 'micro') deleteMicrocycle(confirmTarget.id);
    setConfirmTarget(null);
  };

  const getTrainingsInRange = (start: string, end: string) => {
    return data.trainings.filter(t => {
      if (t.teamId !== activeTeamId) return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: parseISO(start), end: parseISO(end) });
      } catch { return false; }
    });
  };

  const inputCls = 'w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none';
  const inputSmCls = 'w-full bg-muted border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none';

  return (
    <div className="px-4 py-6 pb-20">
      {/* Confirm delete dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="card-surface neon-border rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-mono text-sm font-bold text-foreground">Confirmar Exclusão</h3>
            <p className="font-body text-xs text-muted-foreground">
              Deseja excluir <span className="text-foreground font-medium">"{confirmTarget.name}"</span>?
              {confirmTarget.type === 'macro' && ' Isso removerá todos os mesociclos e microciclos internos.'}
              {confirmTarget.type === 'meso' && ' Isso removerá todos os microciclos internos.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-destructive text-destructive-foreground font-mono text-xs py-2 rounded"
              >
                Excluir
              </button>
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 border border-border text-muted-foreground font-mono text-xs py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-sm font-medium">Periodização</h2>
        <button onClick={() => setShowMacroForm(true)} className="flex items-center gap-1 text-primary font-mono text-xs">
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Macrociclo
        </button>
      </div>

      {showMacroForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input value={macroForm.name} onChange={e => setMacroForm({ ...macroForm, name: e.target.value })}
            placeholder="Nome do macrociclo" className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Início</label>
              <input type="date" value={macroForm.startDate} onChange={e => setMacroForm({ ...macroForm, startDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Duração</label>
              <select value={macroForm.type} onChange={e => setMacroForm({ ...macroForm, type: e.target.value as any })} className={inputCls}>
                <option value="6months">6 meses</option>
                <option value="1year">1 ano</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddMacro} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded">Criar</button>
            <button onClick={() => setShowMacroForm(false)} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {macros.map(macro => {
          const expanded = expandedMacro === macro.id;
          const mesos = data.mesocycles.filter(m => m.macrocycleId === macro.id);
          const totalWeeks = differenceInWeeks(parseISO(macro.endDate), parseISO(macro.startDate));

          return (
            <div key={macro.id} className="card-surface neon-border rounded-lg overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedMacro(expanded ? null : macro.id)}
                  className="flex-1 p-4 flex items-center gap-3 text-left"
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-primary" strokeWidth={1.5} /> : <ChevronRight className="w-4 h-4 text-primary" strokeWidth={1.5} />}
                  <div className="flex-1">
                    <p className="font-mono text-sm text-foreground">{macro.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {format(new Date(macro.startDate), 'dd/MM/yyyy')} — {format(new Date(macro.endDate), 'dd/MM/yyyy')} · {totalWeeks} semanas
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setConfirmTarget({ type: 'macro', id: macro.id, name: macro.name })}
                  className="p-4 text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir macrociclo"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {expanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Mesociclos</span>
                    <button onClick={() => { setShowMesoForm(macro.id); setMesoForm({ name: '', startDate: '', endDate: '' }); }}
                      className="text-primary font-mono text-[10px] flex items-center gap-1">
                      <Plus className="w-3 h-3" strokeWidth={1.5} /> Adicionar
                    </button>
                  </div>

                  {showMesoForm === macro.id && (
                    <div className="bg-background border border-border rounded p-3 space-y-2">
                      <input value={mesoForm.name} onChange={e => setMesoForm({ ...mesoForm, name: e.target.value })}
                        placeholder="Nome do mesociclo" className={inputSmCls} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[9px] text-muted-foreground">Início</label>
                          <input type="date" value={mesoForm.startDate} onChange={e => setMesoForm({ ...mesoForm, startDate: e.target.value })} className={inputSmCls} />
                        </div>
                        <div>
                          <label className="font-mono text-[9px] text-muted-foreground">Fim</label>
                          <input type="date" value={mesoForm.endDate} onChange={e => setMesoForm({ ...mesoForm, endDate: e.target.value })} className={inputSmCls} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddMeso(macro.id)} className="flex-1 bg-primary text-primary-foreground font-mono text-[10px] py-1.5 rounded">Criar</button>
                        <button onClick={() => setShowMesoForm(null)} className="px-3 border border-border text-muted-foreground font-mono text-[10px] py-1.5 rounded">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {mesos.map(meso => {
                    const mesoExpanded = expandedMeso === meso.id;
                    const micros = data.microcycles.filter(m => m.mesocycleId === meso.id);
                    const mesoWeeks = differenceInWeeks(parseISO(meso.endDate), parseISO(meso.startDate));
                    const mesoTrainings = getTrainingsInRange(meso.startDate, meso.endDate);

                    return (
                      <div key={meso.id} className="bg-background border border-border rounded">
                        <div className="flex items-center">
                          <button onClick={() => setExpandedMeso(mesoExpanded ? null : meso.id)}
                            className="flex-1 p-3 flex items-center gap-2 text-left">
                            {mesoExpanded ? <ChevronDown className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.5} /> : <ChevronRight className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.5} />}
                            <div className="flex-1">
                              <p className="font-mono text-xs text-foreground">{meso.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {format(parseISO(meso.startDate), 'dd/MM')} — {format(parseISO(meso.endDate), 'dd/MM')} · {mesoWeeks}sem · {mesoTrainings.length} treino(s)
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => setConfirmTarget({ type: 'meso', id: meso.id, name: meso.name })}
                            className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir mesociclo"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>

                        {mesoExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Microciclos</span>
                              <button
                                onClick={() => { setShowMicroForm(meso.id); setMicroForm({ name: '', startDate: '', endDate: '' }); }}
                                className="text-primary font-mono text-[9px] flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" strokeWidth={1.5} /> Adicionar microciclo
                              </button>
                            </div>

                            {showMicroForm === meso.id && (
                              <div className="bg-muted/30 border border-border/50 rounded p-2 space-y-2">
                                <input value={microForm.name} onChange={e => setMicroForm({ ...microForm, name: e.target.value })}
                                  placeholder="Nome do microciclo" className={inputSmCls} />
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="font-mono text-[9px] text-muted-foreground">Início</label>
                                    <input type="date" value={microForm.startDate} onChange={e => setMicroForm({ ...microForm, startDate: e.target.value })} className={inputSmCls} />
                                  </div>
                                  <div>
                                    <label className="font-mono text-[9px] text-muted-foreground">Fim</label>
                                    <input type="date" value={microForm.endDate} onChange={e => setMicroForm({ ...microForm, endDate: e.target.value })} className={inputSmCls} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleAddMicro(meso.id)} className="flex-1 bg-primary text-primary-foreground font-mono text-[10px] py-1.5 rounded">Criar</button>
                                  <button onClick={() => setShowMicroForm(null)} className="px-3 border border-border text-muted-foreground font-mono text-[10px] py-1.5 rounded">Cancelar</button>
                                </div>
                              </div>
                            )}

                            {micros.length > 0 && (
                              <div className="space-y-1">
                                {micros.map(micro => {
                                  const microTrainings = getTrainingsInRange(micro.startDate, micro.endDate);
                                  return (
                                    <div key={micro.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20 border border-border/30">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-mono text-[10px] text-primary">{micro.name}</p>
                                        <p className="font-mono text-[9px] text-muted-foreground">
                                          {format(parseISO(micro.startDate), 'dd/MM')} — {format(parseISO(micro.endDate), 'dd/MM')} · {microTrainings.length} treino(s)
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setConfirmTarget({ type: 'micro', id: micro.id, name: micro.name })}
                                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                        title="Excluir microciclo"
                                      >
                                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {micros.length === 0 && !showMicroForm && (
                              <p className="text-muted-foreground font-mono text-[9px] text-center py-1">Nenhum microciclo</p>
                            )}

                            {/* Trainings in this mesocycle (not in microcycles) */}
                            {mesoTrainings.length > 0 && (
                              <div className="mt-1 space-y-1">
                                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Treinos vinculados</p>
                                {mesoTrainings.map(t => (
                                  <div key={t.id} className="flex items-center gap-2 px-2 py-1 rounded bg-primary/5">
                                    <span className="font-mono text-[9px] text-primary">●</span>
                                    <span className="font-mono text-[9px] text-foreground flex-1 truncate">{t.name}</span>
                                    <span className="font-mono text-[9px] text-muted-foreground">{format(parseISO(t.date), 'dd/MM')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {mesos.length === 0 && !showMesoForm && (
                    <p className="text-muted-foreground font-mono text-[10px] text-center py-2">Nenhum mesociclo</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {macros.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum macrociclo criado</p>
        )}
      </div>
    </div>
  );
};

export default PeriodizationPage;
