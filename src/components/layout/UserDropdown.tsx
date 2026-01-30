import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../modules/auth/core/AuthContext';
import Avatar from '../ui/Avatar';

interface UserDropdownProps {
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  onProfileClick,
  onSettingsClick,
  onLogoutClick
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Avatar variant="primary" size="md" />
        <span className="hidden md:block text-sm font-medium text-gray-700">
          {user?.role?.toUpperCase()}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onProfileClick();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
          >
            <UserIcon className="h-4 w-4" />
            Profile Settings
          </button>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onSettingsClick();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          
          <hr className="my-2 border-gray-100" />
          
          <button
            onClick={() => {
              setIsOpen(false);
              onLogoutClick();
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;