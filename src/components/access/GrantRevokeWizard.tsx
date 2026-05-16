import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store';
import { Shield, ChevronRight, Check, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TargetType = 
  | 'DATABASE' 
  | 'SCHEMA' 
  | 'TABLE' 
  | 'ALL_TABLES' 
  | 'ALL_SEQUENCES' 
  | 'ALL_FUNCTIONS' 
  | 'DEFAULT_TABLES' 
  | 'DEFAULT_SEQUENCES' 
  | 'DEFAULT_FUNCTIONS';

const PrivilegesMap: Record<TargetType, string[]> = {
  'DATABASE': ['CONNECT', 'CREATE', 'TEMPORARY', 'ALL PRIVILEGES'],
  'SCHEMA': ['USAGE', 'CREATE', 'ALL PRIVILEGES'],
  'TABLE': ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'ALL PRIVILEGES'],
  'ALL_TABLES': ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'ALL PRIVILEGES'],
  'ALL_SEQUENCES': ['USAGE', 'SELECT', 'UPDATE', 'ALL PRIVILEGES'],
  'ALL_FUNCTIONS': ['EXECUTE', 'ALL PRIVILEGES'],
  'DEFAULT_TABLES': ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'ALL PRIVILEGES'],
  'DEFAULT_SEQUENCES': ['USAGE', 'SELECT', 'UPDATE', 'ALL PRIVILEGES'],
  'DEFAULT_FUNCTIONS': ['EXECUTE', 'ALL PRIVILEGES'],
};

