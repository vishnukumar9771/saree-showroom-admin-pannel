import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../components/AdminLayout';

export const AccessDeniedPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const location = useLocation();
  const requiredModule = (location.state as { requiredModule?: string } | null)?.requiredModule;

  return (
    <AdminLayout title="Access Denied" breadcrumbs={[{ label: 'Access Control' }]}>
      <div className="max-w-xl mx-auto bg-white border border-[#D8C9B4] rounded p-8 text-center space-y-4 mt-8">
        <div className="w-12 h-12 rounded-full bg-[#FBECEE] border border-[#E8A2AA] text-[#8B1E2D] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-[#24211F]">Insufficient Role Permissions</h2>
        <p className="text-sm text-[#534245]">
          Your signed-in role (<strong>{user?.role || 'Staff'}</strong>) is not authorized to access{' '}
          <span className="font-mono text-[#641E32]">{requiredModule || 'this module'}</span>.
        </p>
        <p className="text-xs text-[#534245]">
          Permitted modules: {permissions.length > 0 ? permissions.join(', ') : 'None'}
        </p>
        <div className="pt-2">
          <Link
            to="/admin/dashboard"
            className="inline-block px-5 py-2.5 bg-[#641E32] text-white text-xs font-semibold rounded hover:bg-[#3B1422]"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
};
