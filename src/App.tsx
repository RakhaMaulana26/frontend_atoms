import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/core/AuthContext';
import { ToastProvider } from './components/common/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Landing Page
import LandingPage from './pages/LandingPage';

// Auth Pages
import AuthPage from './modules/auth/pages/AuthPage';

// Dashboard Pages
import DashboardPage from './modules/dashboard/pages/DashboardPage';
import UsersPage from './modules/admin/pages/UsersPage';
import RostersPage from './modules/roster/pages/RostersPage';
import ShiftRequestsPage from './modules/shift-request/pages/ShiftRequestsPage';
import NotificationsPage from './modules/notifications/pages/NotificationsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public Routes - All auth flows in one page */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <UsersPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Roster Routes */}
            <Route
              path="/rosters"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <DashboardLayout>
                    <RostersPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Shift Request Routes */}
            <Route
              path="/shift-requests"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ShiftRequestsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Notifications Routes */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NotificationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

