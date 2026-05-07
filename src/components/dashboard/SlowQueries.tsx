import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function SlowQueries() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [queries, setQueries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQueries = async () => {
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
              query, 
              calls, 
              round(total_exec_time::numeric, 2) as total_time_ms, 
              round(mean_exec_time::numeric, 2) as mean_time_ms, 
              rows 
            FROM pg_stat_statements 
            ORDER BY mean_exec_time DESC 
            LIMIT 50;
          `
        })
      });
      const data = await res.json();
      if (data.success) {
        setQueries(data.rows);
      } else {
        if (data.error.includes('relation "pg_stat_statements" does not exist')) {
          setError('The "pg_stat_statements" extension is not enabled. Please enable it in the Extensions tab.');
        } else {
          setError(data.error);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch slow queries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [isConnected, connectionString]);

  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="text-amber-800 dark:text-amber-200 font-medium text-sm">Cannot Analyze Queries</h3>
          <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">Slow Query Analyzer</h3>
        <button 
          onClick={fetchQueries}
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
              <th className="px-4 py-3">Mean Time (ms)</th>
              <th className="px-4 py-3">Total Time (ms)</th>
              <th className="px-4 py-3">Calls</th>
              <th className="px-4 py-3">Rows</th>
              <th className="px-4 py-3 max-w-xl">Query</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-700 dark:text-zinc-300">
            {queries.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">No query data available</td>
              </tr>
            ) : queries.map((q, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2 font-mono text-amber-600 dark:text-amber-400">{q.mean_time_ms}</td>
                <td className="px-4 py-2 font-mono text-zinc-500">{q.total_time_ms}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{q.calls}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{q.rows}</td>
                <td className="px-4 py-2 max-w-xl truncate font-mono text-xs">{q.query}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
