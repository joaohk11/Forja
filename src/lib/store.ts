import { AppData, Team } from './types';

const STORAGE_KEY = 'forja_data';

const defaultTeams: Team[] = [
  { id: 'team-1', name: 'Time 1' },
  { id: 'team-2', name: 'Time 2' },
];

const defaultData: AppData = {
  teams: defaultTeams,
  athletes: [],
  trainings: [],
  macrocycles: [],
  mesocycles: [],
  microcycles: [],
  evalTests: [],
  evalResults: [],
  activeTeamId: 'team-1',
  trainingSuggestions: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultData, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return { ...defaultData };
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function exportBackup(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importBackup(json: string): AppData | null {
  try {
    const data = JSON.parse(json);
    if (data.teams && data.athletes) {
      return { ...defaultData, ...data };
    }
  } catch (e) {
    console.error('Invalid backup:', e);
  }
  return null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
