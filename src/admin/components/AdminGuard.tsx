import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AdminModuleKey } from '../../types/domain';

interface AdminGuardProps {
  requiredModule?: AdminModuleKey;
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ requiredModule, children }) => {
  const { loading, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-serif text-xl text-[#3B1422]">AARANYA</p>
          <p className="text-xs text-[#534245]">Verifying atelier session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredModule && !hasPermission(requiredModule)) {
    return <Navigate to="/admin/access-denied" state={{ requiredModule }} replace />;
  }

  return <>{children}</>;
};
