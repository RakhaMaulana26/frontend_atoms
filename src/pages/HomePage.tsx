import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/core/AuthContext';
import { useDataCache } from '../contexts/DataCacheContext';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import ProfileModal from '../components/home/ProfileModal';
import ChangePasswordModal from '../components/home/ChangePasswordModal';
import MenuGrid from '../components/home/MenuGrid';
import TodayScheduleBanner from '../components/home/TodayScheduleBanner';
import HomeFooter from '../components/home/HomeFooter';
import { 
  User as UserIcon,
  ChevronDown,
  LogOut,
  Settings,
  Bell,
  Calendar
} from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    unreadNotificationCount, 
    isLoading, 
    isInitialized
  } = useDataCache();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Global Loading Overlay */}
      {isLoading && !isInitialized && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#222E6A] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-900">Loading AIRNAV System...</p>
            <p className="text-sm text-gray-600">Initializing data and services</p>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo and Welcome */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#454D7C] to-[#222E6A] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AIRNAV Control</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.name || 'User'}</p>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">System Online</span>
              </div>
              
              <button 
                onClick={() => navigate('/notifications')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-[#222E6A] rounded-full flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">{user?.role?.toUpperCase()}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => navigate('/settings')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <Settings className="h-4 w-4" />
                      Preferences
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

        {/* Today's Schedule Banner */}
        <TodayScheduleBanner />
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