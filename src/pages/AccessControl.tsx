import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Lock, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRoleModal } from '../components/modals/UserRoleModal';
import { PermissionModal } from '../components/modals/PermissionModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useDatabaseStore } from '../store';
import { GrantRevokeWizard } from '../components/access/GrantRevokeWizard';
import { RlsPolicyManager } from '../components/access/RlsPolicyManager';

export function AccessControl() {
  const { isConnected, connectionString, availableDatabases } = useDatabaseStore();
  const [activeTab, setActiveTab] = useState<'roles' | 'wizard' | 'rls'>('roles');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUser, setIsEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isConfirmRevoke, setIsConfirmRevoke] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<string | null>(null);
  
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  
  const fetchRoles = async () => {
    if (!isConnected || !connectionString) {
      setUsers([]);
      return;
    }
    setIsLoadingRoles(true);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           connectionString,
           query: `
             SELECT 
               rolname as name,
               rolsuper as is_superuser,
               rolcanlogin as can_login,
               rolcreatedb as can_create_db,
               rolcreaterole as can_create_role,
               (
                 SELECT array_agg(d.datname)
                 FROM pg_database d
                 WHERE d.datistemplate = false 
                   AND has_database_privilege(r.rolname, d.datname, 'CONNECT')
               ) as databases
             FROM pg_roles r
             WHERE r.rolname !~ '^pg_'
             ORDER BY r.rolname;
           `
        })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.rows.map((row: any) => ({
          id: row.name,
          name: row.name,
          email: '-',
          role: row.is_superuser ? 'admin' : (row.can_create_role || row.can_create_db ? 'manager' : 'user'),
          ...row
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const fetchDatabases = async () => {
    if (!isConnected || !connectionString) return;
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `SELECT datname FROM pg_database WHERE datistemplate = false;`
        })
      });
      const data = await res.json();
      if (data.success) {
        useDatabaseStore.getState().setAvailableDatabases(data.rows.map((r: any) => r.datname));
      }
    } catch (e) {
      console.error('Failed to fetch databases', e);
    }
  };

  useEffect(() => {
    fetchRoles();
    if (availableDatabases.length === 0) {
      fetchDatabases();
    }
  }, [isConnected, connectionString]);

  const handleRevokeUser = async () => {
    if (!userToRevoke || !connectionString) return;
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          query: `DROP ROLE "${userToRevoke.replace(/"/g, '""')}"`
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to drop user (may own objects)");
      } else {
        fetchRoles();
      }
    } catch (e: any) {
      alert(e.message || "Error revoking user");
    } finally {
      setIsConfirmRevoke(false);
      setUserToRevoke(null);
    }
  };

  const permissions: any[] = []; // Not implemented in current scope

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-zinc-900 dark:text-zinc-100">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="text-emerald-500" /> Identity & Access Management
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 font-sans">Configure role-based access control (RBAC) and manage user database credentials.</p>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-medium text-sm">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to configure access control.</p>
          </div>
        </div>
      )}

      <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-lg w-full max-w-2xl">
        {[
          { id: 'roles', label: 'Roles & Users' },
          { id: 'wizard', label: 'GRANT / REVOKE Wizard' },
          { id: 'rls', label: 'Row Level Security' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'roles' | 'wizard' | 'rls')}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Users Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white font-sans">Active Users</h2>
            <button 
              onClick={() => { setSelectedUser(null); setIsEditUser(false); setIsUserModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm transition font-medium"
            >
              <UserPlus size={16} /> Add User
            </button>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Databases</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {isLoadingRoles && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">Loading roles...</td></tr>
                )}
                {!isLoadingRoles && users.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">No users available.</td></tr>
                )}
                {!isLoadingRoles && users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 text-zinc-800 dark:text-zinc-200">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold font-mono text-sm tracking-tight">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.is_superuser && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Superuser</span>}
                        {user.can_create_role && <span className="bg-emerald-100/20 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-emerald-200 dark:border-emerald-800">Create Role</span>}
                        {user.can_create_db && <span className="bg-emerald-100/20 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-emerald-200 dark:border-emerald-800">Create DB</span>}
                        {!user.is_superuser && !user.can_create_role && !user.can_create_db && <span className="text-zinc-400 italic text-xs">Standard Role</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs">
                      {(Array.isArray(user.databases) ? user.databases : typeof user.databases === 'string' ? user.databases.replace(/^{|}$/g, '').split(',').filter(Boolean) : []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(user.databases) ? user.databases : typeof user.databases === 'string' ? user.databases.replace(/^{|}$/g, '').split(',').filter(Boolean) : []).map((db: string) => (
                            <span key={db} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-xs font-mono border border-zinc-200 dark:border-zinc-700">{db}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.can_login ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Can Login
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                          <Lock size={12} /> NOLOGIN
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 flex justify-end gap-2 text-zinc-500">
                       <button 
                         onClick={() => { setSelectedUser(user); setIsEditUser(true); setIsUserModalOpen(true); }}
                         className="p-1.5 hover:text-emerald-600 transition rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20" 
                         title="Edit Access"
                       >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => { setUserToRevoke(user.name); setIsConfirmRevoke(true); }}
                        className="p-1.5 hover:text-red-600 transition rounded hover:bg-red-50 dark:hover:bg-red-900/20" 
                        title="Revoke / Drop User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white font-sans">Role Permissions</h2>
            <button 
              onClick={() => setIsPermissionModalOpen(true)}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Manage Roles
            </button>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-sm space-y-4">
            {permissions.length === 0 && (
              <div className="p-4 text-center text-zinc-500 italic text-sm">No permissions available.</div>
            )}
            {permissions.map(perm => (
              <div key={perm.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-900/50 hover:border-emerald-300 dark:hover:border-emerald-800 transition">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold font-mono tracking-tight text-zinc-700 dark:text-zinc-200">{perm.role}</span>
                   <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 uppercase tracking-wider"><Lock size={12}/> {perm.resource}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                   {['C','R','U','D'].map((op, i) => {
                     const isGranted = (op === 'C' && perm.canCreate) || (op === 'R' && perm.canRead) || (op === 'U' && perm.canUpdate) || (op === 'D' && perm.canDelete);
                     return (
                       <div key={i} className={cn(
                         "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold font-mono",
                         isGranted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                                   : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700"
                       )}>
                         {op}
                       </div>
                     )
                   })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      )}

      {activeTab === 'wizard' && <GrantRevokeWizard />}
      
      {activeTab === 'rls' && <RlsPolicyManager />}
      
      <UserRoleModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        isEdit={isEditUser}
        user={selectedUser}
        connectionString={connectionString}
        availableDatabases={availableDatabases}
        onSuccess={fetchRoles}
      />
      <PermissionModal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} />
      <ConfirmModal 
        isOpen={isConfirmRevoke} 
        onCancel={() => { setIsConfirmRevoke(false); setUserToRevoke(null); }} 
        onConfirm={handleRevokeUser} 
        title="Revoke / Drop User" 
        message={`Are you sure you want to drop user "${userToRevoke}"? This action cannot be undone and will fail if the user owns any objects.`} 
        confirmLabel="Drop User"
      />
    </div>
  );
}
