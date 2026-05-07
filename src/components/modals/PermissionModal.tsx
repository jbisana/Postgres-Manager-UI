import React from 'react';
import { Modal } from '../Modal';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionModal({ isOpen, onClose }: PermissionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Role Permissions"
      className="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Save Permissions</button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure granular access controls for specific schemas or tables.
        </p>

        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium w-1/3">Target Resource</th>
                <th className="px-4 py-3 font-medium text-center">SELECT<br/><span className="text-[10px] font-normal text-zinc-400">(Read)</span></th>
                <th className="px-4 py-3 font-medium text-center">INSERT<br/><span className="text-[10px] font-normal text-zinc-400">(Create)</span></th>
                <th className="px-4 py-3 font-medium text-center">UPDATE<br/><span className="text-[10px] font-normal text-zinc-400">(Edit)</span></th>
                <th className="px-4 py-3 font-medium text-center">DELETE<br/><span className="text-[10px] font-normal text-zinc-400">(Drop)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {['All Databases', 'public.users', 'public.orders', 'analytics.*'].map((resource) => (
                <tr key={resource} className="text-zinc-800 dark:text-zinc-200">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{resource}</td>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" defaultChecked /></td>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" defaultChecked={resource !== 'analytics.*'} /></td>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" defaultChecked={resource !== 'analytics.*'} /></td>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" defaultChecked={resource === 'All Databases'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
