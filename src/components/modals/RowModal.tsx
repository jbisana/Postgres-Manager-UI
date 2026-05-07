import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Table } from '../../types';

interface RowModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEdit?: boolean;
  table: Table | null;
  rowData?: any | null;
  onSave: (data: any) => Promise<void>;
}

export function RowModal({ isOpen, onClose, isEdit = false, table, rowData, onSave }: RowModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (isEdit && rowData) {
        setFormData({ ...rowData });
      } else {
        setFormData({});
      }
    }
  }, [isOpen, isEdit, rowData]);

  if (!table) return null;

  const handleChange = (colName: string, value: string, type: string) => {
    setFormData(prev => ({ ...prev, [colName]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving row');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Row" : "Insert Row"}
      footer={
        <>
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            {isSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            {isEdit ? 'Save Changes' : 'Insert Row'}
          </button>
        </>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-1">
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}
        {table.columns.map((col) => (
          <div key={col.id}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {col.name} <span className="text-xs text-zinc-400 font-normal">({col.type})</span>
            </label>
            <input 
              type="text" 
              value={formData[col.name] !== undefined && formData[col.name] !== null ? String(formData[col.name]) : ''}
              onChange={(e) => handleChange(col.name, e.target.value, col.type)}
              disabled={col.isPrimary && isEdit}
              placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : (col.isNullable ? 'null' : '')}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900" 
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
