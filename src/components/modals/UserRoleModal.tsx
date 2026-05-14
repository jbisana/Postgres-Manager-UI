import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Eye, EyeOff } from 'lucide-react';

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEdit?: boolean;
  user?: any;
  connectionString?: string | null;
  availableDatabases?: string[];
  onSuccess?: () => void;
}

export function UserRoleModal({ isOpen, onClose, isEdit = false, user, connectionString, availableDatabases = [], onSuccess }: UserRoleModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(user?.name || '');
      setPassword('');
      setRole(user?.role || 'user');
      const parsedDatabases = Array.isArray(user?.databases) ? user.databases : typeof user?.databases === 'string' ? user.databases.replace(/^{|}$/g, '').split(',').filter(Boolean) : [];
      setSelectedDatabases(parsedDatabases);
      setShowPassword(false);
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!username || (!isEdit && !password)) return;
    if (!connectionString) return;

    setIsSubmitting(true);
    try {
      const endpoint = isEdit ? '/api/db/users/edit' : '/api/db/users/create';
      const body: any = { 
        connectionString, 
        username, 
        role, 
        databases: selectedDatabases,
        allDatabases: availableDatabases
      };
      if (password) body.password = password; // Only send password if updated

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to save user');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit User/Role" : "Add User"}
      footer={
        <>
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !username || (!isEdit && !password)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{isEdit ? 'Save Changes' : 'Add User'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
          <input 
            type="text" 
            placeholder="e.g. app_user" 
            disabled={isEdit}
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 font-mono text-sm" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {isEdit ? "Password (leave blank to keep current)" : "Password"}
          </label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder={isEdit ? "••••••••" : "Enter a strong password"} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm pr-10" 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Role Type</label>
           <select 
             value={role}
             onChange={e => setRole(e.target.value)}
             className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
           >
             <option value="user">Standard User (Read/Write depends on Grants)</option>
             <option value="manager">Manager (Can Create DB & Roles)</option>
             <option value="admin">Admin (Superuser)</option>
           </select>
        </div>

        {availableDatabases.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Database Access (CONNECT)</label>
            {role === 'admin' ? (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg text-sm text-zinc-500 italic">
                Admins (Superusers) have access to ALL databases by default.
              </div>
            ) : (
              <div className="space-y-2 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg max-h-48 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50">
                {availableDatabases.map(db => (
                  <label key={db} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedDatabases.includes(db)} 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDatabases([...selectedDatabases, db]);
                        else setSelectedDatabases(selectedDatabases.filter(d => d !== db));
                      }} 
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-zinc-800" 
                    />
                    <span className="font-mono text-xs">{db}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
