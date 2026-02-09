import React, { useState } from 'react';
import { Breadcrumbs, Modal, Button } from '../';
import AppHeader from './AppHeader';
import { useAuth } from '../../modules/auth/core/AuthContext';
import { LogOut } from 'lucide-react';

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
  const { logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <AppHeader 
        onProfileClick={() => {
          // You can add profile modal here if needed
          console.log('Profile clicked from PageHeader');
        }}
        onLogoutClick={() => setIsLogoutConfirmOpen(true)}
      />

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
              <LogOut className="h-5 w-5 text-red-600" />
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

export default PageHeader;
