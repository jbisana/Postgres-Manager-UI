import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { Shield, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function GrantRevokeWizard() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [step, setStep] = useState(1);
  const [action, setAction] = useState<'GRANT' | 'REVOKE'>('GRANT');
  
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  const [tables, setTables] = useState<{schema: string, name: string}[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [withGrantOption, setWithGrantOption] = useState(false);

  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  const availablePrivileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'ALL PRIVILEGES'];

  useEffect(() => {
    if (isConnected && connectionString) {
      fetchRolesAndTables();
    }
  }, [isConnected, connectionString]);

  const fetchRolesAndTables = async () => {
    try {
      const resRoles = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `SELECT rolname FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY rolname;`
        })
      });
      const dataRoles = await resRoles.json();
      if (dataRoles.success) {
        setRoles(dataRoles.rows.map((r: any) => r.rolname));
      }

      const resTables = await fetch('/api/db/query', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           connectionString,
           query: `SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;`
         })
      });
      const dataTables = await resTables.json();
      if (dataTables.success) {
         setTables(dataTables.rows.map((r: any) => ({ schema: r.schemaname, name: r.tablename })));
      }
    } catch (e) {
      console.error('Failed to fetch data for wizard', e);
    }
  };

  const getGeneratedSql = () => {
    if (selectedRoles.length === 0 || selectedTables.length === 0 || privileges.length === 0) return '';
    
    const privs = privileges.includes('ALL PRIVILEGES') ? 'ALL PRIVILEGES' : privileges.join(', ');
    const targets = selectedTables.map(t => {
      const [s, n] = t.split('.');
      return `"${s}"."${n}"`;
    }).join(', ');
    const grantees = selectedRoles.map(r => `"${r}"`).join(', ');

    if (action === 'GRANT') {
      return `GRANT ${privs} ON TABLE ${targets} TO ${grantees}${withGrantOption ? ' WITH GRANT OPTION' : ''};`;
    } else {
      return `REVOKE ${withGrantOption ? 'GRANT OPTION FOR ' : ''}${privs} ON TABLE ${targets} FROM ${grantees};`;
    }
  };

  const handleExecute = async () => {
    const sql = getGeneratedSql();
    if (!sql) return;

    setIsExecuting(true);
    setResult(null);
    try {
      const res = await fetch('/api/db/query', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ connectionString, query: sql })
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: 'Statement executed successfully.' });
        setTimeout(() => {
          setStep(1);
          setSelectedRoles([]);
          setSelectedTables([]);
          setPrivileges([]);
          setResult(null);
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || 'Execution failed.' });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };
  const toggleTable = (table: string) => {
    setSelectedTables(prev => prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]);
  };
  const togglePrivilege = (priv: string) => {
    setPrivileges(prev => {
       if (priv === 'ALL PRIVILEGES') {
          return prev.includes('ALL PRIVILEGES') ? [] : ['ALL PRIVILEGES'];
       } else {
          const newPrivs = prev.filter(p => p !== 'ALL PRIVILEGES');
          return newPrivs.includes(priv) ? newPrivs.filter(p => p !== priv) : [...newPrivs, priv];
       }
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden text-zinc-900 dark:text-zinc-100">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-zinc-800 dark:text-white flex items-center gap-2">
          <Shield size={18} className="text-emerald-500" /> GRANT / REVOKE Wizard
        </h3>
        <div className="flex bg-zinc-200 dark:bg-zinc-700 p-1 rounded-md">
           <button 
             onClick={() => setAction('GRANT')}
             className={cn("px-3 py-1 text-xs font-medium rounded shadow-sm transition", action === 'GRANT' ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200")}
           >GRANT</button>
           <button 
             onClick={() => setAction('REVOKE')}
             className={cn("px-3 py-1 text-xs font-medium rounded shadow-sm transition", action === 'REVOKE' ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200")}
           >REVOKE</button>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/20">
         {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center flex-1">
               <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", step >= s ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500")}>
                  {step > s ? <Check size={12} /> : s}
               </div>
               <span className={cn("ml-2 text-sm font-medium", step >= s ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500")}>
                  {s === 1 ? 'Roles' : s === 2 ? 'Objects' : 'Privileges'}
               </span>
               {s < 3 && <div className="mx-4 flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>}
            </div>
         ))}
      </div>

      <div className="p-6">
        {step === 1 && (
           <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Roles (Grantees)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {roles.length === 0 && <span className="text-sm text-zinc-500 italic">No roles available.</span>}
                 {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => toggleRole(r)}
                      className={cn(
                        "px-3 py-2 text-left border rounded-lg text-sm font-bold font-mono transition",
                        selectedRoles.includes(r) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                      )}
                    >
                      {r}
                    </button>
                 ))}
              </div>
           </div>
        )}

        {step === 2 && (
           <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Tables/Views</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
                 {tables.length === 0 && <span className="text-sm text-zinc-500 italic">No tables available.</span>}
                 {tables.map(t => {
                    const id = `${t.schema}.${t.name}`;
                    return (
                    <button
                      key={id}
                      onClick={() => toggleTable(id)}
                      className={cn(
                        "px-3 py-2 text-left border rounded-lg text-[10px] font-mono transition overflow-hidden text-ellipsis whitespace-nowrap title tracking-tight uppercase",
                        selectedTables.includes(id) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold" : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                      )}
                      title={id}
                    >
                      <span className="opacity-50 text-[9px]">{t.schema}.</span>{t.name}
                    </button>
                 )})}
              </div>
           </div>
        )}

        {step === 3 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Privileges</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {availablePrivileges.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePrivilege(p)}
                      className={cn(
                        "px-3 py-2 text-left border rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition",
                        privileges.includes(p) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                      )}
                    >
                      {p}
                    </button>
                 ))}
              </div>
              
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={withGrantOption} 
                   onChange={(e) => setWithGrantOption(e.target.checked)} 
                   className="rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                 />
                 <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                    {action === 'GRANT' ? 'WITH GRANT OPTION' : 'GRANT OPTION FOR'}
                 </span>
              </label>

              <div className="mt-6 p-4 bg-[#09090b] border border-zinc-800 rounded-lg">
                 <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">Preview SQL</div>
                 <code className="text-sm text-emerald-400 whitespace-pre-wrap font-mono">
                    {getGeneratedSql() || '-- Complete selections to preview SQL'}
                 </code>
              </div>

              {result && (
                 <div className={cn("p-3 rounded text-sm font-medium", result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {result.message}
                 </div>
              )}
           </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between">
         <button 
           className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
           onClick={() => setStep(s => Math.max(1, s - 1))}
           disabled={step === 1 || isExecuting}
         >
           Back
         </button>
         
         {step < 3 ? (
            <button 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
              onClick={() => setStep(s => Math.min(3, s + 1))}
              disabled={(step === 1 && selectedRoles.length === 0) || (step === 2 && selectedTables.length === 0)}
            >
              Next <ChevronRight size={16} />
            </button>
         ) : (
            <button 
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
               onClick={handleExecute}
               disabled={!getGeneratedSql() || isExecuting}
            >
               {isExecuting ? 'Executing...' : 'Execute Statement'}
            </button>
         )}
      </div>
    </div>
  );
}
