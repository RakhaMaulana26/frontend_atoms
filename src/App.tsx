import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/core/AuthContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast.css';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Landing Page
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import MaintenancePage from './pages/MaintenancePage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';
import ActivityPage from './pages/ActivityPage';

// Auth Pages
import AuthPage from './modules/auth/pages/AuthPage';

// Pages
import UsersPage from './modules/admin/pages/UsersPage';
import RostersPage from './modules/roster/pages/RostersPage';
import RosterDetailPage from './modules/roster/pages/RosterDetailPage';
import ShiftRequestsPage from './modules/shift-request/pages/ShiftRequestsPage';
import NotificationsPage from './modules/notifications/pages/NotificationsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataCacheProvider>
          <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Routes - All auth flows in one page */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Home Page - Protected */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Personnel/Employee Management Routes */}
          <Route
            path="/personnel"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Settings Routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Roster Routes */}
          <Route
            path="/roster"
            element={
              <ProtectedRoute>
                <RostersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roster/create"
            element={
              <ProtectedRoute>
                <RostersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rosters"
            element={
              <ProtectedRoute>
                <RostersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rosters/:id"
            element={
              <ProtectedRoute>
                <RosterDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Shift Request Routes */}
          <Route
            path="/shift-requests"
            element={
              <ProtectedRoute>
                <ShiftRequestsPage />
              </ProtectedRoute>
            }
          />

          {/* Notifications Routes */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Maintenance Routes */}
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />

          {/* Inventory Routes */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          {/* Activity Log Routes */}
          <Route
            path="/activity-log"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Toast Container with custom styling */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 9999 }}
        />
        </DataCacheProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

