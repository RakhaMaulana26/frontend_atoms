import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/core/AuthContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { toast } from 'react-toastify';
import { adminService } from '../modules/admin/repository/adminService';
import { authService } from '../modules/auth/repository/authService';
import type { User } from '../types';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import ActivityLogCard from '../components/activity/ActivityLogCard';
import { 
  Calendar, 
  Users, 
  Wrench, 
  Package, 
  ChevronRight,
  Bell,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Clock,
  Activity,
  Settings,
  BarChart3,
  Mail,
  Phone,
  MapPin,
  Globe,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  ArrowUp
} from 'lucide-react';

interface FeatureCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  link: string;
  badge?: string;
  allowedRoles?: string[];
}

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    unreadNotificationCount, 
    recentActivities,
    isLoading, 
    isInitialized,
    loadingStates,
    refreshActivities
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

  const categories: FeatureCategory[] = [
    {
      id: 'personnel',
      title: 'Employee Management',
      description: 'Manage employee records, roles, and organizational structure',
      icon: Users,
      color: 'bg-[#222E6A]',
      gradient: 'bg-gradient-to-br from-[#222E6A] to-[#454D7C]',
      link: '/personnel',
      allowedRoles: ['Admin']
    },
    {
      id: 'roster',
      title: 'Personnel & Rostering',
      description: 'Create and manage work schedules and shift assignments',
      icon: Calendar,
      color: 'bg-[#454D7C]',
      gradient: 'bg-gradient-to-br from-[#454D7C] to-[#222E6A]',
      link: '/roster'
    },
    {
      id: 'inventory',
      title: 'Supply & Administration',
      description: 'Track inventory, manage supplies and administrative resources',
      icon: Package,
      color: 'bg-[#222E6A]',
      gradient: 'bg-gradient-to-br from-[#222E6A]/80 to-[#454D7C]/80',
      link: '/inventory',
      allowedRoles: ['Admin', 'Manager Teknik', 'General Manager']
    },
    {
      id: 'maintenance',
      title: 'Maintenance & Operation',
      description: 'Schedule maintenance tasks and operational procedures',
      icon: Wrench,
      color: 'bg-[#454D7C]',
      gradient: 'bg-gradient-to-br from-[#454D7C]/80 to-[#222E6A]/80',
      link: '/maintenance',
      badge: 'New',
      allowedRoles: ['Admin', 'Manager Teknik']
    }
  ];

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (category.allowedRoles && category.allowedRoles.length > 0) {
        return user?.role && category.allowedRoles.includes(user.role);
      }
      return true;
    });
  }, [user?.role, categories]);

  const handleCategoryClick = useCallback((category: FeatureCategory) => {
    // Only navigate if system is initialized and not loading critical data
    if (isInitialized && !isLoading) {
      navigate(category.link);
    }
  }, [navigate, isInitialized, isLoading]);

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

        {/* System Modules Grid - Moved to top for easier access */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#222E6A]" />
            System Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-[#222E6A]/10 hover:border-[#222E6A]/20 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Badge */}
                {category.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-[#222E6A] to-[#454D7C] text-white rounded-full">
                      {category.badge}
                    </span>
                  </div>
                )}
                
                <div className="relative z-10">
                  <div className={`inline-flex p-3 rounded-xl ${category.color} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#222E6A] transition-colors">
                    {category.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {category.description}
                  </p>
                  
                  <div className="flex items-center text-[#222E6A] text-sm font-medium group-hover:gap-2 transition-all">
                    <span>Access Module</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule Banner */}
        <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] rounded-2xl p-8 text-white relative overflow-hidden mb-8">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-4 left-8 w-16 h-16 bg-white/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute top-12 right-16 w-8 h-8 bg-white/15 rounded-full blur-lg"></div>
              <div className="absolute bottom-8 left-12 w-12 h-12 bg-white/12 rounded-full blur-md animate-pulse delay-1000"></div>
              <div className="absolute bottom-16 right-8 w-6 h-6 bg-white/18 rounded-full blur-sm"></div>
              <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/8 rounded-full blur-2xl animate-pulse delay-500"></div>
              <div className="absolute top-1/3 right-1/3 w-14 h-14 bg-white/10 rounded-full blur-lg animate-pulse delay-2000"></div>
            </div>
          </div>
          
          {/* Geometric Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0,10 Q10,0 20,10 T40,10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4"/>
                  <path d="M0,15 Q10,5 20,15 T40,15" fill="none" stroke="white" strokeWidth="0.3" opacity="0.3"/>
                </pattern>
                <pattern id="curvedlines" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M0,15 Q15,5 30,15 Q15,25 0,15" fill="none" stroke="white" strokeWidth="0.4" opacity="0.2"/>
                </pattern>
                <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse">
                  <circle cx="12.5" cy="12.5" r="1" fill="white" opacity="0.15"/>
                  <circle cx="6" cy="6" r="0.5" fill="white" opacity="0.1"/>
                  <circle cx="18" cy="18" r="0.8" fill="white" opacity="0.12"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#waves)" />
              <rect width="100%" height="100%" fill="url(#curvedlines)" />
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>
          
          {/* Wave Animation Overlay */}
          <div className="absolute inset-0 opacity-8">
            <svg className="w-full h-full animate-pulse" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <path 
                d="M0,100 Q250,50 500,100 T1000,100 L1000,0 L0,0 Z" 
                fill="rgba(255,255,255,0.05)"
                className="animate-pulse"
              />
              <path 
                d="M0,200 Q250,150 500,200 T1000,200 L1000,100 L0,100 Z" 
                fill="rgba(255,255,255,0.03)"
                style={{ animationDelay: '1s' }}
                className="animate-pulse"
              />
              <path 
                d="M0,300 Q250,250 500,300 T1000,300 L1000,200 L0,200 Z" 
                fill="rgba(255,255,255,0.02)"
                style={{ animationDelay: '2s' }}
                className="animate-pulse"
              />
            </svg>
          </div>
          
          {/* Flowing Wave Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
                radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 1px, transparent 1px),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 15px,
                  rgba(255,255,255,0.03) 15px,
                  rgba(255,255,255,0.03) 16px
                )
              `,
              backgroundSize: '50px 50px, 30px 30px, 100% 100%'
            }}></div>
          </div>
          
          {/* Main Content */}
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
              <div className="mb-6 lg:mb-0">
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Today's Schedule
                </h3>
                <p className="text-lg opacity-90">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    On Schedule
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    7:00AM - 13:00PM
                  </span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => navigate('/roster')}
                  className="bg-white text-[#222E6A] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Calendar className="h-5 w-5" />
                  View Full Roster
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#222E6A]" />
                Recent Activity
              </h3>
              <button
                onClick={refreshActivities}
                className="text-sm text-[#222E6A] hover:text-[#1a2550] transition-colors"
                disabled={loadingStates.activities}
              >
                {loadingStates.activities ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {loadingStates.activities ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#222E6A]"></div>
                  Loading activities...
                </div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No recent activities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 3).map((activity) => (
                  <ActivityLogCard 
                    key={activity.id} 
                    activity={activity} 
                    isCompact={true}
                  />
                ))}
              </div>
            )}
            
            <button 
              onClick={() => navigate('/activity-log')}
              className="w-full mt-6 py-3 text-sm font-medium text-[#222E6A] hover:text-white hover:bg-[#222E6A] rounded-lg transition-colors border border-[#222E6A] hover:border-[#222E6A]"
            >
              View All Activities
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="/assets/image/image14.png" 
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">A</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">AIRNAV Management</h3>
                  <p className="text-sm opacity-80">Integrated Aviation Solutions</p>
                </div>
              </div>
              <p className="text-sm opacity-90 leading-relaxed mb-6 max-w-md">
                Comprehensive aviation management system designed to streamline operations, 
                enhance safety protocols, and optimize resource allocation for modern aviation facilities.
              </p>
              <div className="flex items-center gap-4">
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Facebook className="h-5 w-5" />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Twitter className="h-5 w-5" />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Instagram className="h-5 w-5" />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Linkedin className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/roster')}
                  className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Personnel & Rostering
                </button>
                <button 
                  onClick={() => navigate('/personnel')}
                  className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Employee Management
                </button>
                <button 
                  onClick={() => navigate('/maintenance')}
                  className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Maintenance & Operation
                </button>
                <button 
                  onClick={() => navigate('/inventory')}
                  className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Supply & Administration
                </button>
                <button 
                  onClick={() => navigate('/support')}
                  className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Support Center
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <span className="text-sm opacity-90">
                    Jakarta Aviation Hub<br />
                    Indonesia Aviation Authority
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <span className="text-sm opacity-90">+62 21 xxxx-xxxx</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <span className="text-sm opacity-90">info@airnav.co.id</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 flex-shrink-0 opacity-80" />
                  <span className="text-sm opacity-90">www.airnav.co.id</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collaboration Section */}
          <div className="border-t border-white/10 py-8">
            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold mb-2">In Collaboration With</h4>
              <p className="text-sm opacity-80">Supporting partnerships for aviation excellence</p>
            </div>
            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/15 transition-colors">
                <img 
                  src="/assets/icon/logopens.svg" 
                  alt="PENS Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-sm font-medium opacity-90">PENS</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/15 transition-colors">
                <img 
                  src="/assets/icon/logougm.svg" 
                  alt="UGM Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-sm font-medium opacity-90">UGM</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm opacity-80">
                © 2026 AIRNAV Management System. All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-sm">
                <button 
                  onClick={() => navigate('/privacy')}
                  className="opacity-80 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => navigate('/terms')}
                  className="opacity-80 hover:opacity-100 hover:text-blue-300 transition-colors"
                >
                  Terms of Service
                </button>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  Top
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

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

