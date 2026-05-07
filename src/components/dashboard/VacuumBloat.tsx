import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function VacuumBloat() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
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
              relname as table_name,
              pg_size_pretty(pg_relation_size(relid)) as table_size,
              n_live_tup as live_tuples,
              n_dead_tup as dead_tuples,
              round((n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100), 2) as dead_pct,
              last_autovacuum,
              last_autoanalyze,
              autovacuum_count
            FROM pg_stat_user_tables
            ORDER BY n_dead_tup DESC;
          `
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setData(resData.rows);
      } else {
        setError(resData.error);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch table stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">Vacuum & Bloat Report</h3>
        <button 
          onClick={fetchData}
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
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Dead %</th>
              <th className="px-4 py-3">Dead Tuples</th>
              <th className="px-4 py-3">Live Tuples</th>
              <th className="px-4 py-3">Vacuum Count</th>
              <th className="px-4 py-3">Last Vacuum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-700 dark:text-zinc-300">
            {data.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 italic">No user tables found</td>
              </tr>
            ) : data.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{row.table_name}</td>
                <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{row.table_size}</td>
                <td className={cn(
                  "px-4 py-2 font-medium font-mono text-xs",
                  row.dead_pct > 20 ? "text-red-500" : row.dead_pct > 5 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {row.dead_pct || 0}%
                </td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{row.dead_tuples}</td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{row.live_tuples}</td>
                <td className="px-4 py-2 text-zinc-500">{row.autovacuum_count}</td>
                <td className="px-4 py-2 text-zinc-500 text-xs">
                  {row.last_autovacuum ? new Date(row.last_autovacuum).toLocaleString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
