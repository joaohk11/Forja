export type Position = 'levantador' | 'ponteiro' | 'oposto' | 'central' | 'libero';

export type ModuleType = 'aquecimento' | 'fundamento' | 'tecnico' | 'tatico' | 'jogo' | 'fisico';

export type ModuleStatus = 'concluido' | 'parcial' | 'nao_fez';

export type TrainingStatus = 'planejado' | 'concluido' | 'parcial' | 'cancelado';

export type TrainingRating = 'ruim' | 'ok' | 'bom' | 'excelente';

export type MeasurementType = 'repeticao' | 'tempo' | 'distancia' | 'pontuacao';

export type EvalRule = 'maior_melhor' | 'menor_melhor';

export type PhysicalAttribute = 'forca' | 'explosao' | 'agilidade' | 'velocidade' | 'resistencia' | 'reflexo';

export type TechnicalAttribute = 'bloqueio' | 'saque' | 'ataque' | 'defesa' | 'recepcao' | 'cobertura' | 'leitura_de_jogo' | 'levantamento';

export const PHYSICAL_ATTRIBUTES: PhysicalAttribute[] = ['forca', 'explosao', 'agilidade', 'velocidade', 'resistencia', 'reflexo'];

export const TECHNICAL_ATTRIBUTES: TechnicalAttribute[] = ['bloqueio', 'saque', 'ataque', 'defesa', 'recepcao', 'cobertura', 'leitura_de_jogo', 'levantamento'];

export const PHYSICAL_ATTRIBUTE_LABELS: Record<PhysicalAttribute, string> = {
  forca: 'Força',
  explosao: 'Explosão',
  agilidade: 'Agilidade',
  velocidade: 'Velocidade',
  resistencia: 'Resistência',
  reflexo: 'Reflexo',
};

export const TECHNICAL_ATTRIBUTE_LABELS: Record<TechnicalAttribute, string> = {
  bloqueio: 'Bloqueio',
  saque: 'Saque',
  ataque: 'Ataque',
  defesa: 'Defesa',
  recepcao: 'Recepção',
  cobertura: 'Cobertura',
  leitura_de_jogo: 'Leitura de Jogo',
  levantamento: 'Levantamento',
};

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  repeticao: 'Repetição',
  tempo: 'Tempo',
  distancia: 'Distância',
  pontuacao: 'Pontuação',
};

export interface EvalTest {
  id: string;
  attribute: PhysicalAttribute | TechnicalAttribute;
  category: 'physical' | 'technical';
  name: string;
  measurementType: MeasurementType;
  maxValue: number;
  rule: EvalRule;
}

export interface EvalResult {
  id: string;
  athleteId: string;
  testId: string;
  rawValue: number;
  convertedScore: number;
  date: string;
}

export interface Athlete {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  height: string;
  age: number;
  photo?: string;
  observation: string;
}

export type BlockType = 'geral' | 'posicao';

export interface TrainingModule {
  id: string;
  type: ModuleType;
  blockType: BlockType;
  description: string;
  duration: number;
  status: ModuleStatus;
  observation: string;
  skillObservation?: string;
  skills?: string[];
  positions?: Position[];
}

export interface Training {
  id: string;
  teamId: string;
  name: string;
  date: string;
  duration: number;
  modules: TrainingModule[];
  status: TrainingStatus;
  isFavorite?: boolean;
  attendance?: Record<string, 'presente' | 'ausente'>;
  rating?: TrainingRating;
  ratingNote?: string;
  ratingBy?: string;
}

export interface Microcycle {
  id: string;
  mesocycleId: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
}

export interface Mesocycle {
  id: string;
  macrocycleId: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
}

export interface Macrocycle {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  type: '6months' | '1year';
}

export interface Team {
  id: string;
  name: string;
  photo?: string;
}

export type SuggestionType = 'module_status' | 'module_observation' | 'module_add' | 'module_edit' | 'full_training' | 'general';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface TrainingSuggestion {
  id: string;
  teamId: string;
  trainingId: string;
  trainingName: string;
  auxiliaryName: string;
  type: SuggestionType;
  description: string;
  proposedChange?: {
    moduleId?: string;
    editedModule?: Partial<TrainingModule>;
    newModule?: TrainingModule;
    newTraining?: Omit<Training, 'id'>;
  };
  status: SuggestionStatus;
  createdAt: string;
}

