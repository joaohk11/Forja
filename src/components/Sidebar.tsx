import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Calendar, BarChart3, Users, History, Download, ClipboardCheck, Brain, Bell, Link2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/lib/context';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Calendar, label: 'Calendário', path: '/calendario' },
  { icon: BarChart3, label: 'Periodização', path: '/periodizacao' },
  { icon: Users, label: 'Atletas', path: '/atletas' },
  { icon: ClipboardCheck, label: 'Avaliações', path: '/avaliacoes' },
  { icon: History, label: 'Histórico', path: '/historico' },
  { icon: Brain, label: 'IA do Treinador', path: '/ia-treinador' },
  { icon: Download, label: 'Backup', path: '/backup' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, activeTeamId, setActiveTeam } = useApp();

  const pendingSuggestions = (data.trainingSuggestions || []).filter(
    s => s.status === 'pending' && s.teamId === activeTeamId
  );

  const auxiliaryLink = `${window.location.origin}/auxiliar/${activeTeamId}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <h1 className="font-mono text-lg font-bold neon-text tracking-[0.3em]">FORJA</h1>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Team selector */}
            <div className="p-4 border-b border-sidebar-border">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Time Ativo</p>
              <div className="flex gap-2">
                {data.teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setActiveTeam(team.id); navigate(`/time/${team.id}`); onClose(); }}
                    className={`flex-1 font-mono text-xs py-2 px-3 rounded border transition-all ${
                      activeTeamId === team.id
                        ? 'border-primary text-primary neon-border'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex-1 p-2 overflow-y-auto">
              {menuItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-body transition-all ${
                      active
                        ? 'text-primary bg-sidebar-accent neon-border'
                        : 'text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={1.5} />
                    {item.label}
                  </button>
                );
              })}

              {/* Suggestions link */}
              <button
                onClick={() => { navigate('/sugestoes'); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-body transition-all ${
                  location.pathname === '/sugestoes'
                    ? 'text-primary bg-sidebar-accent neon-border'
                    : 'text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/50'
                }`}
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                Sugestões do Auxiliar
                {pendingSuggestions.length > 0 && (
                  <span className="ml-auto font-mono text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">
                    {pendingSuggestions.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Auxiliary access section */}
            <div className="p-4 border-t border-sidebar-border">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Auxiliar Técnico</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(auxiliaryLink).catch(() => {});
                  window.open(auxiliaryLink, '_blank');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-primary font-mono text-xs transition-all"
              >
                <Link2 className="w-4 h-4" strokeWidth={1.5} />
                Abrir link do auxiliar
              </button>
              <p className="font-mono text-[8px] text-muted-foreground mt-1.5 break-all">{auxiliaryLink}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
