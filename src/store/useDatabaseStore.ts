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
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
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
  
  addProfile: (profile) => set((state) => {
    const newProfile = { ...profile, id: Date.now().toString() };
    const newProfiles = [...state.profiles, newProfile];
    localStorage.setItem('db_connection_profiles', JSON.stringify(newProfiles));
    return { profiles: newProfiles };
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
      return { activeProfileId: id, connectionString: profile.connectionString };
    }
    return state;
  }),

  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));
