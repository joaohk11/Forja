import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const CalendarPage = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const teamTrainings = data.trainings.filter(t => t.teamId === activeTeamId);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = getDay(days[0]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-status-done';
      case 'parcial': return 'bg-status-partial';
      case 'cancelado': return 'bg-status-cancelled';
      default: return 'bg-status-planned';
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <h2 className="font-mono text-sm font-medium capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-muted-foreground hover:text-primary">
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayTrainings = teamTrainings.filter(t => t.date === dayStr);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dayStr}
              onClick={() => navigate(`/criar-treino?date=${dayStr}`)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-md text-xs font-mono transition-all ${
                isToday ? 'border border-primary neon-border' : 'hover:bg-card'
              }`}
            >
              <span className={isToday ? 'text-primary' : 'text-foreground'}>{format(day, 'd')}</span>
              {dayTrainings.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayTrainings.slice(0, 3).map(t => (
                    <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${statusColor(t.status)}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today's trainings */}
      <div className="mt-6 space-y-2">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Treinos do Mês</h3>
        {teamTrainings
          .filter(t => t.date.startsWith(format(currentMonth, 'yyyy-MM')))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/treino/${t.id}`)}
              className="w-full card-surface neon-border rounded-md p-3 flex items-center gap-3 text-left"
            >
              <div className={`w-2 h-2 rounded-full ${statusColor(t.status)}`} />
              <div className="flex-1">
                <p className="font-mono text-xs text-foreground">{t.name}</p>
                <p className="font-body text-[10px] text-muted-foreground">{format(new Date(t.date), 'dd/MM/yyyy')}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{t.duration}min</span>
            </button>
          ))
        }
      </div>
    </div>
  );
};

export default CalendarPage;
