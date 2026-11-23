import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { useAuth } from './AuthContext';
import type { AdminBootstrapPayload } from '../types/domain';

interface StoreContextValue {
  adminLoading: boolean;
  adminData: AdminBootstrapPayload | null;
  isPreviewSampleData: boolean;
  refreshAdminData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, supabaseConfigured } = useAuth();
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminData, setAdminData] = useState<AdminBootstrapPayload | null>(null);

  const refreshAdminData = useCallback(async () => {
    if (!isAuthenticated) {
      setAdminData(null);
      return;
    }
    setAdminLoading(true);
    try {
      const data = await apiRequest<AdminBootstrapPayload>('/api/admin/bootstrap');
      setAdminData(data);
    } catch {
      // Ignore if unauthorized
    } finally {
      setAdminLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAdminData();
    } else {
      setAdminData(null);
    }
  }, [isAuthenticated, refreshAdminData]);

  return (
    <StoreContext.Provider
      value={{
        adminLoading,
        adminData,
        isPreviewSampleData: !supabaseConfigured,
        refreshAdminData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
