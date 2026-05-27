import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  appUser: AppUser | null;
  role: UserRole | null;
  isFirstLogin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const user = await api.get<AppUser>('/auth/me');
          setAppUser(user);
        }
      } catch {
        await AsyncStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    const { token, user } = await api.post<{ token: string; user: AppUser }>(
      '/auth/login',
      { identifier, password },
      false
    );
    await AsyncStorage.setItem('auth_token', token);
    setAppUser(user);
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    setAppUser(null);
  }

  async function changePassword(newPassword: string) {
    await api.post('/auth/change-password', { newPassword });
    setAppUser(prev => prev ? { ...prev, isFirstLogin: false } : null);
  }

  async function refreshUser() {
    const user = await api.get<AppUser>('/auth/me');
    setAppUser(user);
  }

  return (
    <AuthContext.Provider
      value={{
        appUser,
        role: appUser?.role ?? null,
        isFirstLogin: appUser?.isFirstLogin ?? false,
        loading,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
