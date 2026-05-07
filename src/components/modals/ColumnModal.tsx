import React from 'react';
import { Modal } from '../Modal';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEdit?: boolean;
}

export function ColumnModal({ isOpen, onClose, isEdit = false }: ColumnModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Column" : "Add New Column"}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">{isEdit ? 'Save Changes' : 'Add Column'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Column Name</label>
          <input type="text" placeholder="e.g., status" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data Type</label>
          <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
            <option>varchar(255)</option>
            <option>text</option>
            <option>integer</option>
            <option>uuid</option>
            <option>boolean</option>
            <option>timestamp</option>
          </select>
        </div>

        <div>
           <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Default Value (Optional)</label>
           <input type="text" placeholder="e.g., 'active' or now()" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>

        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
            Primary Key
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
            Allow Null
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
            Unique
          </label>
        </div>
      </div>
    </Modal>
  );
}