export interface AppData {
  teams: Team[];
  athletes: Athlete[];
  trainings: Training[];
  macrocycles: Macrocycle[];
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
  evalTests: EvalTest[];
  evalResults: EvalResult[];
  activeTeamId: string;
  trainingSuggestions: TrainingSuggestion[];
}

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  aquecimento: 'Aquecimento',
  fundamento: 'Fundamento',
  tecnico: 'Técnico',
  tatico: 'Tático',
  jogo: 'Jogo',
  fisico: 'Físico',
};

export const POSITION_LABELS: Record<Position, string> = {
  levantador: 'Levantador',
  ponteiro: 'Ponteiro',
  oposto: 'Oposto',
  central: 'Central',
  libero: 'Líbero',
};

export const STATUS_LABELS: Record<TrainingStatus, string> = {
  planejado: 'Planejado',
  concluido: 'Concluído',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
};

export const SKILLS = {
  fundamento: ['Manchete', 'Toque', 'Movimento de Ataque', 'Movimento de Bloqueio'],
  ataque: ['Ataque', 'Cobertura', 'Recepção'],
  defesa: ['Bloqueio', 'Defesa'],
} as const;

export function convertToScore(rawValue: number, maxValue: number, rule: EvalRule): number {
  if (maxValue <= 0 || rawValue <= 0) return 0;
  let score: number;
  if (rule === 'maior_melhor') {
    score = (rawValue / maxValue) * 100;
  } else {
    score = (maxValue / rawValue) * 100;
  }
  return Math.min(Math.round(score * 10) / 10, 100);
}

export function calculateAthleteLevel(
  athleteId: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): number {
  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  if (athleteResults.length === 0) return 0;
  const allAttrs = [...PHYSICAL_ATTRIBUTES, ...TECHNICAL_ATTRIBUTES] as string[];
  const attrScores: number[] = [];
  for (const attr of allAttrs) {
    const testsForAttr = evalTests.filter(t => t.attribute === attr);
    if (testsForAttr.length === 0) continue;
    const testScores: number[] = [];
    for (const test of testsForAttr) {
      const results = athleteResults.filter(r => r.testId === test.id);
      if (results.length > 0) {
        const latest = results.sort((a, b) => b.date.localeCompare(a.date))[0];
        testScores.push(latest.convertedScore);
      }
    }
    if (testScores.length > 0) {
      attrScores.push(testScores.reduce((s, v) => s + v, 0) / testScores.length);
    }
  }
  if (attrScores.length === 0) return 0;
  const avg = attrScores.reduce((s, v) => s + v, 0) / attrScores.length;
  return Math.round((avg / 5) * 10) / 10;
}

export function getAthleteAttributeScore(
  athleteId: string,
  attribute: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): number {
  const testsForAttr = evalTests.filter(t => t.attribute === attribute);
  if (testsForAttr.length === 0) return 0;
  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  const testScores: number[] = [];
  for (const test of testsForAttr) {
    const results = athleteResults.filter(r => r.testId === test.id);
    if (results.length > 0) {
      const latest = results.sort((a, b) => b.date.localeCompare(a.date))[0];
      testScores.push(latest.convertedScore);
    }
  }
  if (testScores.length === 0) return 0;
  return Math.round((testScores.reduce((s, v) => s + v, 0) / testScores.length) * 10) / 10;
}

export function getAthleteFisicoScore(
  athleteId: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): number {
  const scores = PHYSICAL_ATTRIBUTES
    .map(attr => getAthleteAttributeScore(athleteId, attr, evalTests, evalResults))
    .filter(s => s > 0);
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function getAthleteAttributeLastDate(
  athleteId: string,
  attribute: string,
  evalTests: EvalTest[],
  evalResults: EvalResult[]
): string | null {
  const testsForAttr = evalTests.filter(t => t.attribute === attribute);
  if (testsForAttr.length === 0) return null;
  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);
  let latestDate: string | null = null;
  for (const test of testsForAttr) {
    const results = athleteResults.filter(r => r.testId === test.id);
    if (results.length > 0) {
      const sorted = results.sort((a, b) => b.date.localeCompare(a.date));
      if (!latestDate || sorted[0].date > latestDate) {
        latestDate = sorted[0].date;
      }
    }
  }
  return latestDate;
}

