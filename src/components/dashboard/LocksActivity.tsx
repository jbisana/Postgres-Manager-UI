import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LocksActivity() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [locks, setLocks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLocks = async () => {
    if (!isConnected || !connectionString) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT
              l.locktype,
              l.relation::regclass as table_name,
              l.mode,
              l.granted,
              a.pid,
              a.query,
              a.state,
              age(now(), a.query_start) as duration
            FROM pg_locks l
            JOIN pg_stat_activity a ON l.pid = a.pid
            WHERE a.pid <> pg_backend_pid()
            ORDER BY duration DESC;
          `
        })
      });
      const data = await res.json();
      if (data.success) {
        setLocks(data.rows);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch locks details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocks();
  }, [isConnected, connectionString]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="text-red-800 dark:text-red-200 font-medium text-sm">Error</h3>
          <p className="text-red-600 dark:text-red-300/80 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white flex items-center gap-2">
          <ShieldAlert size={16} className="text-emerald-500" />
          Active Locks & Queries
        </h3>
        <button 
          onClick={fetchLocks}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3">PID</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Lock Type</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Granted</th>
              <th className="px-4 py-3">Query</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-700 dark:text-zinc-300">
            {locks.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 italic">No locks found</td>
              </tr>
            ) : locks.map((lock, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2 font-mono text-zinc-500 text-xs">{lock.pid}</td>
                <td className="px-4 py-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
                    lock.state === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                    lock.state === 'idle in transaction' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                    "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  )}>
                    {lock.state}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{lock.duration?.hours ? `${lock.duration.hours}h ` : ''}{lock.duration?.minutes ? `${lock.duration.minutes}m ` : ''}{lock.duration?.seconds ? `${Math.floor(lock.duration.seconds)}s` : ''}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-xs">{lock.locktype}</td>
                <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{lock.table_name || '-'}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-xs">{lock.mode}</td>
                <td className="px-4 py-2">
                  <span className={cn(
                    "border text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded",
                    lock.granted 
                      ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20" 
                      : "border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                  )}>
                    {lock.granted ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2 max-w-sm truncate font-mono text-xs">{lock.query}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
