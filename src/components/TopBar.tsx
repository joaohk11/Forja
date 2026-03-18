import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <button onClick={onMenuClick} className="p-1 text-muted-foreground hover:text-primary transition-colors">
        <Menu className="w-6 h-6" strokeWidth={1.5} />
      </button>
      <h1 className="font-mono text-sm font-semibold neon-text tracking-[0.2em] uppercase">
        {title || 'FORJA'}
      </h1>
    </header>
  );
}
