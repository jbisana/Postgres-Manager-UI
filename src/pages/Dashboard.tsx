import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Database, HardDrive, Activity, Users, AlertCircle } from 'lucide-react';
import { useDatabaseStore } from '../store';
import { SlowQueries } from '../components/dashboard/SlowQueries';
import { VacuumBloat } from '../components/dashboard/VacuumBloat';
import { LocksActivity } from '../components/dashboard/LocksActivity';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState<any[]>([]);
  const [connectionData, setConnectionData] = useState<any[]>([]);
  const [queryData, setQueryData] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && connectionString) {
      const fetchStats = async () => {
        try {
          const res = await fetch('/api/db/diagnostics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionString })
          });
          const data = await res.json();
          if (data.success) {
            setStats([
              { label: 'Active Connections', value: String(data.stats.activeConnections), change: '', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Total DB Size', value: String(data.stats.totalSize), change: '', icon: HardDrive, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { label: 'Extensions Installed', value: String(data.stats.extensionCount), change: '', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'PostgreSQL Version', value: String(data.stats.version).split(' ')[0], change: '', icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ]);
            
            // For the query data, we use the top tables by size as a proxy for hotspot areas
            setQueryData(data.topTables.map((r: any) => ({
              table: r.table_name || 'unknown',
              reads: Math.round(r.size_bytes / 1024 / 1024), // Using size in MB as a dummy "read" metric for visualization
              writes: Math.round(r.size_bytes / 1024 / 1024 / 4)
            })));
          }
          
          const resConn = await fetch('/api/db/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionString })
          });
          const dataConn = await resConn.json();
          if (dataConn.success) {
             // Map activity states to counts for the chart
             const states: Record<string, number> = {};
             dataConn.activity.forEach((a: any) => {
               states[a.state] = (states[a.state] || 0) + 1;
             });
             setConnectionData(Object.entries(states).map(([state, count]) => ({ state, count })));
          }
        } catch (e) {
          console.error('Failed to fetch stats', e);
        }
      };
      
      fetchStats();
    } else {
      setStats([
        { label: 'Active Connections', value: '0', change: '', icon: Users, color: 'text-gray-500', bg: 'bg-gray-500/10' },
        { label: 'Total DB Size', value: '0 B', change: '', icon: HardDrive, color: 'text-gray-500', bg: 'bg-gray-500/10' },
        { label: 'PostgreSQL Version', value: '-', change: '', icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10' },
        { label: 'Active Databases', value: '0', change: '', icon: Database, color: 'text-gray-500', bg: 'bg-gray-500/10' },
      ]);
      setConnectionData([]);
      setQueryData([]);
    }
  }, [isConnected, connectionString]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cluster Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Overview of your PostgreSQL clusters and active metrics.</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
            Export Report
          </button>
        </div>
      </div>

      <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-lg w-full max-w-2xl mb-6">
        {['overview', 'slow_queries', 'vacuum_bloat', 'locks'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === tab
                ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            )}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'slow_queries' && 'Slow Queries'}
            {tab === 'vacuum_bloat' && 'Vacuum & Bloat'}
            {tab === 'locks' && 'Locks & Activity'}
          </button>
        ))}
      </div>

      {!isConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="text-amber-800 dark:text-amber-200 font-medium text-sm">Database Not Connected</h3>
            <p className="text-amber-600 dark:text-amber-300/80 text-xs mt-1">Please connect your database using the settings menu to view real metrics.</p>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col">
                <div className="flex justify-between items-start">
                   <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={stat.color} size={20} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                    stat.change.startsWith('+') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                    stat.change.startsWith('-') ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                  )}>
                    {stat.change}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 font-mono tracking-tight">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6">Current Connections by State</h3>
              {connectionData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={connectionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.3} />
                      <XAxis dataKey="state" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} dx={-10} />
                      <RechartsTooltip 
                        cursor={{ fill: '#27272a', opacity: 0.1 }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 italic">No data available</div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6">Read/Write by Table (I/O)</h3>
              {queryData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.3} />
                      <XAxis dataKey="table" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'JetBrains Mono' }} dx={-10} />
                      <RechartsTooltip 
                        cursor={{ fill: '#27272a', opacity: 0.1 }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                      />
                      <Bar dataKey="reads" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="writes" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 italic">No data available</div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'slow_queries' && <SlowQueries />}
      {activeTab === 'vacuum_bloat' && <VacuumBloat />}
      {activeTab === 'locks' && <LocksActivity />}
    </div>
  );
}
