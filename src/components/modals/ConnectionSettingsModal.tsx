import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Link, Server, Plus, Trash2, Database, Bookmark } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDatabaseStore, ConnectionProfile } from '../../store';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionSettingsModal({ isOpen, onClose }: ConnectionSettingsModalProps) {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [mode, setMode] = useState<'uri' | 'manual'>('manual');
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const { profiles, addProfile, updateProfile, removeProfile, setActiveProfile, activeProfileId, isConnected, setIsConnected } = useDatabaseStore();
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // New Profile fields
  const [profileName, setProfileName] = useState('');
  
  // Manual fields
  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sslMode, setSslMode] = useState('disable');

  // URI field
  const [uri, setUri] = useState('');

  const resetForm = () => {
    setProfileName('');
    setHost('');
    setPort('5432');
    setDatabase('');
    setUsername('');
    setPassword('');
    setSslMode('disable');
    setUri('');
    setEditingProfileId(null);
  };

  const handleEdit = (p: ConnectionProfile) => {
    setEditingProfileId(p.id);
    setProfileName(p.name);
    
    // Simplistic parsing - might not work for complex URIs
    if (p.connectionString.startsWith('postgresql://')) {
      // Need a way to reliably parse this
      setUri(p.connectionString);
      setMode('uri');
    } else {
      setUri(p.connectionString); // fallback
      setMode('uri');
    }
    setView('new');
  };

  useEffect(() => {
    if (isOpen) {
      if (profiles.length === 0) {
        setView('new');
        resetForm();
      } else {
        setView('list');
        resetForm();
      }
    }
  }, [isOpen]); 

  const handleConnectProfile = async (profile: ConnectionProfile) => {
    setIsConnecting(true);
    setStatus(null);
    try {
      const response = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: profile.connectionString }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ type: 'success', message: 'Connected to ' + profile.name });
        setActiveProfile(profile.id);
        setIsConnected(true);
        setTimeout(() => { onClose() }, 1000);
      } else {
        setStatus({ type: 'error', message: data.error });
        setIsConnected(false);
      }
    } catch (e) {
      setStatus({ type: 'error', message: 'Network error' });
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsConnecting(true);
    setStatus(null);

    let connectionString = '';
    if (mode === 'uri') {
      connectionString = uri;
    } else {
      connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
    }

    try {
      const response = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString }),
      });

      const data = await response.json();

      if (data.success) {
        if (editingProfileId) {
          updateProfile(editingProfileId, { name: profileName || 'Updated Profile', connectionString });
          setStatus({ type: 'success', message: 'Profile updated' });
        } else {
          addProfile({ name: profileName || database || 'New Profile', connectionString });
          setStatus({ type: 'success', message: 'Profile added' });
        }
        
        setTimeout(() => {
          setView('list');
          setStatus(null);
          resetForm();
        }, 1500);
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error or server unavailable' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connection Manager"
      className="max-w-2xl"
      footer={
        view === 'new' ? (
          <>
            <button 
              onClick={() => profiles.length > 0 ? setView('list') : onClose()} 
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveAndConnect} 
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-75 flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                'Test & Save Profile'
              )}
            </button>
          </>
        ) : (
          <div className="w-full justify-between items-center flex">
             <div>
                {status && (
                  <div className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium border animate-in fade-in",
                    status.type === 'success' 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" 
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  )}>
                    {status.message}
                  </div>
                )}
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={onClose} 
                  disabled={isConnecting}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700"
                >
                  Close
                </button>
             </div>
          </div>
        )
      }
    >
      <div className="space-y-6">
        
        {view === 'list' && (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-800 dark:text-white">Saved Connections</h3>
                <button
                   onClick={() => setView('new')}
                   className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition"
                >
                   <Plus size={16} /> Add New
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profiles.map(p => (
                   <div key={p.id} className={cn(
                      "p-4 rounded-xl border flex flex-col gap-3 transition-colors",
                      activeProfileId === p.id 
                         ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-500/50" 
                         : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                   )}>
                      <div className="flex items-start justify-between">
                         <div className="flex items-center gap-2">
                            <div className={cn(
                               "p-2 rounded-lg",
                               activeProfileId === p.id ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                            )}>
                               <Database size={18} />
                            </div>
                            <div>
                               <h4 className="font-semibold text-zinc-800 dark:text-white text-sm">{p.name}</h4>
                               {activeProfileId === p.id && isConnected && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Connected</span>}
                            </div>
                         </div>
                         <div className="flex items-center gap-1">
                            <button 
                               onClick={() => handleEdit(p)}
                               className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition text-xs font-medium"
                            >
                               Edit
                            </button>
                            <button 
                               onClick={() => removeProfile(p.id)}
                               className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                      </div>
                      <button 
                         onClick={() => handleConnectProfile(p)}
                         disabled={isConnecting}
                         className={cn(
                            "w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
                            activeProfileId === p.id && isConnected
                               ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default"
                               : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                         )}
                      >
                         {activeProfileId === p.id && isConnected ? 'Active Connection' : 'Connect'}
                      </button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {view === 'new' && (
           <div className="space-y-6">
              {status && view === 'new' && (
                <div className={cn(
                  "p-3 rounded-lg text-sm font-medium border animate-in fade-in slide-in-from-top-2",
                  status.type === 'success' 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400" 
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400"
                )}>
                  {status.message}
                </div>
              )}

              <div>
                 <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5"><Bookmark size={14}/> Profile Name</label>
                 <input 
                   type="text" 
                   value={profileName}
                   onChange={(e) => setProfileName(e.target.value)}
                   placeholder="e.g. Production Database" 
                   className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                 />
              </div>

              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                <button
                  onClick={() => setMode('manual')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition",
                    mode === 'manual' 
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow" 
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Server size={16} /> Standard parameters
                </button>
                <button
                  onClick={() => setMode('uri')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition",
                    mode === 'uri' 
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow" 
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Link size={16} /> Connection URI
                </button>
              </div>

              {mode === 'manual' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Host</label>
                      <input 
                        type="text" 
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        placeholder="localhost" 
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Port</label>
                      <input 
                        type="number" 
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        placeholder="5432" 
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Database</label>
                    <input 
                      type="text" 
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      placeholder="postgres" 
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="postgres" 
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">SSL Mode</label>
                    <select 
                      value={sslMode}
                      onChange={(e) => setSslMode(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="disable">disable</option>
                      <option value="allow">allow</option>
                      <option value="prefer">prefer</option>
                      <option value="require">require</option>
                      <option value="verify-ca">verify-ca</option>
                      <option value="verify-full">verify-full</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">PostgreSQL URI</label>
                    <textarea 
                      rows={3}
                      value={uri}
                      onChange={(e) => setUri(e.target.value)}
                      placeholder="postgresql://user:password@localhost:5432/dbname?sslmode=disable" 
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Format: <code>postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]</code>
                    </p>
                  </div>
                </div>
              )}
           </div>
        )}
      </div>
    </Modal>
  );
}
