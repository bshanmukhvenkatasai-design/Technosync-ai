import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedGuardProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<ProtectedGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9F8] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#2F5D62] animate-spin"></div>
        </div>
        <p className="text-xs text-gray-500 font-medium">Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface RequireRoleProps extends ProtectedGuardProps {
  allowedRoles: ('Citizen' | 'Officer' | 'MP' | 'Admin')[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9F8] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#2F5D62] animate-spin"></div>
        </div>
        <p className="text-xs text-gray-500 font-medium">Fetching authorizations...</p>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    // If not authorized, redirect back to landing or dashboard fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
