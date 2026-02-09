import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/core/AuthContext';
import { useDataCache } from '../../contexts/DataCacheContext';
import { 
  User as UserIcon,
  ChevronDown,
  LogOut,
  Settings,
  Bell
} from 'lucide-react';

interface AppHeaderProps {
  onProfileClick?: () => void;
  onLogoutClick?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onProfileClick, onLogoutClick }) => {
  const { user } = useAuth();
  const { unreadNotificationCount } = useDataCache();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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

  const handleProfileClick = () => {
    setIsUserMenuOpen(false);
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    if (onLogoutClick) {
      onLogoutClick();
    }
  };

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Welcome */}
          <div className="flex items-center space-x-4">
            <div 
              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <img 
                src="/assets/icon/logoairnav.svg" 
                alt="AirNav Indonesia Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PT. AirNav Indonesia</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.name || 'User'}</p>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center space-x-3">
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
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Preferences
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogoutClick}
                    className="w-full text-left px-4 py-2.5 mx-2 mb-1 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgb(239, 68, 68), rgb(220, 38, 38))'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundImage = 'linear-gradient(to right, rgb(220, 38, 38), rgb(185, 28, 28))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundImage = 'linear-gradient(to right, rgb(239, 68, 68), rgb(220, 38, 38))';
                    }}
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
  );
};

export default AppHeader;
