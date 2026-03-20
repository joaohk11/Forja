# FORJA — Sistema de Gestão de Treino de Voleibol

## Overview
FORJA is a volleyball coaching and athlete performance management application built with React + Vite + TypeScript. It features a dark sporty design with neon-blue highlights.

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Backend**: Express server (port 3000) — serves AI coach API
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Context + localStorage persistence
- **Routing**: React Router v6
- **AI**: OpenAI GPT-4o-mini via Express server route `/api/ai-coach`
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Key Files
- `src/lib/types.ts` — All TypeScript types and data models
- `src/lib/context.tsx` — Global state management (AppProvider + useApp hook)
- `src/lib/store.ts` — localStorage persistence layer
- `src/lib/ai.ts` — AI streaming helper (calls `/api/ai-coach`)
- `src/App.tsx` — Routing configuration
- `src/components/AppLayout.tsx` — Main layout wrapper (TopBar + Sidebar)
- `server/index.ts` — Express server: proxies AI requests to OpenAI with streaming

### Data Storage
All data is stored in `localStorage` under the key `forja_data` as an `AppData` object.

## Features

### Coach (Main App)
- Dashboard with macrocycle progress and hex navigation grid
- Training calendar and management (create, view, track modules)
- Athlete management with profiles, photos, attributes
- Evaluation system (physical + technical tests with scoring)
- Periodization (Macrocycles → Mesocycles → Microcycles)
- AI Coach integration (generate trainings, analyze athletes, chat)
- Tactical system and history views
- Data backup/restore

### Auxiliary Coach (v2.0)
- Dedicated route: `/auxiliar/:teamId` (outside AppLayout, standalone)
- Name prompt on first access (stored in localStorage per team)
- **Treinos tab**: View team trainings, mark module status (Concluído/Parcial/Não fez), add observations, propose changes as suggestions
- **Atletas tab**: View athletes with attribute bars and AI analysis button
- **IA tab**: Analyze athletes with AI, generate training suggestions (sent to coach for approval), volleyball chat

### Training Suggestions System
- Auxiliary proposes changes → stored as `TrainingSuggestion` (status: pending)
- Coach sees pending suggestions in dashboard (yellow banner + bell icon)
- Suggestions page (`/sugestoes`): Approve / Reject / Edit before approve
- On approval, changes are applied to the training data
- AI-generated trainings from auxiliary are also sent as suggestions

### Evaluation History (v2.0)
- Each athlete attribute shows current score + date of last update
- Simple, quick display optimized for use during training sessions
- No full history shown on profile page

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Index | Dashboard |
| `/calendario` | CalendarPage | Training calendar |
| `/atletas` | AthletesPage | Athlete list |
| `/criar-treino` | CreateTrainingPage | Create training |
| `/treino/:id` | TrainingDetailPage | Training detail + module status |
| `/treino-hoje` | TodayTrainingPage | Today's training |
| `/proximo-treino` | NextTrainingPage | Next training |
| `/periodizacao` | PeriodizationPage | Season planning |
| `/historico` | HistoryPage | Training history |
| `/backup` | BackupPage | Data backup/restore |
| `/criar-ciclo` | CreateCyclePage | Create macrocycle |
| `/time/:id` | TeamProfilePage | Team profile |
| `/avaliacoes` | EvaluationsPage | Evaluation management |
| `/atleta/:id` | AthleteProfilePage | Athlete profile |
| `/sistema-tatico` | TacticalSystemPage | Tactical system |
| `/ia-treinador` | AICoachPage | AI Coach |
| `/sugestoes` | SuggestionsPage | Training suggestions from auxiliary |
| `/auxiliar/:teamId` | AuxiliaryPage | Auxiliary coach interface (standalone) |

## Development
```bash
npm run dev     # Start Vite dev server on port 5000
npm run server  # Start Express server on port 3000
```

## Environment Variables
- `OPENAI_API_KEY` — OpenAI API key (required for AI coach feature)
