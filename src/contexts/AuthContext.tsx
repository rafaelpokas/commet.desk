import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthToken, getAuthToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  demoUsers: User[];
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;
  canApprove: boolean;
  switchUser: (user: User) => Promise<void>;
  refreshUser: () => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Sessão inicial não encontrada, alternando para admin padrão:', err);
      // Fallback to default admin
      try {
        setAuthToken('usr_admin');
        const retry = await api.getMe();
        setUser(retry.user);
      } catch (e) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoUsers = async () => {
    try {
      const res = await api.getDemoUsers();
      setDemoUsers(res.users);
    } catch (err) {
      console.error('Falha ao carregar lista de usuários demo:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchDemoUsers();
  }, []);

  const switchUser = async (targetUser: User) => {
    setLoading(true);
    setAuthToken(targetUser.id);
    setUser(targetUser);
    setLoading(false);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
    await fetchDemoUsers();
  };

  const resetDatabase = async () => {
    setLoading(true);
    try {
      await api.resetDb();
      setAuthToken('usr_admin');
      await fetchCurrentUser();
      await fetchDemoUsers();
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const isClient = user?.role === 'client_approver' || user?.role === 'client_viewer';
  const canApprove = user?.role === 'client_approver' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoUsers,
        isAdmin,
        isStaff,
        isClient,
        canApprove,
        switchUser,
        refreshUser,
        resetDatabase
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
