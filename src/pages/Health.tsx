import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../store';
import { Activity, Database as DbIcon, Search, AlertCircle, HardDrive, Cpu, Filter, Layers, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export function Health() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [activeTab, setActiveTab] = useState<'indexes' | 'bloat' | 'storage'>('indexes');
  const [indexes, setIndexes] = useState<any[]>([]);
  const [bloat, setBloat] = useState<any[]>([]);
  const [storage, setStorage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && connectionString) {
      if (activeTab === 'indexes') fetchIndexes();
      if (activeTab === 'bloat') fetchBloat();
      if (activeTab === 'storage') fetchStorage();
    }
  }, [isConnected, connectionString, activeTab]);

  const fetchIndexes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT
                schemaname,
                relname AS table_name,
                indexrelname AS index_name,
                idx_scan AS number_of_scans,
                idx_tup_read AS tuples_read,
                idx_tup_fetch AS tuples_fetched,
                pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
            FROM
                pg_stat_user_indexes
            ORDER BY
                idx_scan ASC, pg_relation_size(indexrelid) DESC
            LIMIT 50;
          `
        })
      });
      const data = await res.json();
      if (data.success) setIndexes(data.rows);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchBloat = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT
              schemaname,
              relname AS table_name,
              n_dead_tup AS dead_tuples,
              n_live_tup AS live_tuples,
              ROUND((n_dead_tup::numeric / NULLIF(n_dead_tup + n_live_tup, 0)) * 100, 2) AS bloat_ratio
            FROM pg_stat_user_tables
            ORDER BY bloat_ratio DESC NULLS LAST
            LIMIT 50;
          `
        })
      });
      const data = await res.json();
      if (data.success) setBloat(data.rows);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchStorage = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT
                table_schema || '.' || table_name AS table_name,
                pg_size_pretty(pg_total_relation_size('"' || table_schema || '"."' || table_name || '"')) AS total_size,
                pg_size_pretty(pg_relation_size('"' || table_schema || '"."' || table_name || '"')) AS table_size,
                pg_size_pretty(pg_total_relation_size('"' || table_schema || '"."' || table_name || '"') - pg_relation_size('"' || table_schema || '"."' || table_name || '"')) AS index_size
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY pg_total_relation_size('"' || table_schema || '"."' || table_name || '"') DESC
            LIMIT 50;
          `
        })
      });
      const data = await res.json();
      if (data.success) setStorage(data.rows);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center bg-zinc-50 dark:bg-[#09090b]">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
           <Activity size={32} className="text-zinc-400 dark:text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Database Health</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">Connect to a database to monitor indexes, bloat, and storage utilization.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <div className="flex-none p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Activity className="text-blue-500" /> Health & Performance
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Monitor indexes, table bloat, and storage capacity.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <button
              className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2", activeTab === 'indexes' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}
              onClick={() => setActiveTab('indexes')}
            >
              <div className="flex items-center gap-2"><Zap size={16} /> Index Manager</div>
            </button>
            <button
              className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2", activeTab === 'bloat' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}
              onClick={() => setActiveTab('bloat')}
            >
              <div className="flex items-center gap-2"><AlertCircle size={16} /> Table Bloat</div>
            </button>
            <button
              className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2", activeTab === 'storage' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}
              onClick={() => setActiveTab('storage')}
            >
              <div className="flex items-center gap-2"><HardDrive size={16} /> Storage Size</div>
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="p-12 flex justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      {activeTab === 'indexes' && (
                        <>
                          <th className="px-6 py-3">Schema</th>
                          <th className="px-6 py-3">Table</th>
                          <th className="px-6 py-3">Index Name</th>
                          <th className="px-6 py-3">Scans</th>
                          <th className="px-6 py-3">Size</th>
                        </>
                      )}
                      {activeTab === 'bloat' && (
                        <>
                          <th className="px-6 py-3">Schema</th>
                          <th className="px-6 py-3">Table</th>
                          <th className="px-6 py-3">Dead Tuples</th>
                          <th className="px-6 py-3">Live Tuples</th>
                          <th className="px-6 py-3">Bloat Ratio</th>
                        </>
                      )}
                      {activeTab === 'storage' && (
                        <>
                          <th className="px-6 py-3">Table Name</th>
                          <th className="px-6 py-3">Total Size</th>
                          <th className="px-6 py-3">Table Size</th>
                          <th className="px-6 py-3">Index Size</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {activeTab === 'indexes' && indexes.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                        <td className="px-6 py-3 font-mono text-zinc-600 dark:text-zinc-400 text-xs">{row.schemaname}</td>
                        <td className="px-6 py-3 font-mono text-zinc-800 dark:text-zinc-300 font-bold text-xs">{row.table_name}</td>
                        <td className="px-6 py-3 font-mono text-blue-600 dark:text-blue-400 text-xs">{row.index_name}</td>
                        <td className="px-6 py-3">
                          <div className={cn("inline-flex px-2 py-0.5 rounded text-xs font-bold", row.number_of_scans === 0 ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")}>
                            {row.number_of_scans}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-zinc-500">{row.index_size}</td>
                      </tr>
                    ))}
                    {activeTab === 'bloat' && bloat.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                        <td className="px-6 py-3 font-mono text-zinc-600 dark:text-zinc-400 text-xs">{row.schemaname}</td>
                        <td className="px-6 py-3 font-mono text-zinc-800 dark:text-zinc-300 font-bold text-xs">{row.table_name}</td>
                        <td className="px-6 py-3 font-mono text-xs">{row.dead_tuples}</td>
                        <td className="px-6 py-3 font-mono text-xs">{row.live_tuples}</td>
                        <td className="px-6 py-3">
                          <div className={cn("inline-flex px-2 py-0.5 rounded text-xs font-bold", 
                            parseFloat(row.bloat_ratio) > 20 
                            ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
                            : parseFloat(row.bloat_ratio) > 10 
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400")}>
                            {row.bloat_ratio || '0.00'}%
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'storage' && storage.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                        <td className="px-6 py-3 font-mono text-zinc-800 dark:text-zinc-300 font-bold text-xs">{row.table_name}</td>
                        <td className="px-6 py-3 font-mono text-xs font-semibold">{row.total_size}</td>
                        <td className="px-6 py-3 font-mono text-zinc-500 text-xs">{row.table_size}</td>
                        <td className="px-6 py-3 text-xs text-zinc-500"><span className="text-blue-500 font-mono mr-1">{row.index_size}</span></td>
                      </tr>
                    ))}
                    {(activeTab === 'indexes' && indexes.length === 0) || (activeTab === 'bloat' && bloat.length === 0) || (activeTab === 'storage' && storage.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 text-sm italic">
                          No data available or you don't have enough permissions.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
