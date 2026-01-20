import React from 'react';
import { Menu, X } from 'lucide-react';
import UserDropdown from './UserDropdown';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  toggleSidebar,
  onProfileClick,
  onSettingsClick,
  onLogoutClick
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/30 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>

        <UserDropdown
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onLogoutClick={onLogoutClick}
        />
      </div>
    </header>
  );
};

export default Header;