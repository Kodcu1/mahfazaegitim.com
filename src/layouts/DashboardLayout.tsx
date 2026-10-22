import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { LoadingState } from '../components/ui/EmptyState';
import { UserRole, normalizeRole } from '../types';

interface DashboardLayoutProps {
  allowedRoles?: UserRole[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // While auth session is initializing, or when route has role restrictions and role is still resolving,
  // hold in clean loading state to strictly prevent unauthorized dashboard flashes or redirect loops
  if (loading || (user && allowedRoles && !role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Mahfaza.co yetkileri doğrulanıyor..." />
      </div>
    );
  }

  // Not authenticated: strictly redirect to /login with safe return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = normalizeRole(role);
  const effectiveRole = normalizedRole === 'head_coach' ? 'coach' : normalizedRole;
  const isAllowed = !allowedRoles || allowedRoles.some((r) => r.toLowerCase() === normalizedRole);

  // Server-side / profile role validation: If current route has role restrictions and role is unauthorized
  if (!isAllowed) {
    const targetDashboard = `/${effectiveRole}/dashboard`;
    // If the path already belongs to effective role or matches target, stop redirect loop
    if (
      location.pathname.toLowerCase().startsWith(`/${effectiveRole}`) ||
      location.pathname.toLowerCase() === targetDashboard.toLowerCase()
    ) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-base font-semibold text-slate-900">Erişim Yetkisi Sınırı</h2>
            <p className="text-xs text-slate-500 mt-1">Bu sayfaya erişim izniniz bulunmuyor.</p>
          </div>
        </div>
      );
    }
    return <Navigate to={targetDashboard} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <div className="flex-1 flex">
        <Sidebar
          role={(effectiveRole as UserRole) || 'student'}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
