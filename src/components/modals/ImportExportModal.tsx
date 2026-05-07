import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Download, Upload, Server, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Table } from '../../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  connectionString: string | null;
}

export function ImportExportModal({ isOpen, onClose, table, connectionString }: ImportExportModalProps) {
  const [mode, setMode] = useState<'import' | 'export'>('export');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    if (!table || !connectionString) return;
    setIsProcessing(true);
    setStatus(null);
    try {
      const res = await fetch('/api/db/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, table: table.name, format })
      });
      const data = await res.json();
      if (data.success) {
        // trigger download
        const blob = new Blob([data.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${table.name}_export.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', message: `Exported ${table.name} successfully.` });
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Export failed due to network error.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!table || !connectionString || !e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus(null);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      try {
        const res = await fetch('/api/db/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString, table: table.name, format, data: content })
        });
        const data = await res.json();
        if (data.success) {
           setStatus({ type: 'success', message: `Imported ${data.rowCount} rows successfully.` });
        } else {
           setStatus({ type: 'error', message: data.error });
        }
      } catch (err: any) {
         setStatus({ type: 'error', message: err.message || 'Import failed due to network error.' });
      } finally {
         setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read file.' });
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={table ? `Import / Export: ${table.name}` : "Import / Export"}
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          <button
            onClick={() => setMode('export')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition",
              mode === 'export' ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setMode('import')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition",
              mode === 'import' ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Upload size={16} /> Import
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-zinc-300">Format</label>
          <select 
            value={format}
            onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
            className="w-full px-3 py-2 border rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
          >
            <option value="csv">CSV (Comma Separated)</option>
            <option value="json">JSON Array</option>
          </select>
        </div>

        {status && (
          <div className={cn(
            "p-3 rounded text-sm whitespace-pre-wrap font-mono",
            status.type === 'success' ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
          )}>
            {status.message}
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium"
          >
            Cancel
          </button>
          {mode === 'export' ? (
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={16}/>}
              Export Data
            </button>
          ) : (
            <div className="relative">
               <button
                 disabled={isProcessing}
                 className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
               >
                 {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16}/>}
                 Import Data
               </button>
               <input 
                  type="file" 
                  accept={format === 'csv' ? '.csv' : '.json'}
                  onChange={handleImport}
                  disabled={isProcessing}
                  className="absolute inset-0 opacity-0 cursor-pointer text-[0px]"
               />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