export function GrantRevokeWizard() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [step, setStep] = useState(1);
  const [action, setAction] = useState<'GRANT' | 'REVOKE'>('GRANT');
  
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  const [targetType, setTargetType] = useState<TargetType>('TABLE');
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<{schema: string, name: string}[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [withGrantOption, setWithGrantOption] = useState(false);

  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    if (isConnected && connectionString) {
      fetchData();
    }
  }, [isConnected, connectionString]);

  useEffect(() => {
    // Reset selected targets and privileges when targetType changes
    setSelectedTargets([]);
    setPrivileges([]);
  }, [targetType]);

  const fetchData = async () => {
    try {
      const dbRes = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query: `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;` })
      });
      const dbData = await dbRes.json();
      if (dbData.success) setDatabases(dbData.rows.map((r: any) => r.datname));

      const schemaRes = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query: `SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname != 'information_schema' ORDER BY nspname;` })
      });
      const schemaData = await schemaRes.json();
      if (schemaData.success) setSchemas(schemaData.rows.map((r: any) => r.nspname));

      const roleRes = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query: `SELECT rolname FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY rolname;` })
      });
      const roleData = await roleRes.json();
      if (roleData.success) setRoles(roleData.rows.map((r: any) => r.rolname));

      const tableRes = await fetch('/api/db/query', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ connectionString, query: `SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;` })
      });
      const tableData = await tableRes.json();
      if (tableData.success) setTables(tableData.rows.map((r: any) => ({ schema: r.schemaname, name: r.tablename })));
    } catch (e) {
      console.error('Failed to fetch data for wizard', e);
    }
  };

  const getGeneratedSql = () => {
    if (selectedRoles.length === 0 || selectedTargets.length === 0 || privileges.length === 0) return '';
    
    const privs = privileges.includes('ALL PRIVILEGES') ? 'ALL PRIVILEGES' : privileges.join(', ');
    const grantees = selectedRoles.map(r => `"${r}"`).join(', ');

    const stmts: string[] = [];

    const getTargetsStr = () => {
      if (targetType === 'TABLE') {
        return selectedTargets.map(t => {
          const [s, n] = t.split('.');
          return `"${s}"."${n}"`;
        }).join(', ');
      }
      return selectedTargets.map(t => `"${t}"`).join(', ');
    };

    if (action === 'GRANT') {
      const grantOpt = withGrantOption ? ' WITH GRANT OPTION' : '';
      
      if (targetType === 'DATABASE') {
        selectedTargets.forEach(t => stmts.push(`GRANT ${privs} ON DATABASE "${t}" TO ${grantees}${grantOpt};`));
      } else if (targetType === 'SCHEMA') {
        selectedTargets.forEach(t => stmts.push(`GRANT ${privs} ON SCHEMA "${t}" TO ${grantees}${grantOpt};`));
      } else if (targetType === 'TABLE') {
        stmts.push(`GRANT ${privs} ON TABLE ${getTargetsStr()} TO ${grantees}${grantOpt};`);
      } else if (targetType === 'ALL_TABLES') {
        selectedTargets.forEach(t => stmts.push(`GRANT ${privs} ON ALL TABLES IN SCHEMA "${t}" TO ${grantees}${grantOpt};`));
      } else if (targetType === 'ALL_SEQUENCES') {
        selectedTargets.forEach(t => stmts.push(`GRANT ${privs} ON ALL SEQUENCES IN SCHEMA "${t}" TO ${grantees}${grantOpt};`));
      } else if (targetType === 'ALL_FUNCTIONS') {
        selectedTargets.forEach(t => stmts.push(`GRANT ${privs} ON ALL FUNCTIONS IN SCHEMA "${t}" TO ${grantees}${grantOpt};`));
      } else if (targetType === 'DEFAULT_TABLES') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" GRANT ${privs} ON TABLES TO ${grantees}${grantOpt};`));
      } else if (targetType === 'DEFAULT_SEQUENCES') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" GRANT ${privs} ON SEQUENCES TO ${grantees}${grantOpt};`));
      } else if (targetType === 'DEFAULT_FUNCTIONS') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" GRANT ${privs} ON FUNCTIONS TO ${grantees}${grantOpt};`));
      }
    } else {
      const grantOpt = withGrantOption ? 'GRANT OPTION FOR ' : '';
      
      if (targetType === 'DATABASE') {
        selectedTargets.forEach(t => stmts.push(`REVOKE ${grantOpt}${privs} ON DATABASE "${t}" FROM ${grantees};`));
      } else if (targetType === 'SCHEMA') {
        selectedTargets.forEach(t => stmts.push(`REVOKE ${grantOpt}${privs} ON SCHEMA "${t}" FROM ${grantees};`));
      } else if (targetType === 'TABLE') {
        stmts.push(`REVOKE ${grantOpt}${privs} ON TABLE ${getTargetsStr()} FROM ${grantees};`);
      } else if (targetType === 'ALL_TABLES') {
        selectedTargets.forEach(t => stmts.push(`REVOKE ${grantOpt}${privs} ON ALL TABLES IN SCHEMA "${t}" FROM ${grantees};`));
      } else if (targetType === 'ALL_SEQUENCES') {
        selectedTargets.forEach(t => stmts.push(`REVOKE ${grantOpt}${privs} ON ALL SEQUENCES IN SCHEMA "${t}" FROM ${grantees};`));
      } else if (targetType === 'ALL_FUNCTIONS') {
        selectedTargets.forEach(t => stmts.push(`REVOKE ${grantOpt}${privs} ON ALL FUNCTIONS IN SCHEMA "${t}" FROM ${grantees};`));
      } else if (targetType === 'DEFAULT_TABLES') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" REVOKE ${grantOpt}${privs} ON TABLES FROM ${grantees};`));
      } else if (targetType === 'DEFAULT_SEQUENCES') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" REVOKE ${grantOpt}${privs} ON SEQUENCES FROM ${grantees};`));
      } else if (targetType === 'DEFAULT_FUNCTIONS') {
        selectedTargets.forEach(t => stmts.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${t}" REVOKE ${grantOpt}${privs} ON FUNCTIONS FROM ${grantees};`));
      }
    }

    return stmts.join('\n');
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
          setSelectedTargets([]);
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

  const toggleTarget = (target: string) => {
    setSelectedTargets(prev => prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]);
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

  const renderTargetOptions = () => {
    let options: string[] = [];
    if (targetType === 'DATABASE') options = databases;
    else if (targetType === 'SCHEMA' || targetType.startsWith('ALL_') || targetType.startsWith('DEFAULT_')) options = schemas;
    else if (targetType === 'TABLE') options = tables.map(t => `${t.schema}.${t.name}`);

    if (options.length === 0) return <span className="text-sm text-zinc-500 italic mt-2 block">No targets available.</span>;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 mt-4">
        {options.map(id => (
          <button
            key={id}
            onClick={() => toggleTarget(id)}
            className={cn(
              "px-3 py-2 text-left border rounded-lg text-xs font-mono transition overflow-hidden text-ellipsis whitespace-nowrap title tracking-tight",
              selectedTargets.includes(id) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold" : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
            )}
            title={id}
          >
            {targetType === 'TABLE' ? (
               <><span className="opacity-50 text-[10px]">{id.split('.')[0]}.</span>{id.split('.')[1]}</>
            ) : id}
          </button>
        ))}
      </div>
    );
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
               <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0", step >= s ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500")}>
                  {step > s ? <Check size={12} /> : s}
               </div>
               <span className={cn("ml-2 text-sm font-medium", step >= s ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500")}>
                  {s === 1 ? 'Roles' : s === 2 ? 'Objects' : 'Privileges'}
               </span>
               {s < 3 && <div className="mx-4 flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>}
            </div>
         ))}
      </div>

      <div className="p-6 min-h-[360px]">
        {step === 1 && (
           <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Roles (Grantees)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {roles.length === 0 && <span className="text-sm text-zinc-500 italic">No roles available.</span>}
                 {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Target Objects</h4>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <Layers size={14} className="text-zinc-400 ml-1" />
                  <select 
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as TargetType)}
                    className="bg-transparent border-none text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:ring-0 py-1 pl-1 pr-6"
                  >
                    <option value="DATABASE">Databases</option>
                    <option value="SCHEMA">Schemas</option>
                    <option value="TABLE">Specific Tables/Views</option>
                    <optgroup label="All Objects in Schema">
                      <option value="ALL_TABLES">All Tables in Schema</option>
                      <option value="ALL_SEQUENCES">All Sequences in Schema</option>
                      <option value="ALL_FUNCTIONS">All Functions in Schema</option>
                    </optgroup>
                    <optgroup label="Default Privileges (Future Objects)">
                      <option value="DEFAULT_TABLES">Default Privileges (Tables)</option>
                      <option value="DEFAULT_SEQUENCES">Default Privileges (Sequences)</option>
                      <option value="DEFAULT_FUNCTIONS">Default Privileges (Functions)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              
              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-md p-3 text-sm text-emerald-800 dark:text-emerald-300/80">
                 {targetType === 'DATABASE' && 'Grant/Revoke access at the Database level (e.g. CONNECT privileges).'}
                 {targetType === 'SCHEMA' && 'Grant/Revoke access to the Schema itself (e.g. USAGE, CREATE).'}
                 {targetType === 'TABLE' && 'Grant/Revoke access to specific individual tables.'}
                 {targetType.startsWith('ALL_') && 'Grant/Revoke access to all current objects of this type within the selected schema(s).'}
                 {targetType.startsWith('DEFAULT_') && 'Alter Default Privileges so subsequently created objects automatically have these permissions.'}
              </div>

              {renderTargetOptions()}
           </div>
        )}

        {step === 3 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Select Privileges</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {PrivilegesMap[targetType].map(p => (
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
                 <code className="text-[11px] leading-relaxed text-emerald-400 whitespace-pre-wrap font-mono block">
                    {getGeneratedSql() || '-- Complete selections to preview SQL'}
                 </code>
              </div>

              {result && (
                 <div className={cn("p-3 rounded text-sm font-medium", result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400")}>
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
              disabled={(step === 1 && selectedRoles.length === 0) || (step === 2 && selectedTargets.length === 0)}
            >
              Next <ChevronRight size={16} />
            </button>
         ) : (
            <button 
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
               onClick={handleExecute}
               disabled={!getGeneratedSql() || privileges.length === 0 || isExecuting}
            >
               {isExecuting ? 'Executing...' : 'Execute Statement'}
            </button>
         )}
      </div>
    </div>
  );
}

