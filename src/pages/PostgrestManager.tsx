import React, { useState, useEffect } from 'react';
import { Globe, Key, FileJson, Server, Play, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDatabaseStore } from '../store';

export function PostgrestManager() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [activeTab, setActiveTab] = useState<'config' | 'endpoints' | 'jwt'>('config');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [isTogglingPermission, setIsTogglingPermission] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [token, setToken] = useState<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX3VzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJleHAiOjE3MTU0OTg4Mzd9.xxxx_signature_placeholder_xxxx');
  const [jwtPayload, setJwtPayload] = useState(JSON.stringify({ role: "web_user", email: "test@example.com" }, null, 2));

  useEffect(() => {
    if (isConnected && connectionString) {
      const fetchSchemaAndGrants = async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/db/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              connectionString,
              query: `
                SELECT t.table_name, 
                       EXISTS (
                           SELECT 1 FROM information_schema.role_table_grants g 
                           WHERE g.table_name = t.table_name 
                             AND g.table_schema = 'public' 
                             AND g.grantee IN ('web_anon', 'anon', 'PUBLIC')
                       ) as exposed
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name;
              `
            })
          });
          const data = await res.json();
          if (data.success) {
            const mapped = data.rows.map((row: any) => ({
                path: `/${row.table_name}`,
                name: row.table_name,
                type: 'table',
                methods: ['GET', 'POST', 'PATCH', 'DELETE'],
                exposed: row.exposed
            }));
            mapped.push({
                path: '/rpc/get_revenue',
                name: 'get_revenue',
                type: 'function',
                methods: ['POST'],
                exposed: false
            });
            setEndpoints(mapped);
          }
        } catch (err) {
          console.error('Error fetching endpoints:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSchemaAndGrants();
    } else {
      setEndpoints([]);
    }
  }, [isConnected, connectionString]);

  const handleTogglePermission = async (endpoint: any) => {
    if (endpoint.type !== 'table') {
        alert("Cannot toggle function permissions in this demo.");
        return;
    }
    
    setIsTogglingPermission(endpoint.name);
    try {
        await fetch('/api/db/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionString,
                query: `
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
                            CREATE ROLE web_anon NOLOGIN;
                        END IF;
                    END
                    $$;
                `
            })
        });

        const query = endpoint.exposed 
            ? `REVOKE ALL ON "${endpoint.name}" FROM web_anon, anon, PUBLIC;`
            : `GRANT SELECT, INSERT, UPDATE, DELETE ON "${endpoint.name}" TO web_anon;`;
            
        const res = await fetch('/api/db/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionString, query })
        });
        
        const data = await res.json();
        if (data.success) {
            setEndpoints(prev => prev.map(e => e.name === endpoint.name ? { ...e, exposed: !endpoint.exposed } : e));
        } else {
            console.error("Failed to update permission", data.error);
            alert("Failed to update permission: " + data.error);
        }
    } catch (err: any) {
        console.error(err);
        alert("Error updating permission");
    } finally {
        setIsTogglingPermission(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestart = () => {
    setIsRestarting(true);
    setTimeout(() => setIsRestarting(false), 1500);
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const generateToken = () => {
    try {
      const payload = JSON.parse(jwtPayload);
      // In a real app we would send this to the backend to sign with the secret
      // For this demo, we'll just base64 encode it to look functional
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }));
      setToken(`${header}.${body}.signed_by_postgrest_manager`);
    } catch (e) {
      alert('Invalid JSON payload');
    }
  };



  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Globe className="text-emerald-500" /> PostgREST API Manager
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">Manage PostgREST configuration, exposed endpoints, and authentication.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleRestart}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-sm font-sans",
              isRestarting && "opacity-75 cursor-not-allowed"
            )} 
            disabled={!isConnected || isRestarting}
          >
            <Play size={16} className={isRestarting ? 'animate-pulse' : ''} /> 
            {isRestarting ? 'Restarting...' : 'Restart Server'}
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-bold text-sm uppercase tracking-widest font-sans">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to manage the PostgREST server.</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-4 pt-2 gap-4">
          <button 
            onClick={() => setActiveTab('config')}
            className={cn(
              "px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition flex items-center gap-2",
              activeTab === 'config' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            )}
          >
            <Server size={16} /> Configuration
          </button>
          <button 
            onClick={() => setActiveTab('endpoints')}
            className={cn(
               "px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition flex items-center gap-2",
               activeTab === 'endpoints' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            )}
          >
            <FileJson size={16} /> API Endpoints
          </button>
          <button 
            onClick={() => setActiveTab('jwt')}
            className={cn(
               "px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition flex items-center gap-2",
               activeTab === 'jwt' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            )}
          >
            <Key size={16} /> JWT Generator
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">Database URI (db-uri)</label>
                  <input type="text" readOnly value={isConnected ? connectionString || '' : ''} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">Exposed Schemas (db-schema)</label>
                  <input type="text" defaultValue="public" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">Anonymous Role (db-anon-role)</label>
                  <input type="text" defaultValue="anon" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">JWT Secret (jwt-secret)</label>
                  <div className="relative">
                    <input type="password" defaultValue="SUPER_SECRET_KEY_REPLACE_ME" className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">Pre-request Function (pre-request)</label>
                  <input type="text" defaultValue="auth.check_user" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 font-sans italic opacity-70">Max Rows</label>
                  <input type="number" defaultValue={2000} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm" />
                </div>
              </div>
              <div className="flex justify-end mt-4 items-center gap-4">
                {saveSuccess && <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest animate-fade-in flex items-center gap-1.5"><CheckCircle2 size={14}/> Config saved successfully</span>}
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-emerald-50/10 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex gap-3">
                  <Globe className="text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-emerald-100 text-[10px] uppercase tracking-widest font-sans">OpenAPI Documentation</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5 font-sans">PostgREST automatically generates swagger documentation for your schema.</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-widest rounded shadow-sm hover:opacity-80 transition">View Swagger UI</button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/20 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 font-sans">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Endpoint</th>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Type</th>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Allowed Methods</th>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-zinc-800 dark:text-zinc-200 font-mono">
                    {isLoading ? (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-zinc-500 italic text-xs uppercase font-bold tracking-widest opacity-40">Discovering endpoints...</td></tr>
                    ) : endpoints.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-zinc-500 italic text-xs uppercase font-bold tracking-widest opacity-40">No available endpoints in current scope.</td></tr>
                    ) : (
                      endpoints.map((endpoint, i) => (
                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{endpoint.path}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs italic">{endpoint.type === 'function' ? 'RPC Function' : 'Table / View'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap font-sans">
                              {endpoint.methods.map(m => (
                                <span key={m} className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border",
                                  m === 'GET' ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" :
                                  m === 'POST' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50" :
                                  m === 'PATCH' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50" :
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200/50 dark:border-red-800/50"
                                )}>{m}</span>
                              ))}
                              {endpoint.methods.length === 0 && <span className="text-zinc-400 italic text-[10px] opacity-40 uppercase tracking-widest">Disconnected</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleTogglePermission(endpoint)}
                              disabled={isTogglingPermission === endpoint.name}
                              className={cn(
                                "inline-flex items-center justify-center min-w-[90px] gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-all font-sans",
                                endpoint.exposed 
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                                isTogglingPermission === endpoint.name && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              {isTogglingPermission === endpoint.name ? (
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              ) : endpoint.exposed ? (
                                <CheckCircle2 size={13}/>
                              ) : (
                                <AlertCircle size={13}/>
                              )}
                              {endpoint.exposed ? 'Published' : 'Private'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jwt' && (
            <div className="space-y-6 max-w-2xl font-sans">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                  Generate timed JWT tokens to test your PostgREST endpoints. This automatically signs the payload using your configured <code className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1 rounded text-emerald-500">jwt-secret</code>.
                </p>
                <div className="space-y-5 border border-zinc-200 dark:border-zinc-700 p-6 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 shadow-inner">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 italic opacity-70">Role ID</label>
                    <input type="text" defaultValue="web_user" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 italic opacity-70">Security Claims (JSON)</label>
                    <textarea 
                      rows={4} 
                      value={jwtPayload}
                      onChange={(e) => setJwtPayload(e.target.value)}
                      className="w-full font-mono text-sm px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white resize-none focus:ring-1 focus:ring-emerald-500 outline-none" 
                    />
                  </div>
                  <button 
                    onClick={generateToken}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition w-full shadow-md"
                  >
                    Generate Session Token
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-400 mb-1.5 italic opacity-70">
                  Signed Bearer Authorization Header
                  <button onClick={() => handleCopy(token)} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 group transition-colors">
                    {copied ? <CheckCircle2 size={13}/> : <Copy size={13} className="group-hover:scale-110 transition-transform"/>}
                    {copied ? 'Copied to clipboard' : 'Copy string'}
                  </button>
                </label>
                <textarea readOnly rows={4} value={token} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono text-[11px] resize-none opacity-80" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
