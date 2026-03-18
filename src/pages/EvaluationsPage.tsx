import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ArrowLeft, Dumbbell, Target, ChevronRight, Plus, Trash2, Edit2, Save, Users, BarChart2 } from 'lucide-react';
import {
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  PhysicalAttribute, TechnicalAttribute,
  MeasurementType, EvalRule, EvalTest,
  MEASUREMENT_TYPE_LABELS, convertToScore, POSITION_LABELS,
  getAthleteAttributeScore, getAthleteAttributeLastDate,
} from '@/lib/types';

type View = 'main' | 'physical' | 'technical' | 'attribute' | 'batch' | 'athleteRanking';

const EvaluationsPage = () => {
  const navigate = useNavigate();
  const { data, activeTeamId, addEvalTest, updateEvalTest, deleteEvalTest, addEvalResult } = useApp();

  const [view, setView] = useState<View>('main');
  const [selectedCategory, setSelectedCategory] = useState<'physical' | 'technical'>('physical');
  const [selectedAttr, setSelectedAttr] = useState<string>('');
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState<EvalTest | null>(null);
  const [showEvalForm, setShowEvalForm] = useState<string | null>(null);
  const [rankingSort, setRankingSort] = useState<'score' | 'date'>('score');

  const [batchTestId, setBatchTestId] = useState<string | null>(null);
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});

  const [testForm, setTestForm] = useState({
    name: '',
    measurementType: 'repeticao' as MeasurementType,
    maxValue: 100,
    rule: 'maior_melhor' as EvalRule,
  });

  const [evalForm, setEvalForm] = useState({ athleteId: '', rawValue: 0 });

  const teamAthletes = data.athletes.filter(a => a.teamId === activeTeamId).sort((a, b) => a.number - b.number);
  const testsForAttr = (data.evalTests || []).filter(t => t.attribute === selectedAttr && t.category === selectedCategory);

  const handleOpenCategory = (cat: 'physical' | 'technical') => {
    setSelectedCategory(cat);
    setView(cat);
  };

  const handleOpenAttr = (attr: string) => {
    setSelectedAttr(attr);
    setView('attribute');
  };

  const handleOpenRanking = (attr: string, cat: 'physical' | 'technical') => {
    setSelectedAttr(attr);
    setSelectedCategory(cat);
    setView('athleteRanking');
  };

  const handleBack = () => {
    if (view === 'batch') setView('attribute');
    else if (view === 'athleteRanking') setView(selectedCategory);
    else if (view === 'attribute') setView(selectedCategory);
    else if (view === 'physical' || view === 'technical') setView('main');
    else navigate(-1);
  };

  const resetTestForm = () => {
    setTestForm({ name: '', measurementType: 'repeticao', maxValue: 100, rule: 'maior_melhor' });
    setEditingTest(null);
    setShowTestForm(false);
  };

  const handleSaveTest = () => {
    if (!testForm.name.trim()) return;
    if (editingTest) {
      updateEvalTest({ ...editingTest, ...testForm });
    } else {
      addEvalTest({
        ...testForm,
        attribute: selectedAttr as PhysicalAttribute | TechnicalAttribute,
        category: selectedCategory,
      });
    }
    resetTestForm();
  };

  const handleSaveEval = () => {
    if (!evalForm.athleteId || !showEvalForm) return;
    const test = (data.evalTests || []).find(t => t.id === showEvalForm);
    if (!test) return;
    const score = convertToScore(evalForm.rawValue, test.maxValue, test.rule);
    addEvalResult({
      athleteId: evalForm.athleteId,
      testId: test.id,
      rawValue: evalForm.rawValue,
      convertedScore: score,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowEvalForm(null);
    setEvalForm({ athleteId: '', rawValue: 0 });
  };

  const handleOpenBatch = (testId: string) => {
    setBatchTestId(testId);
    const vals: Record<string, string> = {};
    teamAthletes.forEach(a => { vals[a.id] = ''; });
    setBatchValues(vals);
    setView('batch');
  };

  const handleSaveBatch = () => {
    if (!batchTestId) return;
    const test = (data.evalTests || []).find(t => t.id === batchTestId);
    if (!test) return;
    const date = new Date().toISOString().slice(0, 10);
    Object.entries(batchValues).forEach(([athleteId, val]) => {
      if (!val || val.trim() === '') return;
      const raw = parseFloat(val) || 0;
      const score = convertToScore(raw, test.maxValue, test.rule);
      addEvalResult({ athleteId, testId: test.id, rawValue: raw, convertedScore: score, date });
    });
    setView('attribute');
  };

  const formatRawValue = (val: number, type: MeasurementType): string => {
    if (type === 'tempo') {
      const mins = Math.floor(val / 60);
      const secs = Math.round(val % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (type === 'distancia') return `${val} cm`;
    return String(val);
  };

  const getLastEvalDate = (athleteId: string, testId: string): string | null => {
    const results = (data.evalResults || []).filter(r => r.athleteId === athleteId && r.testId === testId);
    if (results.length === 0) return null;
    return results.sort((a, b) => b.date.localeCompare(a.date))[0].date;
  };

  const attrs = selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTES : TECHNICAL_ATTRIBUTES;
  const attrLabels = selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTE_LABELS : TECHNICAL_ATTRIBUTE_LABELS;

  // Athlete ranking data for the current attribute
  const athleteRankingData = useMemo(() => {
    return teamAthletes.map(athlete => ({
      athlete,
      score: getAthleteAttributeScore(athlete.id, selectedAttr, data.evalTests || [], data.evalResults || []),
      lastDate: getAthleteAttributeLastDate(athlete.id, selectedAttr, data.evalTests || [], data.evalResults || []),
    })).filter(d => d.score > 0 || d.lastDate);
  }, [teamAthletes, selectedAttr, data.evalTests, data.evalResults]);

  const sortedRanking = useMemo(() => {
    return [...athleteRankingData].sort((a, b) => {
      if (rankingSort === 'score') return b.score - a.score;
      const da = a.lastDate || '';
      const db = b.lastDate || '';
      return db.localeCompare(da);
    });
  }, [athleteRankingData, rankingSort]);

  // ── Athlete Ranking View ──
  if (view === 'athleteRanking') {
    const attrLabel = (selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTE_LABELS : TECHNICAL_ATTRIBUTE_LABELS)[selectedAttr as any] || selectedAttr;
    return (
      <div className="px-4 py-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-lg font-bold neon-text">{attrLabel}</h2>
            <p className="font-mono text-[10px] text-muted-foreground">Avaliações dos atletas</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setRankingSort('score')}
              className={`font-mono text-[10px] px-2 py-1 rounded border transition-all ${rankingSort === 'score' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}
            >
              Nota
            </button>
            <button
              onClick={() => setRankingSort('date')}
              className={`font-mono text-[10px] px-2 py-1 rounded border transition-all ${rankingSort === 'date' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}
            >
              Recente
            </button>
          </div>
        </div>

        {sortedRanking.length === 0 ? (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhuma avaliação registrada para este atributo</p>
        ) : (
          <div className="space-y-2">
            {sortedRanking.map((item, idx) => (
              <div key={item.athlete.id} className="card-surface neon-border rounded-md p-3 flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-5">{idx + 1}</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-mono text-xs text-primary">
                  {item.athlete.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-foreground truncate">{item.athlete.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {POSITION_LABELS[item.athlete.position]}
                    {item.lastDate && ` · ${item.lastDate}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-primary">{item.score > 0 ? Math.round(item.score) : '—'}</span>
                  {item.score > 0 && (
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${item.score}%`, boxShadow: '0 0 4px hsl(var(--primary)/0.5)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Batch View ──
  if (view === 'batch' && batchTestId) {
    const test = (data.evalTests || []).find(t => t.id === batchTestId);
    if (!test) return null;
    return (
      <div className="px-4 py-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-2">{test.name}</h2>
        <p className="font-body text-[10px] text-muted-foreground mb-4">
          {MEASUREMENT_TYPE_LABELS[test.measurementType]} · Máx: {test.measurementType === 'tempo' ? formatRawValue(test.maxValue, 'tempo') : test.measurementType === 'distancia' ? `${test.maxValue} cm` : test.maxValue}
        </p>
        <div className="card-surface neon-border rounded-lg p-4 space-y-3">
          {teamAthletes.map(a => {
            const lastDate = getLastEvalDate(a.id, test.id);
            return (
              <div key={a.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">#{a.number}</span>
                    <span className="font-mono text-xs text-foreground truncate">{a.name}</span>
                  </div>
                  {lastDate && <p className="font-mono text-[8px] text-muted-foreground">Última: {lastDate}</p>}
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={batchValues[a.id] || ''}
                  onChange={e => setBatchValues({ ...batchValues, [a.id]: e.target.value })}
                  placeholder="0"
                  className="w-24 bg-background border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none text-center"
                />
              </div>
            );
          })}
        </div>
        <button onClick={handleSaveBatch} className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded mt-4 hover:neon-glow transition-all">
          Salvar Avaliações
        </button>
      </div>
    );
  }

  // ── Main View ──
  if (view === 'main') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-6">Avaliações</h2>
        <div className="space-y-3">
          <button onClick={() => handleOpenCategory('physical')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Avaliação Física</h3>
              <p className="font-body text-[10px] text-muted-foreground">Força, Explosão, Agilidade, Velocidade, Resistência, Reflexo</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <button onClick={() => handleOpenCategory('technical')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Avaliação Técnica</h3>
              <p className="font-body text-[10px] text-muted-foreground">Bloqueio, Saque, Ataque, Defesa, Recepção, Cobertura, Leitura, Levantamento</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  // ── Attribute List View ──
  if (view === 'physical' || view === 'technical') {
    return (
      <div className="px-4 py-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-6">
          {view === 'physical' ? 'Avaliação Física' : 'Avaliação Técnica'}
        </h2>
        <div className="space-y-2">
          {attrs.map(attr => {
            const tests = (data.evalTests || []).filter(t => t.attribute === attr && t.category === selectedCategory);
            const hasResults = teamAthletes.some(a =>
              getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || []) > 0
            );
            return (
              <div key={attr} className="card-surface neon-border rounded-md overflow-hidden">
                <div className="flex items-center">
                  <button onClick={() => handleOpenAttr(attr)} className="flex-1 p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div className="text-left">
                      <h3 className="font-mono text-sm text-foreground">{(attrLabels as any)[attr]}</h3>
                      <p className="font-body text-[10px] text-muted-foreground">{tests.length} teste(s)</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                  {hasResults && (
                    <button
                      onClick={() => handleOpenRanking(attr, selectedCategory)}
                      className="p-4 text-primary hover:neon-text transition-colors border-l border-border"
                      title="Ver avaliações dos atletas"
                    >
                      <BarChart2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Attribute Detail (tests) View ──
  return (
    <div className="px-4 py-6">
      <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
      </button>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-lg font-bold neon-text">
            {(selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTE_LABELS : TECHNICAL_ATTRIBUTE_LABELS)[selectedAttr as any]}
          </h2>
          <p className="font-mono text-[10px] text-muted-foreground">Média dos testes é calculada automaticamente</p>
        </div>
        <div className="flex gap-2">
          {athleteRankingData.length > 0 && (
            <button onClick={() => setView('athleteRanking')} className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all">
              <BarChart2 className="w-4 h-4" strokeWidth={1.5} /> Ver atletas
            </button>
          )}
          <button onClick={() => { resetTestForm(); setShowTestForm(true); }} className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all">
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Novo Teste
          </button>
        </div>
      </div>

      {/* Test form */}
      {showTestForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input value={testForm.name} onChange={e => setTestForm({ ...testForm, name: e.target.value })}
            placeholder="Nome do teste"
            className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Tipo de medição</label>
              <select value={testForm.measurementType}
                onChange={e => setTestForm({ ...testForm, measurementType: e.target.value as MeasurementType })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none">
                {(Object.entries(MEASUREMENT_TYPE_LABELS) as [MeasurementType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">
                Valor máximo {testForm.measurementType === 'distancia' ? '(cm)' : testForm.measurementType === 'tempo' ? '(seg)' : ''}
              </label>
              <input type="number" min={1} value={testForm.maxValue}
                onChange={e => setTestForm({ ...testForm, maxValue: parseFloat(e.target.value) || 1 })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Regra</label>
            <select value={testForm.rule} onChange={e => setTestForm({ ...testForm, rule: e.target.value as EvalRule })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="maior_melhor">Maior é melhor</option>
              <option value="menor_melhor">Menor é melhor</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveTest} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow transition-all">
              <Save className="w-3 h-3 inline mr-1" /> {editingTest ? 'Salvar' : 'Criar'}
            </button>
            <button onClick={resetTestForm} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Individual eval form */}
      {showEvalForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <h4 className="font-mono text-xs text-primary">Registrar Resultado</h4>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Atleta</label>
            <select value={evalForm.athleteId} onChange={e => setEvalForm({ ...evalForm, athleteId: e.target.value })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="">Selecionar atleta</option>
              {teamAthletes.map(a => <option key={a.id} value={a.id}>#{a.number} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Resultado</label>
            <input type="number" step="0.1" value={evalForm.rawValue}
              onChange={e => setEvalForm({ ...evalForm, rawValue: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEval} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow transition-all">Salvar Resultado</button>
            <button onClick={() => { setShowEvalForm(null); setEvalForm({ athleteId: '', rawValue: 0 }); }}
              className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tests list */}
      <div className="space-y-2">
        {testsForAttr.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum teste cadastrado</p>
        )}
        {testsForAttr.map(test => {
          const results = (data.evalResults || []).filter(r => r.testId === test.id);
          return (
            <div key={test.id} className="card-surface neon-border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-mono text-sm text-foreground">{test.name}</h4>
                  <p className="font-body text-[10px] text-muted-foreground">
                    {MEASUREMENT_TYPE_LABELS[test.measurementType]} · Máx: {test.measurementType === 'distancia' ? `${test.maxValue} cm` : test.measurementType === 'tempo' ? formatRawValue(test.maxValue, 'tempo') : test.maxValue} · {test.rule === 'maior_melhor' ? '↑ Maior melhor' : '↓ Menor melhor'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenBatch(test.id)} className="p-1.5 text-primary hover:neon-text" title="Avaliar todos">
                    <Users className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => { setShowEvalForm(test.id); setEvalForm({ athleteId: '', rawValue: 0 }); }}
                    className="p-1.5 text-primary hover:neon-text" title="Avaliar individual">
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => { setTestForm({ name: test.name, measurementType: test.measurementType, maxValue: test.maxValue, rule: test.rule }); setEditingTest(test); setShowTestForm(true); }}
                    className="p-1.5 text-muted-foreground hover:text-primary">
                    <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => deleteEvalTest(test.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {results.length > 0 && (
                <div className="mt-2 border-t border-border pt-2 space-y-1">
                  {results.slice(-5).reverse().map(r => {
                    const athlete = data.athletes.find(a => a.id === r.athleteId);
                    return (
                      <div key={r.id} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">{athlete?.name || '?'}</span>
                        <span className="text-foreground">
                          {r.rawValue} → <span className="text-primary">{r.convertedScore}</span>
                        </span>
                        <span className="text-muted-foreground">{r.date}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluationsPage;
