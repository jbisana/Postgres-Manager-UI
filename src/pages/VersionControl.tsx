import React, { useState, useEffect } from 'react';
import { GitCommit as GitCommitIcon, GitBranch, GitPullRequest, Search, FileDiff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDatabaseStore } from '../store';

export function VersionControl() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [migrations, setMigrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMigrationsTable, setHasMigrationsTable] = useState<boolean | null>(null);

  const checkTable = async () => {
    if (!isConnected || !connectionString) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionString, 
          query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations');"
        })
      });
      const data = await res.json();
      if (data.success) {
        const found = data.rows[0].exists;
        setHasMigrationsTable(found);
        if (found) fetchMigrations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMigrations = async () => {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionString, 
          query: "SELECT id, name, applied_at as timestamp, 'system' as author FROM migrations ORDER BY applied_at DESC;"
        })
      });
      const data = await res.json();
      if (data.success) {
        setMigrations(data.rows);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initMigrations = async () => {
    if (!isConnected || !connectionString) return;
    setIsLoading(true);
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO migrations (name) VALUES ('initial_schema');
      `;
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query })
      });
      const data = await res.json();
      if (data.success) {
        checkTable();
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) checkTable();
  }, [isConnected, connectionString]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <GitCommitIcon className="text-emerald-500" /> Database Version Control
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">Track schema migrations, perform reviews, and deploy DB changes.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={checkTable}
             disabled={isLoading}
             className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-sm font-sans"
           >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          {hasMigrationsTable && (
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-sm font-sans">
              <GitPullRequest size={16} /> Create Migration
            </button>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-medium text-sm">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database to see migration history.</p>
          </div>
        </div>
      )}

      {isConnected && hasMigrationsTable === false && (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <GitPullRequest size={32} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white capitalize">Enable Version Control</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2">
            The <code>migrations</code> table was not found in your database. Initialize it to start tracking schema changes.
          </p>
          <button 
            onClick={initMigrations}
            disabled={isLoading}
            className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Initializing...' : 'Initialize Migrations Table'}
          </button>
          {error && <p className="text-red-500 text-xs mt-4 font-mono">{error}</p>}
        </div>
      )}

      {isConnected && hasMigrationsTable && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[10px] tracking-widest font-sans">
              <GitBranch size={16} className="text-emerald-500 opacity-60" />
              <span className="font-mono text-zinc-900 dark:text-zinc-100 lowercase">{`main`}</span>
              <span className="text-zinc-400 font-normal ml-2 lowercase">{migrations.length} migrations detected</span>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {migrations.length === 0 && (
              <div className="p-8 text-center text-zinc-500 italic text-sm font-sans uppercase tracking-widest opacity-60">
                No migrations found.
              </div>
            )}
            {migrations.map((migration, i) => (
              <div key={migration.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition group">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-4 ring-white dark:ring-zinc-800 z-10 relative">
                    <GitCommitIcon size={16} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base font-sans tracking-tight">{migration.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-sans uppercase font-bold tracking-widest">
                        <span className="text-emerald-600 dark:text-emerald-400">{migration.author}</span>
                        <span className="opacity-50">applied on {new Date(migration.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded text-zinc-600 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 shadow-inner font-bold">
                         v{migration.id}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
