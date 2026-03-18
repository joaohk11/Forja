import { useState } from 'react';
import { useApp } from '@/lib/context';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado com sucesso');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importData(text);
      if (success) {
        toast.success('Backup importado com sucesso');
      } else {
        toast.error('Arquivo de backup inválido');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm font-medium mb-6">Backup</h2>

      <div className="space-y-4">
        <button
          onClick={handleExport}
          className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all"
        >
          <Download className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Exportar Backup</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados em arquivo JSON</p>
          </div>
        </button>

        <label className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left cursor-pointer hover:neon-glow transition-all block">
          <Upload className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Importar Backup</p>
            <p className="font-body text-[10px] text-muted-foreground">Restaurar dados de arquivo JSON</p>
          </div>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        <div className="card-surface rounded-lg p-4 flex items-start gap-3 border border-status-partial/30">
          <AlertTriangle className="w-5 h-5 text-status-partial flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-xs text-foreground mb-1">Google Drive</p>
            <p className="font-body text-[10px] text-muted-foreground">
              Backup na nuvem via Google Drive estará disponível em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupPage;
