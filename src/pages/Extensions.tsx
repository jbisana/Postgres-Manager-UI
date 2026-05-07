import React, { useState, useEffect } from 'react';
import { Blocks, Search, CheckCircle2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useDatabaseStore } from '../store';

export function Extensions() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [extensions, setExtensions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && connectionString) {
      const fetchExtensions = async () => {
        setIsLoading(true);
        setErrorInfo(null);
        try {
          const res = await fetch('/api/db/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              connectionString, 
              query: "SELECT name, default_version, installed_version, comment as description FROM pg_available_extensions ORDER BY name;"
            })
          });
          const data = await res.json();
          if (data.success) {
            const mapped = data.rows.map((row: any) => ({
              name: row.name,
              version: row.default_version,
              installedVersion: row.installed_version,
              description: row.description,
              installed: row.installed_version !== null
            }));
            setExtensions(mapped);
          } else {
            setErrorInfo(data.error);
            setExtensions([]);
          }
        } catch (err: any) {
          setErrorInfo(err.message || 'Network error fetching extensions');
          setExtensions([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchExtensions();
    } else {
      setExtensions([]);
      setErrorInfo(null);
    }
  }, [isConnected, connectionString]);

  const filteredExtensions = extensions.filter(ext => 
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (ext.description && ext.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleExtension = async (name: string, isInstalling: boolean) => {
    if (isConnected && connectionString) {
      setErrorInfo(null);
      setIsLoading(true);
      try {
        const query = isInstalling 
          ? `CREATE EXTENSION IF NOT EXISTS "${name}";`
          : `DROP EXTENSION IF EXISTS "${name}";`;
          
        const res = await fetch('/api/db/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString, query })
        });
        const data = await res.json();
        if (data.success) {
          // Update local state to reflect change without re-fetching all
          setExtensions(extensions.map(ext => 
            ext.name === name ? { ...ext, installed: isInstalling, installedVersion: isInstalling ? ext.version : null } : ext
          ));
        } else {
          setErrorInfo(data.error);
        }
      } catch (err: any) {
        setErrorInfo(err.message);
      } finally {
        setIsLoading(false);
        setConfirmUninstall(null);
      }
    } else {
      // Mock mode
      setExtensions(extensions.map(ext => 
        ext.name === name ? { ...ext, installed: isInstalling } : ext
      ));
      if (!isInstalling) setConfirmUninstall(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Blocks className="text-emerald-500" /> PostgreSQL Extensions
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">Enable or disable PostgreSQL extensions on your database.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Search extensions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition text-zinc-900 dark:text-white shadow-sm font-sans"
          />
        </div>
      </div>

      {errorInfo && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-start gap-2 border border-red-100 dark:border-red-900/40">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="font-mono">{errorInfo}</div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-bold text-sm uppercase tracking-widest font-sans">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to view and manage extensions.</p>
          </div>
        </div>
      )}

      {isLoading && extensions.length === 0 ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExtensions.map(ext => (
            <div key={ext.name} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm flex flex-col hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition duration-300">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-lg flex items-center gap-2 font-mono tracking-tight uppercase">
                    {ext.name}
                    {ext.installed && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </h3>
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest">Available v{ext.version}</span>
                </div>
                
                {ext.installed ? (
                  <button 
                    onClick={() => setConfirmUninstall(ext.name)}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 rounded text-[10px] tracking-wider transition font-bold flex items-center gap-1.5 uppercase font-sans border border-red-100 dark:border-red-900/40"
                  >
                    <Trash2 size={14} /> Uninstall
                  </button>
                ) : (
                  <button 
                    onClick={() => toggleExtension(ext.name, true)}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-50 text-[10px] tracking-wider transition font-bold flex items-center gap-1.5 uppercase font-sans"
                  >
                    <Plus size={14} /> Install
                  </button>
                )}
              </div>
              
              <p className="text-sm text-zinc-600 dark:text-zinc-400 flex-1 leading-relaxed font-sans mt-2">
                {ext.description || 'No description available'}
              </p>
              
              {ext.installed && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50 flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] font-sans">
                  <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Node Active (v{ext.installedVersion || ext.version})
                </div>
              )}
            </div>
          ))}

          {filteredExtensions.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 block">
              <Blocks size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 font-sans">No extensions found</h3>
              <p className="text-xs mt-1 uppercase font-medium opacity-60">Sequence search returned empty set</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmUninstall} 
        onCancel={() => setConfirmUninstall(null)} 
        onConfirm={() => confirmUninstall && toggleExtension(confirmUninstall, false)} 
        title="Uninstall Extension" 
        message={`Are you sure you want to drop the extension "${confirmUninstall}"? This action cannot be undone and might break objects (tables, views, functions) depending on it. CASCADE is not used by default.`} 
        confirmLabel="Uninstall Extension"
      />
    </div>
  );
}
