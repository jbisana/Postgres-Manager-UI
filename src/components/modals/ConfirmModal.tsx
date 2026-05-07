import React from 'react';
import { Modal } from '../Modal';
import { AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({ isOpen, onCancel, onConfirm, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }: ModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-700">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">{confirmLabel}</button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full shrink-0">
          <AlertTriangle size={24} />
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
          {message}
        </p>
      </div>
    </Modal>
  );
}
