import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { Lock, FileEdit, Trash2, Plus, ShieldCheck, ToggleLeft, ToggleRight, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../modals/ConfirmModal';

interface Policy {
  policyname: string;
  tablename: string;
  roles: string[] | string;
  cmd: string;
  qual: string;
  with_check: string;
}

export function RlsPolicyManager() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [tables, setTables] = useState<{name: string, rls_enabled: boolean}[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPolicyEditorOpen, setIsPolicyEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  
  // Editor state
  const [pName, setPName] = useState('');
  const [pCmd, setPCmd] = useState('ALL');
  const [pRoles, setPRoles] = useState('PUBLIC');
  const [pQual, setPQual] = useState('');
  const [pWithCheck, setPWithCheck] = useState('');

  const [confirmDrop, setConfirmDrop] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && connectionString) {
      fetchTables();
    }
  }, [isConnected, connectionString]);

  useEffect(() => {
    if (selectedTable) {
      fetchPolicies(selectedTable);
    } else {
      setPolicies([]);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT 
              c.relname as table_name,
              c.relrowsecurity as rls_enabled
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r' AND n.nspname = 'public'
            ORDER BY c.relname;
          `
        })
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.rows.map((r: any) => ({ name: r.table_name, rls_enabled: r.rls_enabled })));
        if (data.rows.length > 0 && !selectedTable) {
          setSelectedTable(data.rows[0].table_name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPolicies = async (tableName: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `
            SELECT 
              pol.polname as policyname,
              c.relname as tablename,
              CASE pol.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
              END as cmd,
              pg_get_expr(pol.polqual, pol.polrelid) as qual,
              pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
              ARRAY(
                SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)
              ) as roles
            FROM pg_policy pol
            JOIN pg_class c ON c.oid = pol.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = $1;
          `,
          values: [tableName]
        })
      });
      const data = await res.json();
      if (data.success) {
        setPolicies(data.rows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRls = async (tableName: string, currentlyEnabled: boolean) => {
    try {
      const action = currentlyEnabled ? 'DISABLE' : 'ENABLE';
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `ALTER TABLE "${tableName}" ${action} ROW LEVEL SECURITY;`
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTables(); // Refresh table list to get updated RLS status
      } else {
         setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const executeSql = async (sql: string) => {
    try {
      setError(null);
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query: sql })
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTable) fetchPolicies(selectedTable);
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedTable || !pName) return;
    
    let sql = '';
    const qualClause = pQual ? ` USING (${pQual})` : '';
    const checkClause = pWithCheck ? ` WITH CHECK (${pWithCheck})` : '';
    
    if (editingPolicy) {
      // Alter Policy: PostgreSQL supports ALTER POLICY, but you can only alter roles, conditionally qual/with check.
      // Often easier to DROP and CREATE. For simplicity, we just provide explicit ALTER commands or do drop/create.
      // We will try ALTER POLICY, but actually ALTER POLICY syntax:
      // ALTER POLICY name ON table_name TO roles USING (qual) WITH CHECK (check)
      sql = `ALTER POLICY "${pName}" ON "${selectedTable}" TO ${pRoles || 'PUBLIC'}${qualClause}${checkClause};`;
    } else {
      sql = `CREATE POLICY "${pName}" ON "${selectedTable}" FOR ${pCmd} TO ${pRoles || 'PUBLIC'}${qualClause}${checkClause};`;
    }

    const ok = await executeSql(sql);
    if (ok) {
       setIsPolicyEditorOpen(false);
       setEditingPolicy(null);
    }
  };

  const handleDropPolicy = async () => {
     if (!selectedTable || !confirmDrop) return;
     const sql = `DROP POLICY "${confirmDrop}" ON "${selectedTable}";`;
     const ok = await executeSql(sql);
     if (ok) {
        setConfirmDrop(null);
     }
  };

  const openEditor = (policy?: Policy) => {
     if (policy) {
        setEditingPolicy(policy);
        setPName(policy.policyname);
        setPCmd(policy.cmd);
        setPRoles(policy.roles ? (Array.isArray(policy.roles) ? policy.roles.join(', ') : typeof policy.roles === 'string' ? policy.roles.replace(/^{|}$/g, '').replace(/,/g, ', ') : 'PUBLIC') : 'PUBLIC');
        setPQual(policy.qual || '');
        setPWithCheck(policy.with_check || '');
     } else {
        setEditingPolicy(null);
        setPName('');
        setPCmd('ALL');
        setPRoles('PUBLIC');
        setPQual('');
        setPWithCheck('');
     }
     setIsPolicyEditorOpen(true);
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px] text-zinc-900 dark:text-zinc-100">
      
      {/* Sidebar: Tables */}
      <div className="w-full md:w-64 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col h-full">
         <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-800 dark:text-white flex items-center gap-2">
               <ShieldCheck size={18} className="text-emerald-500" /> RLS Manager
            </h3>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tables.map(t => (
               <button
                 key={t.name}
                 onClick={() => setSelectedTable(t.name)}
                 className={cn(
                   "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition",
                   selectedTable === t.name ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                 )}
               >
                 <span className="truncate pr-2 font-mono">{t.name}</span>
                 {t.rls_enabled ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="RLS Enabled" />
                 ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" title="RLS Disabled" />
                 )}
               </button>
            ))}
         </div>
      </div>

      {/* Main content: Policies */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-800 overflow-hidden relative">
         {selectedTable ? (
            <>
               <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                     <h2 className="text-xl font-bold text-zinc-900 dark:text-white truncate font-mono tracking-tight uppercase">Policies for "{selectedTable}"</h2>
                     <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
                        Row Level Security is currently: 
                        <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px] tracking-widest", tables.find(t=>t.name === selectedTable)?.rls_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400")}>
                           {tables.find(t=>t.name === selectedTable)?.rls_enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                     </p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => {
                           const t = tables.find(t=>t.name === selectedTable);
                           if (t) toggleRls(t.name, t.rls_enabled);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                     >
                        {tables.find(t=>t.name === selectedTable)?.rls_enabled ? 'Disable RLS' : 'Enable RLS'}
                     </button>
                     <button
                        onClick={() => openEditor()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                     >
                        <Plus size={16} /> New Policy
                     </button>
                  </div>
               </div>

               {error && (
                 <div className="m-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-200 dark:border-red-800/50">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div className="font-mono text-xs">{error}</div>
                 </div>
               )}

               <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                  {isLoading ? (
                     <div className="flex justify-center items-center h-full text-zinc-400"><RefreshCw size={24} className="animate-spin" /></div>
                  ) : policies.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                        <Lock size={48} className="opacity-20" />
                        <p className="font-sans">No policies defined for this table.</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {policies.map(pol => (
                           <div key={pol.policyname} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <h4 className="font-bold text-zinc-800 dark:text-white text-base font-mono">{pol.policyname}</h4>
                                    <div className="flex gap-2 mt-2">
                                       <span className="text-[10px] font-bold uppercase tracking-widest font-mono bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">FOR {pol.cmd}</span>
                                       <span className="text-[10px] font-bold uppercase tracking-widest font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50">TO {pol.roles ? (Array.isArray(pol.roles) ? pol.roles.join(', ') : typeof pol.roles === 'string' ? pol.roles.replace(/^{|}$/g, '').replace(/,/g, ', ') : 'PUBLIC') : 'PUBLIC'}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button onClick={() => openEditor(pol)} className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded bg-zinc-50 dark:bg-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                                       <FileEdit size={16} />
                                    </button>
                                    <button onClick={() => setConfirmDrop(pol.policyname)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded bg-zinc-50 dark:bg-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </div>
                              <div className="space-y-2 mt-4 bg-[#09090b] p-3 rounded-lg border border-zinc-800">
                                 {pol.qual && (
                                    <div>
                                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">USING</span>
                                       <code className="text-sm font-mono text-emerald-400">{pol.qual}</code>
                                    </div>
                                 )}
                                 {pol.with_check && (
                                    <div className={pol.qual ? "pt-2 border-t border-zinc-800" : ""}>
                                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">WITH CHECK</span>
                                       <code className="text-sm font-mono text-emerald-300">{pol.with_check}</code>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </>
         ) : (
            <div className="flex items-center justify-center h-full text-zinc-400 p-8 text-center italic font-sans">
               Select a table to manage its Row Level Security policies.
            </div>
         )}

         {/* Editor Overlay Drawer */}
         {isPolicyEditorOpen && (
            <div className="absolute inset-y-0 right-0 w-full md:w-[450px] border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#09090b] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right">
               <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                  <h3 className="font-bold text-zinc-800 dark:text-white uppercase tracking-tight">
                     {editingPolicy ? 'Edit Policy' : 'New Policy'}
                  </h3>
                  <button onClick={() => setIsPolicyEditorOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-bold">✕</button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Policy Name</label>
                     <input 
                        type="text" 
                        value={pName} 
                        onChange={e => setPName(e.target.value)} 
                        disabled={!!editingPolicy}
                        placeholder="e.g. users_can_view_own_data"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 disabled:opacity-50 font-mono tracking-tight"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">FOR Command</label>
                        <select 
                           value={pCmd} onChange={e => setPCmd(e.target.value)}
                           disabled={!!editingPolicy}
                           className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
                        >
                           <option value="ALL">ALL</option>
                           <option value="SELECT">SELECT</option>
                           <option value="INSERT">INSERT</option>
                           <option value="UPDATE">UPDATE</option>
                           <option value="DELETE">DELETE</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">TO Roles</label>
                        <input 
                           type="text" 
                           value={pRoles} onChange={e => setPRoles(e.target.value)} 
                           placeholder="PUBLIC"
                           className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-emerald-500 font-mono tracking-tight"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">USING Expression (Read/Update/Delete Check)</label>
                     <textarea 
                        value={pQual} onChange={e => setPQual(e.target.value)}
                        placeholder="e.g. user_id = current_setting('request.jwt.claim.sub', true)::uuid"
                        className="w-full h-32 px-3 py-2 bg-[#09090b] font-mono border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-emerald-400 outline-none focus:border-emerald-500 shadow-inner"
                     />
                  </div>
                  {['ALL', 'INSERT', 'UPDATE'].includes(pCmd) && (
                     <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">WITH CHECK Expression (Insert/Update Attempt Check)</label>
                        <textarea 
                           value={pWithCheck} onChange={e => setPWithCheck(e.target.value)}
                           placeholder="defaults to USING expression if omitted"
                           className="w-full h-32 px-3 py-2 bg-[#09090b] font-mono border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-emerald-400 outline-none focus:border-emerald-500 shadow-inner"
                        />
                     </div>
                  )}
               </div>
               
               <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                  <button onClick={() => setIsPolicyEditorOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-sans">Cancel</button>
                  <button 
                     onClick={handleSavePolicy}
                     disabled={!pName || (!pQual && !pWithCheck)}
                     className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 font-sans"
                  >
                     Save Policy
                  </button>
               </div>
            </div>
         )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDrop}
        onCancel={() => setConfirmDrop(null)}
        title="Drop Policy"
        message={`Are you sure you want to drop the policy "${confirmDrop}"? This change will be applied immediately.`}
        confirmLabel="Drop Policy"
        onConfirm={handleDropPolicy}
      />
    </div>
  );
}
