import React from 'react';
import { Modal } from '../Modal';

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEdit?: boolean;
}

export function UserRoleModal({ isOpen, onClose, isEdit = false }: UserRoleModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit User Access" : "Invite User"}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">{isEdit ? 'Save Changes' : 'Send Invite'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
          <input 
            type="email" 
            placeholder="user@example.com" 
            disabled={isEdit}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Assign Role</label>
          <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>Admin</option>
            <option>Editor</option>
            <option>Viewer</option>
          </select>
          <p className="text-xs text-zinc-500 mt-2">
            Roles define base privileges. You can set granular table-level permissions in the Role Permissions section.
          </p>
        </div>
      </div>
    </Modal>
  );
}
