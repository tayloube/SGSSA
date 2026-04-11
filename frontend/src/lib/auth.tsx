'use client';
/**
 * Contexte d'authentification — SGSSA
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from './api';
import type { User } from '@/types';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = Cookies.get('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authAPI.me();
      setUser(data);
    } catch {
      setUser(null);
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const tokens = await authAPI.login(email, password);
    setUser({
      id: tokens.user.id,
      email: tokens.user.email,
      nom: tokens.user.nom,
      prenom: tokens.user.prenom,
      nom_complet: tokens.user.nom_complet,
      role: tokens.user.role,
      est_actif: true,
      date_creation: new Date().toISOString(),
    });
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated: !!user, login, logout, refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasPermission(userRole: string | undefined, requiredRole: 'lecteur' | 'technicien' | 'superviseur' | 'admin'): boolean {
  const hierarchy = { lecteur: 1, technicien: 2, superviseur: 3, admin: 4 };
  const userLevel = hierarchy[userRole as keyof typeof hierarchy] ?? 0;
  const requiredLevel = hierarchy[requiredRole];
  return userLevel >= requiredLevel;
}
