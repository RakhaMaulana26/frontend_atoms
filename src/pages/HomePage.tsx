import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/core/AuthContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { 
  Modal, 
  Button, 
  AppHeader, 
  ProfileModal, 
  ChangePasswordModal, 
  MenuGrid, 
  HomeFooter 
} from '../components';
import { Calendar } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { isLoading, isInitialized } = useDataCache();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* App Header */}
      <AppHeader 
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogoutClick={() => setIsLogoutConfirmOpen(true)}
      />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="/assets/image/image15.png" 
            alt="AIRNAV Control Tower"
            className="w-full h-full object-cover opacity-20"
            loading="lazy"
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Integrated Aviation
                <span className="text-blue-300"> Management</span>
              </h1>
              <p className="text-xl opacity-90 mb-8 leading-relaxed">
                Streamline operations with our comprehensive system for personnel management, 
                roster scheduling, maintenance tracking, and inventory control.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => isInitialized && navigate('/roster')}
                  disabled={!isInitialized || isLoading}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg ${
                    isInitialized && !isLoading
                      ? 'bg-white text-[#222E6A] hover:bg-gray-100'
                      : 'bg-white/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                  {isLoading ? 'Loading...' : 'View Roster'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Modules Grid */}
        <MenuGrid isInitialized={isInitialized} />
      </div>

      {/* Footer */}
      <HomeFooter />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onChangePassword={() => {
          setIsProfileModalOpen(false);
          setIsChangePasswordModalOpen(true);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Confirm Logout"
        size="sm"
        headerVariant="danger"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Are you sure you want to logout?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                You will need to login again to access the system.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsLogoutConfirmOpen(false);
                logout();
              }}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HomePage;