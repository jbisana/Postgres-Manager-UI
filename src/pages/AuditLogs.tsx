import React, { useState, useEffect } from 'react';
import { History, Search, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDatabaseStore } from '../store';

export function AuditLogs() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    if (!isConnected || !connectionString) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString })
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.activity.map((a: any, i: number) => ({
          id: i,
          timestamp: new Date().toISOString(), // pg_stat_activity doesn't store historical start times easily, using proxy
          user: 'postgres',
          action: a.state || 'IDLE',
          resourceType: 'SESSION',
          resourceName: a.pid,
          details: a.query
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [isConnected, connectionString]);

  return (
    <div className="p-6 md:p-8 max-w-7xl auto space-y-6 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <History className="text-emerald-500" /> Audit Logs
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Review live activity and session states.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={fetchLogs}
             className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm transition shadow-sm font-medium"
           >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-medium text-sm">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to view audit logs.</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-full sm:w-auto">
              <option>All Actions</option>
              <option>Schema Changes</option>
              <option>Data Changes</option>
              <option>Access Changes</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-sans">
              <tr>
                <th className="px-6 py-3 font-medium uppercase text-[10px] tracking-widest">Timestamp</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px] tracking-widest">User</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px] tracking-widest">Action</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px] tracking-widest">Resource</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px] tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-800 dark:text-zinc-200">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 italic text-sm">
                    No logs found.
                  </td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-mono text-[10px] tracking-tight">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold font-mono text-xs">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase",
                      log.action.includes('CREATE') ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" :
                      log.action.includes('UPDATE') ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                      log.action.includes('DELETE') || log.action.includes('DROP') ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50" :
                      "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600/50"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                    <span className="font-bold opacity-60 uppercase">{log.resourceType}:</span> {log.resourceName}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs italic">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center sm:text-left bg-zinc-50 dark:bg-zinc-900/50">
          Showing {logs.length} of {logs.length} records
        </div>
      </div>
    </div>
  );
}
