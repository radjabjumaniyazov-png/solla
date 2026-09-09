import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';
import { getOrCreateUser, updateLastSeen, updateUserAvatar, getUserById } from '@/lib/db';

interface AppContextValue {
  currentUser: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_KEY = 'messenger_user';

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        setCurrentUser(user);
        updateLastSeen(user.id);
        // Refresh from DB in case avatar was updated from another tab
        getUserById(user.id).then((fresh) => {
          if (fresh) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
            setCurrentUser(fresh);
          }
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => updateLastSeen(currentUser.id), 30_000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const login = useCallback(async (username: string) => {
    const user = await getOrCreateUser(username.trim());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!currentUser) return;
    await updateUserAvatar(currentUser.id, avatarUrl);
    const updated = { ...currentUser, avatar_url: avatarUrl };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCurrentUser(updated);
  }, [currentUser]);

  return (
    <AppContext.Provider value={{ currentUser, login, logout, updateAvatar, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
