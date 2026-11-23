import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setAuthToken } from '../services/apiClient';
import { getSupabaseConfig } from '../services/supabaseClient';
import type { AdminModuleKey, StaffAccount } from '../types/domain';

interface AuthStatusResponse {
  needsInitialSetup: boolean;
  supabaseConfigured: boolean;
  envPasscodeConfigured: boolean;
  sessionUser: StaffAccount | null;
  permissions: AdminModuleKey[];
}

interface AuthSessionResponse {
  token: string;
  user: StaffAccount;
  permissions: AdminModuleKey[];
  expiresAt: string;
}

interface AuthContextValue {
  loading: boolean;
  needsInitialSetup: boolean;
  supabaseConfigured: boolean;
  envPasscodeConfigured: boolean;
  user: StaffAccount | null;
  permissions: AdminModuleKey[];
  isAuthenticated: boolean;
  hasPermission: (module: AdminModuleKey) => boolean;
  refreshStatus: () => Promise<void>;
  setupFirstAdmin: (payload: { name: string; email: string; password: string }) => Promise<void>;
  login: (payload: { email: string; password: string; rememberSession?: boolean }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(getSupabaseConfig().isConfigured);
  const [envPasscodeConfigured, setEnvPasscodeConfigured] = useState(false);
  const [user, setUser] = useState<StaffAccount | null>(null);
  const [permissions, setPermissions] = useState<AdminModuleKey[]>([]);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await apiRequest<AuthStatusResponse>('/api/admin/auth/status');
      setNeedsInitialSetup(data.needsInitialSetup);
      setSupabaseConfigured(data.supabaseConfigured || getSupabaseConfig().isConfigured);
      setEnvPasscodeConfigured(data.envPasscodeConfigured);
      setUser(data.sessionUser);
      setPermissions(data.permissions || []);
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const setupFirstAdmin = useCallback(async (payload: { name: string; email: string; password: string }) => {
    const res = await apiRequest<AuthSessionResponse>('/api/admin/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.token);
    setUser(res.user);
    setPermissions(res.permissions);
    setNeedsInitialSetup(false);
  }, []);

  const login = useCallback(
    async (payload: { email: string; password: string; rememberSession?: boolean }) => {
      const res = await apiRequest<AuthSessionResponse>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      setUser(res.user);
      setPermissions(res.permissions);
    },
    []
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    return apiRequest<{ message: string }>('/api/admin/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null);
      setUser(null);
      setPermissions([]);
    }
  }, []);

  const hasPermission = useCallback(
    (module: AdminModuleKey) => {
      if (!user) return false;
      return permissions.includes(module);
    },
    [user, permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        loading,
        needsInitialSetup,
        supabaseConfigured,
        envPasscodeConfigured,
        user,
        permissions,
        isAuthenticated: Boolean(user),
        hasPermission,
        refreshStatus,
        setupFirstAdmin,
        login,
        requestPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
