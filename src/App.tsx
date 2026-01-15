import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/core/AuthContext';
import { ToastProvider } from './components/common/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './modules/auth/pages/LoginPage';
import VerifyTokenPage from './modules/auth/pages/VerifyTokenPage';
import SetPasswordPage from './modules/auth/pages/SetPasswordPage';

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
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-token" element={<VerifyTokenPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

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

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

