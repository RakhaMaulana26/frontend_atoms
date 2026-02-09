import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/core/AuthContext';
import { useDataCache } from '../../contexts/DataCacheContext';
import InitialLoadingPage from '../../pages/InitialLoadingPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isLoading: dataLoading, isInitialized } = useDataCache();

  // Show full loading page during auth check
  if (authLoading) {
    return <InitialLoadingPage message="Checking authentication..." />;
  }

  // Show full loading page during initial data loading
  if (isAuthenticated && !isInitialized && dataLoading) {
    return <InitialLoadingPage message="Loading your workspace..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
