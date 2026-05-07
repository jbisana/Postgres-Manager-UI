export type Role = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Permission {
  id: string;
  role: Role;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resourceType: string;
  resourceName: string;
  details: string;
}

export interface Backup {
  id: string;
  name: string;
  timestamp: string;
  size: string;
  status: 'completed' | 'failed' | 'in_progress';
  version: string;
}

export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  defaultValue: string | null;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Record<string, any>[];
}

export interface Database {
  id: string;
  name: string;
  status?: string;
  version?: string;
  size?: string;
  region?: string;
  tables: Table[];
}

export interface DBVersionCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  timestamp: string;
}