// Profile Modal Component
const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onChangePassword: () => void;
}> = ({ isOpen, onClose, user, onChangePassword }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    employee_type: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { updateUser } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        employee_type: user.employee?.employee_type || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    
    const optimisticUser: User = {
      ...user,
      name: formData.name,
      email: formData.email,
      role: formData.role as any,
      employee: user.employee ? {
        ...user.employee,
        employee_type: formData.employee_type as any
      } : undefined,
    };
    
    updateUser(optimisticUser);
    
    try {
      const updatedUser = await adminService.updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role as any,
        employee_type: formData.employee_type as any,
        is_active: user.is_active,
      });
      
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error: any) {
      updateUser(user);
      console.error('Error updating profile:', error);
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile Settings" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-[#222E6A] rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <Input
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'admin', label: 'Administrator' },
            { value: 'manager', label: 'Manager' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'staff', label: 'Staff' },
          ]}
          required
        />

        <Select
          label="Employee Type"
          value={formData.employee_type}
          onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
          options={[
            { value: 'pilot', label: 'Pilot' },
            { value: 'air_traffic_controller', label: 'Air Traffic Controller' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'ground_crew', label: 'Ground Crew' },
            { value: 'administrative', label: 'Administrative' },
          ]}
        />

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onChangePassword} className="flex-1">
            Change Password
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Change Password Modal Component
const ChangePasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.new_password_confirmation) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(formData);
      toast.success('Password changed successfully!');
      setFormData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      onClose();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={formData.current_password}
          onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
          required
        />
        <Input
          label="New Password"
          type="password"
          value={formData.new_password}
          onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={formData.new_password_confirmation}
          onChange={(e) => setFormData({ ...formData, new_password_confirmation: e.target.value })}
          required
        />

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            Change Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default HomePage;