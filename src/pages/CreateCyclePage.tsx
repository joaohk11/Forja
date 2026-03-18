import { useState } from 'react';
import { useApp } from '@/lib/context';
import { useNavigate } from 'react-router-dom';
import { generateId } from '@/lib/store';
import { format, addMonths } from 'date-fns';

const CreateCyclePage = () => {
  const { activeTeamId, addMacrocycle } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'6months' | '1year'>('6months');

  const handleSave = () => {
    if (!name.trim()) return;
    const endDate = format(addMonths(new Date(startDate), type === '6months' ? 6 : 12), 'yyyy-MM-dd');
    addMacrocycle({ teamId: activeTeamId, name, startDate, endDate, type });
    navigate('/periodizacao');
  };

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm font-medium mb-6">Criar Ciclo</h2>
      <div className="space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do macrociclo"
          className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Duração</label>
            <select value={type} onChange={e => setType(e.target.value as any)}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none">
              <option value="6months">6 meses</option>
              <option value="1year">1 ano</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded hover:neon-glow transition-all">
          Criar Macrociclo
        </button>
      </div>
    </div>
  );
};

export default CreateCyclePage;
