import React from 'react';
import { 
  Database, LayoutDashboard, TerminalSquare, 
  ShieldCheck, History, HardDriveDownload, GitCommit,
  Settings, Globe, Blocks
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, onOpenSettings }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explorer', label: 'DB Explorer', icon: Database },
    { id: 'query', label: 'SQL Editor', icon: TerminalSquare },
    { id: 'postgrest', label: 'PostgREST API', icon: Globe },
    { id: 'extensions', label: 'Extensions', icon: Blocks },
    { id: 'version', label: 'Version Control', icon: GitCommit },
    { id: 'access', label: 'Access Control', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'backups', label: 'Backups & Restore', icon: HardDriveDownload },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-zinc-950/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 bg-zinc-950 border-r border-zinc-900 text-zinc-400 w-64 flex flex-col z-30 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-900 bg-zinc-950/50">
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-lg shadow-emerald-500/20">
            <Database size={20} />
          </div>
          <span className="font-bold text-white tracking-wide">PG Manager</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                currentView === item.id 
                  ? "bg-emerald-600/10 text-emerald-400" 
                  : "hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon size={18} className={cn(
                currentView === item.id ? "text-emerald-500" : "text-zinc-500"
              )} />
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-300">
              AU
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white text-left">Admin User</span>
              <span className="text-[10px] text-zinc-500 text-left">admin@postgres</span>
            </div>
            <button onClick={onOpenSettings} className="ml-auto flex items-center justify-center p-1 rounded hover:bg-zinc-900 transition">
              <Settings size={14} className="text-zinc-500 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
