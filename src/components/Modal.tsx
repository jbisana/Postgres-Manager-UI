import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, className, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200", 
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto min-h-0">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0 flex items-center justify-end gap-2 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
