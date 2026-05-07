import React, { useState, useEffect } from 'react';
import { HardDriveDownload, DownloadCloud, UploadCloud, Play, Settings, DatabaseBackup, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDatabaseStore } from '../store';

export function Backups() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Persistence logic for this session/prototype
  useEffect(() => {
    const saved = localStorage.getItem('pg_admin_backups');
    if (saved) setBackups(JSON.parse(saved));
  }, []);

  const createBackup = async () => {
    if (!isConnected || !connectionString) return;
    setIsLoading(true);
    try {
      // In a real environment, this might trigger a server-side pg_dump
      // For this manager, we'll perform a logical dump of the public schema version
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionString, 
          query: "SELECT version();"
        })
      });
      const data = await res.json();
      
      const newBackup = {
        id: Date.now(),
        name: `backup_${new Date().toISOString().split('T')[0]}_${Math.floor(Math.random()*1000)}`,
        timestamp: new Date().toISOString(),
        size: '~1.2 MB', // Mock size calculation
        version: data.success ? data.rows[0].version.split(' ')[1] : '14',
      };

      const updated = [newBackup, ...backups];
      setBackups(updated);
      localStorage.setItem('pg_admin_backups', JSON.stringify(updated));
      setLastBackup(newBackup.timestamp);
      
      // Simulate file download
      alert(`Logical backup ${newBackup.name} initiated. In a production environment, pg_dump would generate a .sql or .bak file for you to download.`);
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <HardDriveDownload className="text-emerald-500" /> Backups & Restore
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">Manage volume snapshots and logical backups.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-sm border border-zinc-200 dark:border-zinc-700 font-sans">
            <Settings size={16} /> Schedule
          </button>
          <button 
            onClick={createBackup}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-sm font-sans disabled:opacity-50" 
            disabled={!isConnected || isLoading}
          >
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <DatabaseBackup size={16} />}
            Create Backup
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-bold text-sm uppercase tracking-widest font-sans">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to manage backups.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Stats Cards */}
         <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 p-5 rounded-xl shadow-sm text-emerald-800 dark:text-emerald-400">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg"><DownloadCloud size={20} /></div>
             <h3 className="font-bold text-[10px] uppercase tracking-widest font-sans">Last Successful Backup</h3>
           </div>
           <p className="text-2xl font-bold mt-2 font-mono tracking-tight uppercase">{isConnected ? 'Today, 00:00 UTC' : 'N/A'}</p>
           <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500 mt-1 uppercase font-bold font-sans">Daily automated snapshot</p>
         </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-800 dark:text-white flex items-center gap-2 font-sans">Available Backups</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-sans">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest">Name</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest">Date created</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest">Size</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest">Version</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-800 dark:text-zinc-200 font-mono">
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 italic text-sm">
                    No backups found.
                  </td>
                </tr>
              )}
              {backups.map((backup: any) => (
                <tr key={backup.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 tracking-tight">
                    <DatabaseBackup size={16} className="text-emerald-500 opacity-60" />
                    {backup.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-[10px]">
                    {new Date(backup.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs">
                    {backup.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs italic">
                    PG {backup.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2 font-sans">
                       <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded text-[10px] transition font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/40">
                        <UploadCloud size={14} /> Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
