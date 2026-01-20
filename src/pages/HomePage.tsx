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
import { 
  Calendar, 
  Users, 
  Wrench, 
  Package, 
  ChevronRight,
  Bell,
  User as UserIcon,
  ChevronDown,
  LogOut
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
  const { unreadNotificationCount } = useDataCache();
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
      id: 'rostering',
      title: 'Rostering',
      description: 'Manage employee shift schedules and rostering',
      icon: Calendar,
      color: 'bg-[#454D7C]',
      gradient: 'from-[#454D7C] to-[#222E6A]',
      link: '/rosters',
    },
    {
      id: 'personnel',
      title: 'Personnel Management',
      description: 'Manage personnel and employee data',
      icon: Users,
      color: 'bg-[#454D7C]',
      gradient: 'from-[#454D7C] to-[#222E6A]',
      link: '/admin/users',
      badge: 'Admin',
      allowedRoles: ['admin'],
    },
    {
      id: 'maintenance',
      title: 'Maintenance & Operation',
      description: 'Equipment maintenance and operational management',
      icon: Wrench,
      color: 'bg-[#454D7C]',
      gradient: 'from-[#454D7C] to-[#222E6A]',
      link: '/maintenance',
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      description: 'Manage company inventory and assets',
      icon: Package,
      color: 'bg-[#454D7C]',
      gradient: 'from-[#454D7C] to-[#222E6A]',
      link: '/inventory',
    },
  ];

  // Filter categories based on user role - memoized to avoid recalculation
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      // If category has allowedRoles, check if user role is in the list
      if (category.allowedRoles && category.allowedRoles.length > 0) {
        return user?.role && category.allowedRoles.includes(user.role);
      }
      return true;
    });
  }, [user?.role, categories]);

  const handleCategoryClick = useCallback((category: FeatureCategory) => {
    navigate(category.link);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-[#222E6A]">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome,</h1>
                <p className="text-sm opacity-90">{user?.name || 'User'}</p>
                <span className="inline-block mt-1 px-3 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                  {user?.role?.toUpperCase() || 'MEMBER'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/notifications')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
              >
                <Bell className="h-6 w-6" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <UserIcon className="h-6 w-6" />
                  <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            AIRNAV Management System
          </h2>
          <p className="text-gray-600">
            Integrated system for managing rostering, personnel, maintenance, and inventory
          </p>
        </div>

        {/* Category Title */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Select Category</h3>
          <p className="text-sm text-gray-600">Access available features</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            
            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden h-full">
                  {/* Icon Section with Gradient */}
                  <div className={`bg-gradient-to-br ${category.gradient} p-6 relative`}>
                    <div className="flex items-center justify-between">
                      <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      {category.badge && (
                        <span className="px-3 py-1 bg-white/90 text-xs font-semibold rounded-full text-gray-700">
                          {category.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#454D7C] transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {category.description}
                    </p>
                    
                    <div className="flex items-center text-[#454D7C] text-sm font-medium group-hover:text-[#222E6A]">
                      <span>Open</span>
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-gradient-to-r from-[#454D7C] to-[#222E6A] rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="text-xl font-bold mb-2">Need Help?</h3>
              <p className="text-sm opacity-90">
                Contact our support team for further assistance
              </p>
            </div>
            <button 
              onClick={() => navigate('/support')}
              className="bg-white text-[#222E6A] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onChangePassword={() => {
          setIsProfileModalOpen(false);
          setIsChangePasswordModalOpen(true);
        }}
        onLogout={() => {
          setIsProfileModalOpen(false);
          setIsLogoutConfirmOpen(true);
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
  onLogout: () => void;
}> = ({ isOpen, onClose, user, onChangePassword, onLogout }) => {
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
    
    // OPTIMISTIC UPDATE: Update UI first before API call
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
    
    // Update context immediately
    updateUser(optimisticUser);
    
    try {
      // Send to backend in background
      const updatedUser = await adminService.updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role as any,
        employee_type: formData.employee_type as any,
        is_active: user.is_active,
      });
      
      // Update again with real data from server
      updateUser(updatedUser);
      
      toast.success('Profile updated successfully');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update profile');
      // Rollback to original data if failed
      updateUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Profile" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#454D7C] to-[#222E6A] flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-gray-600">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#D8DAED] text-[#222E6A]">
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={!isAdmin}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={!isAdmin}
          required
        />
        <Select
          label="Role"
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'gm', label: 'GM' },
            { value: 'cns', label: 'CNS' },
          ]}
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          disabled={!isAdmin}
        />
        <Select
          label="Employee Type"
          options={[
            { value: 'CNS', label: 'CNS' },
            { value: 'Support', label: 'Support' },
            { value: 'Manager', label: 'Manager' },
          ]}
          value={formData.employee_type}
          onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
          disabled={!isAdmin}
        />

        <div className="border-t pt-4 mt-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={onChangePassword}
            className="w-full"
          >
            Change Password
          </Button>

          {isAdmin && (
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full"
            >
              Save Changes
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="w-full text-red-600 border-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
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
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(formData);
      toast.success('Password changed successfully');
      onClose();
      setFormData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Your password must be at least 8 characters long.
          </p>
        </div>

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
