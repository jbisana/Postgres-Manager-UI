import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Explorer } from './pages/Explorer';
import { QueryEditor } from './pages/QueryEditor';
import { AccessControl } from './pages/AccessControl';
import { AuditLogs } from './pages/AuditLogs';
import { Backups } from './pages/Backups';
import { VersionControl } from './pages/VersionControl';
import { PostgrestManager } from './pages/PostgrestManager';
import { Extensions } from './pages/Extensions';
import { Menu } from 'lucide-react';
import { ConnectionSettingsModal } from './components/modals/ConnectionSettingsModal';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConnectionSettingsOpen, setIsConnectionSettingsOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'explorer': return <Explorer />;
      case 'query': return <QueryEditor />;
      case 'postgrest': return <PostgrestManager />;
      case 'extensions': return <Extensions />;
      case 'access': return <AccessControl />;
      case 'audit': return <AuditLogs />;
      case 'backups': return <Backups />;
      case 'version': return <VersionControl />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onOpenSettings={() => setIsConnectionSettingsOpen(true)}
      />
      
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
           <span className="font-bold tracking-wide">PG Manager</span>
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-2 -mr-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
           >
             <Menu size={24} />
           </button>
        </div>
        
        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>

      <ConnectionSettingsModal 
        isOpen={isConnectionSettingsOpen} 
        onClose={() => setIsConnectionSettingsOpen(false)} 
      />
    </div>
  );
}
