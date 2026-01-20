import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/core/AuthContext';
import { useDataCache } from '../../contexts/DataCacheContext';
import { Bell, User as UserIcon, ChevronDown, LogOut, Settings, Key } from 'lucide-react';
import Breadcrumbs from '../common/Breadcrumbs';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs, children }) => {
  const { user, logout } = useAuth();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo and Welcome */}
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate('/home')}>
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
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#222E6A] text-white text-xs rounded-full">
                        {user?.role?.toUpperCase()}
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button 
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Profile Settings
                      </button>
                      <button 
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Key className="h-4 w-4 mr-3" />
                        Change Password
                      </button>
                    </div>

                    <div className="border-t border-gray-100 pt-1">
                      <button 
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logout();
                          navigate('/login');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-6">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>

      {/* Modals would go here - for now we'll skip them since each page handles their own */}
    </div>
  );
};

export default PageHeader;