// Quick exercise suggestion pool (no AI needed — instant response)
export interface ExerciseSuggestion {
  name: string;
  description: string;
  duration: number;
  type: ModuleType;
}

const EXERCISE_POOL: ExerciseSuggestion[] = [
  { name: 'Manchete em duplas', description: 'Duplas a 3m, 30 toques cada lado, foco na postura de recepção', duration: 10, type: 'fundamento' },
  { name: 'Ataque com bola de iniciativa', description: 'Levantador dá passe, atacante define o tempo de salto, variando posição', duration: 15, type: 'tecnico' },
  { name: 'Bloqueio 1x1 por posição', description: 'Dois jogadores se revezam no bloqueio e ataque na posição de central', duration: 12, type: 'tecnico' },
  { name: 'Saque float em zona', description: 'Cada jogador executa 10 saques float mirando zonas marcadas no chão', duration: 10, type: 'fundamento' },
  { name: 'Deslocamento lateral com defesa', description: 'Jogo de sombras: técnico aponta direção, atleta desloca e executa manchete', duration: 8, type: 'fisico' },
  { name: 'Situação 3x3 rede baixa', description: 'Jogo reduzido 3x3, rede mais baixa para aumentar ritmo e tomada de decisão', duration: 15, type: 'jogo' },
  { name: 'Cobertura de ataque', description: 'Atacante faz o movimento de ataque, time faz cobertura do bloqueio adversário', duration: 12, type: 'tatico' },
  { name: 'Recepção em W', description: 'Formação W, técnico saca forte, time recebe e levanta para o oposto', duration: 15, type: 'tatico' },
  { name: 'Corrida de coordenação', description: 'Escada de agilidade + salto vertical, 3 séries por jogador', duration: 10, type: 'fisico' },
  { name: 'Sequência de passe e toque', description: 'Jogador A faz manchete para B, B faz toque para C, C devolve, rotação', duration: 12, type: 'fundamento' },
  { name: 'Defesa de tubo por zone', description: 'Libero e jogadores de fundo defendem em zona, técnico ataca em posições variadas', duration: 12, type: 'tecnico' },
  { name: 'Ataque pelo meio 4-2', description: 'Levantador faz levantamento rápido pelo meio para o central, foco no tempo de salto', duration: 10, type: 'tatico' },
  { name: 'Rodízio 6x6 ponto a ponto', description: 'Jogo completo com rotação após cada ponto, todos os jogadores passam por todas as posições', duration: 20, type: 'jogo' },
  { name: 'Saque em salto aberto', description: '5 saques em salto por jogador, foco na linha de braço e contato acima da cabeça', duration: 10, type: 'fundamento' },
  { name: 'Levantamento de costas', description: 'Levantador treina levantamento de costas para o oposto, variando velocidade e altura', duration: 10, type: 'tecnico' },
  { name: 'Defesa de pipe', description: 'Jogadores de fundo treinam posicionamento e execução da defesa do ataque pipe', duration: 12, type: 'tatico' },
  { name: 'Aquecimento dinâmico de quadra', description: 'Deslocamento em todo o campo com diferentes padrões: frontal, lateral, diagonal, recuo', duration: 8, type: 'aquecimento' },
  { name: 'Fundamento em 3 tempos', description: 'Manchete → Toque → Ataque em sequência, 3 jogadores em triângulo rotativo', duration: 15, type: 'fundamento' },
];

export function suggestExercise(currentModuleTypes: ModuleType[]): ExerciseSuggestion {
  const hasType = (type: ModuleType) => currentModuleTypes.includes(type);
  let filtered = EXERCISE_POOL;
  if (hasType('tatico') && !hasType('tecnico')) {
    filtered = EXERCISE_POOL.filter(e => e.type === 'tecnico');
  } else if (!hasType('fisico')) {
    filtered = EXERCISE_POOL.filter(e => e.type !== 'fisico');
  } else if (hasType('jogo')) {
    filtered = EXERCISE_POOL.filter(e => e.type !== 'jogo');
  }
  if (filtered.length === 0) filtered = EXERCISE_POOL;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
