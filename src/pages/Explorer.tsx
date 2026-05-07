import React, { useState, useEffect } from 'react';
import { Database, Table as TableIcon, Columns, FileText, Search, Plus, Trash2, Edit2, Play, Download, Settings, GitCommit, ListFilter, AlertCircle } from 'lucide-react';
import { Database as DBType, Table, Column } from '../types';
import { cn } from '../lib/utils';
import { CreateTableModal } from '../components/modals/CreateTableModal';
import { ColumnModal } from '../components/modals/ColumnModal';
import { ImportExportModal } from '../components/modals/ImportExportModal';
import { RowModal } from '../components/modals/RowModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useDatabaseStore } from '../store';

export function Explorer() {
  const { isConnected, connectionString } = useDatabaseStore();
  const [dbs, setDbs] = useState<DBType[]>([]);
  const [selectedDb, setSelectedDb] = useState<DBType | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeTab, setActiveTab] = useState<'schema' | 'data'>('schema');
  
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Modal states
  const [isCrateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isEditColumn, setIsEditColumn] = useState(false);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [isEditRow, setIsEditRow] = useState(false);
  const [isConfirmDropTable, setIsConfirmDropTable] = useState(false);
  const [isConfirmDropColumn, setIsConfirmDropColumn] = useState(false);
  const [isConfirmDropRow, setIsConfirmDropRow] = useState(false);
  const [isCreateDatabase, setIsCreateDatabase] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [inlineEditCell, setInlineEditCell] = useState<{rowIndex: number, columnName: string, value: string} | null>(null);

  const handleInlineSave = async (rowIndex: number, columnName: string, newValue: string) => {
    if (!isConnected || !connectionString || !selectedTable) return;
    const row = tableData[rowIndex];
    if (!row) return;

    try {
      const pkCols = selectedTable.columns.filter(c => c.isPrimary);
      if (pkCols.length === 0) {
        throw new Error("Cannot edit inline: Table has no primary key.");
      }
      
      const whereClause = pkCols.map((c, i) => `"${c.name}" = $${i + 2}`).join(' AND ');
      const pkValues = pkCols.map(c => row[c.name]);
      
      // Parse newValue back slightly if we can, else just pass string
      let parsedValue: any = newValue;
      if (newValue === 'null') parsedValue = null;
      else if (newValue === 'true') parsedValue = true;
      else if (newValue === 'false') parsedValue = false;
      
      const query = `UPDATE "${selectedTable.name}" SET "${columnName}" = $1 WHERE ${whereClause};`;
      const values = [parsedValue, ...pkValues];
      
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query, values })
      });
      
      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error);
      }
      
      setInlineEditCell(null);
      fetchTableDataInner();
    } catch (err: any) {
      alert(err.message || 'Error updating cell');
      setInlineEditCell(null);
    }
  };

  useEffect(() => {
    if (isConnected && connectionString) {
      const fetchSchema = async () => {
        setIsLoadingSchema(true);
        setErrorInfo(null);
        try {
          const res = await fetch('/api/db/schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionString })
          });
          const data = await res.json();
          if (data.success && data.tables) {
            let dbName = 'Connected Database';
            try {
              // Try to parse the connection string to get the database name
              // Matches postgres://user:pass@host:port/dbname or similar
              const url = new URL(connectionString);
              dbName = url.pathname.slice(1) || 'Connected Database';
            } catch (e) {
              // If not a URL, might be key=value format
              const match = connectionString.match(/dbname=([^ ]+)/);
              if (match) dbName = match[1];
            }

            const newDb: DBType = {
              id: 'connected_db',
              name: dbName,
              status: 'online',
              version: 'PostgreSQL 15',
              size: '4 GB',
              region: 'aws-us-east-1',
              tables: data.tables
            };
            setDbs([newDb]);
            setSelectedDb(newDb);
            setSelectedTable(data.tables[0] || null);
          } else {
            setErrorInfo(data.error || 'Failed to fetch schema');
            setDbs([]);
            setSelectedDb(null);
            setSelectedTable(null);
          }
        } catch (err) {
          console.error(err);
          setErrorInfo('Network error resolving schema');
          setDbs([]);
          setSelectedDb(null);
          setSelectedTable(null);
        } finally {
          setIsLoadingSchema(false);
        }
      };
      fetchSchema();
    } else {
      setDbs([]);
      setSelectedDb(null);
      setSelectedTable(null);
    }
  }, [isConnected, connectionString]);

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);

  const fetchTableDataInner = async () => {
    if (!isConnected || !connectionString || !selectedTable || activeTab !== 'data') return;
    setIsLoadingData(true);
    setErrorInfo(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query: `SELECT * FROM "${selectedTable.name}" LIMIT 100;` })
      });
      const data = await res.json();
      if (data.success) {
        setTableData(data.rows);
      } else {
        setErrorInfo(data.error || 'Failed to fetch table data');
        setTableData([]);
      }
    } catch (err) {
      console.error(err);
      setErrorInfo('Network error loading data');
      setTableData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchTableDataInner();
  }, [isConnected, connectionString, selectedTable, activeTab]);

  const handleSaveRow = async (data: any) => {
    if (!isConnected || !connectionString || !selectedTable) return;
    
    // We get all the keys
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);
    
    let query = '';
    
    if (isEditRow && editingRow) {
      // Find PK columns
      const pkCols = selectedTable.columns.filter(c => c.isPrimary);
      if (pkCols.length === 0) {
        throw new Error("Cannot edit row: Table has no primary key.");
      }
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      
      const whereClause = pkCols.map((c, i) => `"${c.name}" = $${keys.length + i + 1}`).join(' AND ');
      const pkValues = pkCols.map(c => editingRow[c.name]);
      
      query = `UPDATE "${selectedTable.name}" SET ${setClause} WHERE ${whereClause};`;
      values.push(...pkValues);
    } else {
      // Insert
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      query = `INSERT INTO "${selectedTable.name}" (${cols}) VALUES (${placeholders});`;
    }
    
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString, query, values })
    });
    
    const resData = await res.json();
    if (!resData.success) {
      throw new Error(resData.error);
    }
    
    // refresh data
    fetchTableDataInner();
  };

  const handleDeleteRow = async () => {
    if (!isConnected || !connectionString || !selectedTable || !editingRow) return;
    try {
      const pkCols = selectedTable.columns.filter(c => c.isPrimary);
      if (pkCols.length === 0) {
        throw new Error("Cannot delete row: Table has no primary key.");
      }
      
      const whereClause = pkCols.map((c, i) => `"${c.name}" = $${i + 1}`).join(' AND ');
      const pkValues = pkCols.map(c => editingRow[c.name]);
      
      const query = `DELETE FROM "${selectedTable.name}" WHERE ${whereClause};`;
      
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query, values: pkValues })
      });
      
      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error);
      }
      setIsConfirmDropRow(false);
      setEditingRow(null);
      fetchTableDataInner();
    } catch (err: any) {
      alert(err.message || 'Error deleting row');
    }
  };

  const handleDeleteTable = async () => {
    if (!isConnected || !connectionString || !selectedTable) return;
    try {
      const query = `DROP TABLE "${selectedTable.name}" CASCADE;`;
      
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query })
      });
      
      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error);
      }
      setIsConfirmDropTable(false);
      setSelectedTable(null);
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || 'Error deleting table');
    }
  };

  const handleDeleteColumn = async () => {
    if (!isConnected || !connectionString || !selectedTable || !editingColumn) return;
    try {
      const query = `ALTER TABLE "${selectedTable.name}" DROP COLUMN "${editingColumn.name}" CASCADE;`;
      
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, query })
      });
      
      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error);
      }
      setIsConfirmDropColumn(false);
      setEditingColumn(null);
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || 'Error deleting column');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-zinc-50 dark:bg-[#09090b] border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar: DB List & Tables */}
      <div className="w-full md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex flex-col">
        {isConnected && selectedDb && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest mb-1 flex items-center gap-1.5 font-sans">
              <Database size={10} /> Active Database
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white truncate font-mono">
              {selectedDb.name}
            </div>
          </div>
        )}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter objects..." 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-800 dark:text-zinc-200 font-sans"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingSchema && (
            <div className="text-sm text-zinc-500 text-center py-4 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-emerald-600 rounded-full animate-spin"></div> Loading Schema...
            </div>
          )}
          {!isLoadingSchema && dbs.length > 0 && (
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1 font-sans">Databases</div>
          )}
          {!isLoadingSchema && dbs.map(db => (
            <div key={db.id} className="mb-2">
              <button 
                onClick={() => {
                  setSelectedDb(db);
                  setSelectedTable(db.tables[0] || null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left font-bold font-mono tracking-tight",
                  selectedDb?.id === db.id ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Database size={16} className={cn(selectedDb?.id === db.id ? "text-emerald-500" : "text-zinc-400")} />
                {db.name}
              </button>
              
              {selectedDb?.id === db.id && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider font-sans">Tables</div>
                  {db.tables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left font-mono transition tracking-tight",
                        selectedTable?.id === table.id 
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <TableIcon size={14} className={cn(selectedTable?.id === table.id ? "text-emerald-500" : "text-zinc-400")} />
                      {table.name}
                    </button>
                  ))}
                  <button 
                    onClick={() => setIsCreateTableOpen(true)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1 font-sans font-medium"
                  >
                    <Plus size={12} /> New Table
                  </button>
                </div>
              )}
            </div>
          ))}
          {!isConnected && (
            <button 
              onClick={() => setIsCreateDatabase(true)}
              className="w-full mt-4 flex items-center gap-2 justify-center px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 transition font-sans"
            >
              <Plus size={16} /> Create Database
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#09090b] relative">
        {errorInfo && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 text-xs font-mono flex items-center gap-2 border-b border-red-200 dark:border-red-900/50">
            <AlertCircle size={14} /> {errorInfo}
          </div>
        )}
        
        {selectedTable ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400 mb-1 font-sans">
                    <Database size={10} /> {selectedDb?.name} <span className="mx-1 opacity-40">/</span> <TableIcon size={10} /> public
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 font-mono tracking-tight uppercase">
                    {selectedTable.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-zinc-100 font-medium dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-sm transition flex gap-2 items-center">
                    <FileText size={16}/> View DDL
                  </button>
                  <button 
                    onClick={() => setIsConfirmDropTable(true)}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-sm transition font-bold uppercase text-[10px] tracking-wider font-sans"
                  >
                    Drop Table
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-6 mt-6 border-b border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setActiveTab('schema')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition",
                    activeTab === 'schema' 
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Columns size={14} /> Schema Detail
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('data')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition",
                    activeTab === 'data' 
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Database size={14} /> Table Data
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6 bg-zinc-50/30 dark:bg-zinc-950/20">
              {activeTab === 'schema' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 dark:text-white font-sans">Columns</h3>
                    <button 
                      onClick={() => { setIsEditColumn(false); setIsColumnModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm transition font-bold font-sans shadow-sm uppercase text-[10px] tracking-wider"
                    >
                      <Plus size={14} /> Add Column
                    </button>
                  </div>
                  
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 font-sans">
                        <tr>
                          <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Name</th>
                          <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Type</th>
                          <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Default</th>
                          <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Null</th>
                          <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 font-mono">
                        {selectedTable.columns.map((col) => (
                          <tr key={col.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-3 font-bold flex items-center gap-2 text-sm tracking-tight">
                              {col.name}
                              {col.isPrimary && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-amber-200 dark:border-amber-800">PK</span>}
                            </td>
                            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 text-xs">{col.type}</td>
                            <td className="px-4 py-3 text-zinc-400 text-xs">{col.defaultValue || 'null'}</td>
                            <td className="px-4 py-3 font-sans">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                col.isNullable ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
                              )}>
                                {col.isNullable ? 'Yes' : 'NOT NULL'}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex justify-end gap-2 font-sans">
                              <button 
                                onClick={() => { setIsEditColumn(true); setIsColumnModalOpen(true); }}
                                className="p-1.5 text-zinc-400 hover:text-emerald-600 transition rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20" 
                                title="Edit Column"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => { setEditingColumn(col); setIsConfirmDropColumn(true); }}
                                className="p-1.5 text-zinc-400 hover:text-red-600 transition rounded hover:bg-red-50 dark:hover:bg-red-900/20" 
                                title="Drop Column"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col h-full relative">
                  {isLoadingData && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 flex items-center justify-center z-20 backdrop-blur-[1px]">
                      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 text-zinc-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search data..." 
                          className="pl-8 pr-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                        />
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded text-sm transition font-sans font-medium text-zinc-700 dark:text-zinc-300">
                        <ListFilter size={14} /> Filter
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setIsEditRow(false); setEditingRow(null); setIsRowModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] uppercase font-bold tracking-wider transition shadow-sm font-sans"
                      >
                        <Plus size={14} /> Insert Row
                      </button>
                      <button 
                        onClick={() => setIsImportExportOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] uppercase font-bold tracking-wider transition shadow-sm font-sans"
                      >
                        <Download size={14} /> Import/Export
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-x-auto bg-white dark:bg-[#09090b] relative shadow-inner">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 shadow-sm z-10 text-zinc-500 dark:text-zinc-500 font-sans">
                        <tr>
                          <th className="px-4 py-2 w-10">
                            <input type="checkbox" className="rounded bg-zinc-100 border-zinc-300 dark:border-zinc-700" />
                          </th>
                          <th className="px-4 py-2 w-10"></th>
                          {selectedTable.columns.map((col) => (
                            <th key={col.id} className="px-4 py-2 font-bold uppercase text-[10px] tracking-widest">
                              <div className="flex items-center gap-1">
                                {col.name}
                                {col.isPrimary && <span className="text-amber-500" title="Primary Key"><Database size={10}/></span>}
                              </div>
                              <div className="font-mono text-[9px] text-zinc-400 font-normal opacity-70 tracking-tight lowercase">{col.type}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 font-mono">
                        {tableData.map((row, i) => (
                          <tr key={i} className="group border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                            <td className="px-4 py-2 border-r border-zinc-100 dark:border-zinc-800/50 w-10 sticky left-0 bg-white dark:bg-[#09090b] group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/50 z-10">
                              <input type="checkbox" className="rounded bg-zinc-100 border-zinc-300 dark:bg-zinc-700 text-emerald-600 focus:ring-emerald-500" />
                            </td>
                            <td className="px-2 py-0 border-r border-zinc-100 dark:border-zinc-800/50 w-16 sticky left-10 bg-white dark:bg-[#09090b] group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/50 z-10">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setEditingRow(row); setIsConfirmDropRow(true); }}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            </td>
                            {selectedTable.columns.map((col, j) => {
                              const val = row[col.name];
                              const isDoubleClicked = inlineEditCell?.rowIndex === i && inlineEditCell?.columnName === col.name;
                              return (
                                <td 
                                  key={j} 
                                  className="px-4 py-0 border-r border-zinc-100 dark:border-zinc-800/50 relative p-0"
                                  onDoubleClick={() => {
                                    setInlineEditCell({ rowIndex: i, columnName: col.name, value: val === null ? '' : String(val) });
                                  }}
                                >
                                  {isDoubleClicked ? (
                                    <div className="absolute inset-0 bg-white dark:bg-[#09090b] z-20 flex items-center shadow-[inset_0_0_0_1px_#10b981]">
                                      <input 
                                        autoFocus
                                        value={inlineEditCell.value}
                                        onChange={(e) => setInlineEditCell({ ...inlineEditCell, value: e.target.value })}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleInlineSave(i, col.name, inlineEditCell.value);
                                          if (e.key === 'Escape') setInlineEditCell(null);
                                        }}
                                        onBlur={() => setInlineEditCell(null)}
                                        className="w-full h-full px-4 text-xs font-mono bg-transparent outline-none text-zinc-800 dark:text-zinc-200"
                                      />
                                    </div>
                                  ) : (
                                    <div className="py-2 inline-flex w-full min-h-[36px] items-center">
                                      <span className={cn(val === null || val === undefined ? "text-zinc-500 italic opacity-60" : "text-zinc-700 dark:text-zinc-300", "font-mono text-xs truncate max-w-[300px] tracking-tight")}>
                                        {val === null || val === undefined ? 'null' : typeof val === 'boolean' ? (val ? 'true' : 'false') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!isLoadingData && tableData.length === 0 && (
                      <div className="p-8 text-center text-zinc-500 font-sans italic">
                        No data available in this table.
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 text-right uppercase tracking-widest font-bold font-sans">Showing {tableData.length} rows {tableData.length >= 100 && '(Limit 100 applied)'}</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-zinc-500">
            <Database size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">No Target Selected</h3>
            <p className="max-w-xs text-center mt-2 text-sm">Select a database and a table from the sidebar to view its schema and data.</p>
          </div>
        )}
      </div>

      <CreateTableModal isOpen={isCrateTableOpen} onClose={() => setIsCreateTableOpen(false)} />
      <ColumnModal isOpen={isColumnModalOpen} onClose={() => setIsColumnModalOpen(false)} isEdit={isEditColumn} />
      <RowModal 
        isOpen={isRowModalOpen} 
        onClose={() => { setIsRowModalOpen(false); setEditingRow(null); }} 
        isEdit={isEditRow} 
        table={selectedTable}
        rowData={editingRow}
        onSave={handleSaveRow}
      />
      <ConfirmModal 
        isOpen={isConfirmDropTable} 
        onCancel={() => setIsConfirmDropTable(false)} 
        onConfirm={handleDeleteTable} 
        title="Drop Table" 
        message={`Are you sure you want to drop the table "${selectedTable?.name}"? This action cannot be undone and all data will be permanently deleted.`} 
        confirmLabel="Drop Table"
      />
      <ConfirmModal 
        isOpen={isConfirmDropColumn} 
        onCancel={() => { setIsConfirmDropColumn(false); setEditingColumn(null); }} 
        onConfirm={handleDeleteColumn} 
        title="Drop Column" 
        message={`Are you sure you want to drop the column "${editingColumn?.name}"? This action cannot be undone and will delete all data stored in this column.`} 
        confirmLabel="Drop Column"
      />
      <ConfirmModal 
        isOpen={isConfirmDropRow} 
        onCancel={() => { setIsConfirmDropRow(false); setEditingRow(null); }} 
        onConfirm={handleDeleteRow} 
        title="Delete Row" 
        message="Are you sure you want to delete this row? This action cannot be undone." 
        confirmLabel="Delete Row"
      />
      <ConfirmModal 
        isOpen={isCreateDatabase} 
        onCancel={() => setIsCreateDatabase(false)} 
        onConfirm={() => {}} 
        title="Create Database" 
        message="Simulated connection to cluster. Database will be provisioned." 
        confirmLabel="Provision DB"
      />
      <ImportExportModal 
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        table={selectedTable}
        connectionString={connectionString}
      />
    </div>
  );
}
