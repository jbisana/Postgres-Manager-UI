import { create } from 'zustand';

export interface ConnectionProfile {
  id: string;
  name: string;
  connectionString: string;
}

interface DatabaseStore {
  profiles: ConnectionProfile[];
  activeProfileId: string | null;
  connectionString: string | null;
  
  addProfile: (profile: Omit<ConnectionProfile, 'id'>) => void;
  updateProfile: (id: string, updates: Partial<Omit<ConnectionProfile, 'id'>>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  availableDatabases: string[];
  setAvailableDatabases: (dbs: string[]) => void;
  selectedDatabase: string | null;
  setSelectedDatabase: (dbName: string) => void;
}

const loadProfiles = (): ConnectionProfile[] => {
  try {
    const data = localStorage.getItem('db_connection_profiles');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export const useDatabaseStore = create<DatabaseStore>((set) => ({
  profiles: loadProfiles(),
  activeProfileId: localStorage.getItem('db_active_profile_id') || null,
  connectionString: localStorage.getItem('db_connection_string') || null,
  
  availableDatabases: [],
  setAvailableDatabases: (dbs) => set({ availableDatabases: dbs }),
  selectedDatabase: null,
  setSelectedDatabase: (dbName) => set((state) => {
    if (!state.connectionString) return state;
    
    let newConnectionString = state.connectionString;
    try {
      // Try to update URI if it is one
      const url = new URL(state.connectionString);
      url.pathname = '/' + dbName;
      newConnectionString = url.toString();
    } catch (e) {
      // Fallback for key-value pairs
      if (state.connectionString.includes('dbname=')) {
        newConnectionString = state.connectionString.replace(/dbname=[^ ]+/, `dbname=${dbName}`);
      } else {
        newConnectionString = state.connectionString + ` dbname=${dbName}`;
      }
    }
    
    const newState = { 
      selectedDatabase: dbName,
      connectionString: newConnectionString
    };
    
    localStorage.setItem('db_connection_string', newConnectionString);
    
    return newState;
  }),
  
  addProfile: (profile) => set((state) => {
    const newProfile = { ...profile, id: Date.now().toString() };
    const newProfiles = [...state.profiles, newProfile];
    localStorage.setItem('db_connection_profiles', JSON.stringify(newProfiles));
    return { profiles: newProfiles };
  }),
  
  updateProfile: (id, updates) => set((state) => {
    const newProfiles = state.profiles.map(p => p.id === id ? { ...p, ...updates } : p);
    localStorage.setItem('db_connection_profiles', JSON.stringify(newProfiles));
    const newState: any = { profiles: newProfiles };
    if (state.activeProfileId === id && updates.connectionString) {
      localStorage.setItem('db_connection_string', updates.connectionString);
      newState.connectionString = updates.connectionString;
    }
    return newState;
  }),
  
  removeProfile: (id) => set((state) => {
    const newProfiles = state.profiles.filter(p => p.id !== id);
    localStorage.setItem('db_connection_profiles', JSON.stringify(newProfiles));
    if (state.activeProfileId === id) {
      localStorage.removeItem('db_active_profile_id');
      localStorage.removeItem('db_connection_string');
      return { profiles: newProfiles, activeProfileId: null, connectionString: null, isConnected: false };
    }
    return { profiles: newProfiles };
  }),
  
  setActiveProfile: (id) => set((state) => {
    if (!id) {
      localStorage.removeItem('db_active_profile_id');
      localStorage.removeItem('db_connection_string');
      return { activeProfileId: null, connectionString: null, isConnected: false };
    }
    const profile = state.profiles.find(p => p.id === id);
    if (profile) {
      localStorage.setItem('db_active_profile_id', id);
      localStorage.setItem('db_connection_string', profile.connectionString);
      return { activeProfileId: id, connectionString: profile.connectionString, selectedDatabase: null, availableDatabases: [] };
    }
    return state;
  }),

  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));
