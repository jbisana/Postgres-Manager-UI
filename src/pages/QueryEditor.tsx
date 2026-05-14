import React, { useState, useEffect } from 'react';
import { Play, Save, History, Download, GitPullRequest, AlertCircle, Plus, X, Folder, Clock, Bookmark, ChevronRight, ChevronDown, ListFilter, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { cn } from '../lib/utils';
import { useDatabaseStore } from '../store';

interface QueryTab {
  id: string;
  name: string;
  query: string;
}

interface QueryHistory {
  id: string;
  query: string;
  timestamp: string;
  status: 'success' | 'error';
  duration?: number;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
}

export function QueryEditor() {
  const { isConnected, connectionString, availableDatabases, setAvailableDatabases, setSelectedDatabase } = useDatabaseStore();
  const [tabs, setTabs] = useState<QueryTab[]>([{ id: '1', name: 'Query 1', query: '-- Write your SQL query here\nSELECT * FROM pg_stat_activity\nLIMIT 10;' }]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [results, setResults] = useState<any[] | null>(null);
  const [fields, setFields] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'saved'>('saved');

  // Load state from local storage or set initial
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  useEffect(() => {
    const loadedHistory = localStorage.getItem('db_query_history');
    if (loadedHistory) setHistory(JSON.parse(loadedHistory));
    const loadedSaved = localStorage.getItem('db_saved_queries');
    if (loadedSaved) setSavedQueries(JSON.parse(loadedSaved));
  }, []);

  useEffect(() => {
    if (isConnected && connectionString && availableDatabases.length === 0) {
      const fetchDatabases = async () => {
        try {
          const res = await fetch('/api/db/databases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionString })
          });
          const data = await res.json();
          if (data.success) {
            setAvailableDatabases(data.databases);
          }
        } catch (e) {
          console.error("Failed to fetch databases", e);
        }
      };
      fetchDatabases();
    }
  }, [isConnected, connectionString]);

  const getCurrentDb = () => {
    if (!connectionString) return null;
    try {
      const url = new URL(connectionString);
      return url.pathname.slice(1);
    } catch (e) {
      const match = connectionString.match(/dbname=([^ ]+)/);
      return match ? match[1] : null;
    }
  };

  const selectedDatabaseName = getCurrentDb();

  const saveHistory = (newHistory: QueryHistory[]) => {
    setHistory(newHistory);
    localStorage.setItem('db_query_history', JSON.stringify(newHistory.slice(0, 50))); // Keep last 50
  };

  const saveSavedQueries = (newSaved: SavedQuery[]) => {
    setSavedQueries(newSaved);
    localStorage.setItem('db_saved_queries', JSON.stringify(newSaved));
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveQuery = (val: string | undefined) => {
    if (val === undefined) return;
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, query: val } : t));
  };

  const addTab = () => {
    const newId = Date.now().toString();
    setTabs([...tabs, { id: newId, name: `Query ${tabs.length + 1}`, query: '' }]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setErrorInfo(null);
    const startTime = Date.now();
    
    if (isConnected && connectionString) {
      try {
        const res = await fetch('/api/db/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString, query: activeTab.query })
        });
        const data = await res.json();
        const duration = Date.now() - startTime;
        
        if (data.success) {
          setResults(data.rows);
          setFields(data.fields);
          setRowCount(data.rowCount);
          saveHistory([{
            id: Date.now().toString(),
            query: activeTab.query,
            timestamp: new Date().toISOString(),
            status: 'success',
            duration
          }, ...history]);
        } else {
          setErrorInfo(data.error);
          setResults(null);
          setFields(null);
          setRowCount(null);
          saveHistory([{
            id: Date.now().toString(),
            query: activeTab.query,
            timestamp: new Date().toISOString(),
            status: 'error',
            duration
          }, ...history]);
        }
      } catch (err: any) {
        setErrorInfo(err.message || 'Network error running query');
        setResults(null);
        setFields(null);
        setRowCount(null);
      } finally {
        setIsRunning(false);
      }
    } else {
      setTimeout(() => {
        setResults([
          { id: '550e8400-e2...', email: 'alice@example.com', created_at: '2026-01-15 08:30:00+00', is_active: true },
          { id: 'aaaabb00-e2...', email: 'test@example.com', created_at: '2026-03-10 11:21:00+00', is_active: true },
          { id: '11112222-33...', email: 'prod@domain.com', created_at: '2026-04-01 09:00:00+00', is_active: true },
        ]);
        setFields(null);
        setRowCount(3);
        setIsRunning(false);
        saveHistory([{
          id: Date.now().toString(),
          query: activeTab.query,
          timestamp: new Date().toISOString(),
          status: 'success',
          duration: 800
        }, ...history]);
      }, 800);
    }
  };

  const handleSaveQuery = () => {
    const name = prompt('Name for this query:', activeTab.name);
    if (name) {
      saveSavedQueries([...savedQueries, { id: Date.now().toString(), name, query: activeTab.query }]);
      setTabs(tabs.map(t => t.id === activeTabId ? { ...t, name } : t));
    }
  };

  const loadQuery = (query: string, name?: string) => {
    const newId = Date.now().toString();
    setTabs([...tabs, { id: newId, name: name || `Query ${tabs.length + 1}`, query }]);
    setActiveTabId(newId);
  };

  const handleExport = () => {
    if (!results) return;
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col text-zinc-900 dark:text-zinc-100">
      <div className="flex-none p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex justify-between items-center z-10 transition-colors">
        <div className="flex gap-2">
          <button 
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="flex items-center justify-center p-2 mr-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition"
            title="Toggle Sidebar"
          >
            <Folder size={16} />
          </button>
          
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 mr-2">
            <Database size={14} className="text-zinc-400 mr-2" />
            <select 
              value={selectedDatabaseName || ''} 
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="bg-transparent text-sm border-none focus:ring-0 text-zinc-700 dark:text-zinc-300 py-1 pr-8 font-mono"
            >
              {!selectedDatabaseName && <option value="">Select DB</option>}
              {availableDatabases.map(db => (
                <option key={db} value={db}>{db}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold uppercase tracking-widest transition shadow-sm"
          >
            <Play size={16} className={cn(isRunning && "animate-pulse")} />
            {isRunning ? 'Executing...' : 'Run'}
          </button>
          <button onClick={handleSaveQuery} className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition">
            <Save size={16} /> Save
          </button>
        </div>
        <div className="flex gap-2 text-zinc-500">
          <button 
            onClick={handleExport}
            disabled={!results}
            className="flex items-center gap-2 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition disabled:opacity-50 font-bold uppercase text-[10px] tracking-widest"
          >
            <Download size={16} /> Export JSON
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-zinc-50 dark:bg-[#09090b]">
        {/* Left Sidebar */}
        {leftSidebarOpen && (
          <div className="w-64 flex-none border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-[#09090b]">
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest">
              <button 
                onClick={() => setSidebarTab('saved')}
                className={cn("flex-1 py-3 border-b-2 text-center transition-colors", sidebarTab === 'saved' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}
              >
                Saved
              </button>
              <button 
                onClick={() => setSidebarTab('history')}
                className={cn("flex-1 py-3 border-b-2 text-center transition-colors", sidebarTab === 'history' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400")}
              >
                History
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sidebarTab === 'saved' ? (
                savedQueries.length > 0 ? savedQueries.map(q => (
                  <div key={q.id} className="group p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer flex justify-between items-center transition-colors" onClick={() => loadQuery(q.query, q.name)}>
                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 font-mono tracking-tight">
                      <Bookmark size={14} className="text-zinc-400" />
                      <span className="truncate w-40">{q.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); saveSavedQueries(savedQueries.filter(sq => sq.id !== q.id)); }} 
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-1 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )) : <p className="text-[10px] uppercase font-bold tracking-widest text-center p-8 text-zinc-500 opacity-40">No saved queries.</p>
              ) : (
                history.length > 0 ? history.map(h => (
                  <div key={h.id} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer mb-1 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all" onClick={() => loadQuery(h.query)}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("text-[9px] uppercase font-bold tracking-widest", h.status === 'success' ? "text-emerald-500" : "text-red-500")}>
                        {h.status}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono italic opacity-60">{h.duration}ms</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono truncate opacity-80">{h.query}</div>
                    <div className="text-[9px] text-zinc-400 mt-1 opacity-50 uppercase tracking-tight">{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                )) : <p className="text-[10px] uppercase font-bold tracking-widest text-center p-8 text-zinc-500 opacity-40">No query history.</p>
              )}
            </div>
          </div>
        )}

        {/* Main Editor & Results */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Tabs */}
          <div className="flex bg-zinc-100 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto overflow-y-hidden min-h-[40px] pt-1 px-1 transition-colors">
            {tabs.map((t) => (
              <div 
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mt-1 border border-b-0 rounded-t-lg cursor-pointer text-xs font-bold uppercase tracking-widest select-none min-w-[120px] max-w-[200px] transition-all relative group",
                  activeTabId === t.id 
                    ? "bg-white dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 z-10 before:absolute before:-bottom-px before:left-0 before:right-0 before:h-[2px] before:bg-white dark:before:bg-[#09090b]" 
                    : "bg-transparent border-transparent text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <span className="truncate flex-1 font-mono tracking-tight lowercase">{t.name}</span>
                <button 
                  onClick={(e) => closeTab(e, t.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={addTab} className="px-3 py-2 mt-1 ml-1 text-zinc-400 hover:text-emerald-500 transition">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white dark:bg-[#09090b]">
            {/* Editor Area */}
            <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 relative shadow-inner">
              <Editor
                height="100%"
                defaultLanguage="pgsql"
                value={activeTab.query}
                onChange={updateActiveQuery}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  folding: true,
                  lineNumbersMinChars: 4,
                  overviewRulerLanes: 0,
                  backgroundColor: '#09090b'
                }}
              />
            </div>

            {/* Results Area */}
            <div className="flex-1 lg:max-w-[-webkit-fill-available] lg:w-1/2 flex flex-col bg-white dark:bg-[#09090b] overflow-hidden">
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center z-10">
                <span className="flex items-center gap-2">
                  <ListFilter size={12} /> Results {rowCount !== null && <span className="text-emerald-500">({rowCount} rows)</span>}
                </span>
                {isRunning && <div className="text-emerald-500 flex items-center gap-2"><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/> Executing...</div>}
              </div>
              <div className="flex-1 overflow-auto p-0 flex flex-col bg-zinc-50/10 dark:bg-zinc-950/20">
                {errorInfo && (
                  <div className="m-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded border border-red-200 dark:border-red-900/40 text-sm flex items-start gap-3 whitespace-pre-wrap font-mono shadow-sm">
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase text-[10px] tracking-widest border-b border-red-200 dark:border-red-900/40 pb-1 mb-2">Execution Error</p>
                      <span className="text-[11px] leading-relaxed italic">{errorInfo}</span>
                    </div>
                  </div>
                )}
                
                {!results && !isRunning && !errorInfo && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-40">
                    <Play size={48} className="text-zinc-600" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] italic">Execute query to visualize dataset</p>
                  </div>
                )}
                
                {results && !isRunning && results.length > 0 && (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded mx-4 my-4 overflow-hidden bg-white dark:bg-[#09090b] shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500/80 font-bold font-sans uppercase text-[10px] tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          {(fields ? fields.map(f => f.name) : Object.keys(results[0])).map((key: string, idx: number) => (
                            <th key={idx} className="px-4 py-2 border-r border-zinc-200 dark:border-zinc-800 sticky top-0 bg-zinc-50 dark:bg-zinc-950 shadow-[0_1px_0_var(--tw-shadow-color)] shadow-zinc-200 dark:shadow-zinc-800/50">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#09090b]">
                        {results.map((row, i) => (
                          <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 font-mono text-[11px] transition-colors">
                            {(fields ? fields.map(f => f.name) : Object.keys(row)).map((key: string, j: number) => {
                              const val = row[key];
                              return (
                                <td key={j} className="px-4 py-2 border-r border-zinc-100 dark:border-zinc-800/50">
                                  {val === null || val === undefined ? (
                                    <span className="text-zinc-400 italic opacity-50">null</span>
                                  ) : typeof val === 'boolean' ? (
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", val ? "text-emerald-500 bg-emerald-500/10 px-1 rounded" : "text-amber-500 bg-amber-500/10 px-1 rounded")}>{val ? 'true' : 'false'}</span>
                                  ) : typeof val === 'object' ? (
                                    <span className="text-zinc-500 opacity-80">{JSON.stringify(val)}</span>
                                  ) : (
                                    <span className="tracking-tight">{String(val)}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {results && !isRunning && results.length === 0 && (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] italic font-mono opacity-50">
                    Query sequence terminated: 0 nodes affected
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

