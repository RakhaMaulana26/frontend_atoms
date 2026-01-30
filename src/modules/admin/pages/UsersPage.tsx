import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../auth/core/AuthContext';
import { useDataCache } from '../../../contexts/DataCacheContext';
import PageHeader from '../../../components/layout/PageHeader';
import { adminService } from '../repository/adminService';
import { useDebounce } from '../../../hooks/useDebounce';
import type { User } from '../../../types';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import { Edit, Trash2, RotateCcw, Key, Users, Search, Plus, MoreVertical } from 'lucide-react';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { CreateUserModal, EditUserModal, TokenModal } from '../components';

const UsersPage: React.FC = () => {
  const { logout } = useAuth();
  const { users: cachedUsers, isInitialized, addUser, updateUser: updateCachedUser, removeUser } = useDataCache();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [lastGeneratedTime, setLastGeneratedTime] = useState(0);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  
  const isSendingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Filter users from cache
  const filteredUsers = useMemo(() => {
    return cachedUsers.filter(user => {
      const matchesSearch = !debouncedSearchQuery || 
        user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      const matchesRole = !selectedRole || user.role === selectedRole;
      const matchesEmployeeType = !selectedEmployeeType || 
        user.employee?.employee_type === selectedEmployeeType;
      
      return matchesSearch && matchesRole && matchesEmployeeType;
    });
  }, [cachedUsers, debouncedSearchQuery, selectedRole, selectedEmployeeType]);

  // Create user handler with optimistic updates
  const handleCreateSuccess = useCallback((newUser?: User | null, tempId?: number | string) => {
    if (newUser === null && tempId) {
      // Rollback - remove temporary user
      removeUser(tempId as any);
    } else if (newUser && tempId) {
      // Replace temporary user with real user
      removeUser(tempId as any);
      addUser(newUser);
    } else if (newUser) {
      // Add new user (optimistic)
      addUser(newUser);
    }
    setIsCreateModalOpen(false);
  }, [addUser, removeUser]);

  // Update user handler
  const handleUpdateSuccess = useCallback((updatedUser?: User) => {
    if (updatedUser) {
      updateCachedUser(updatedUser.id, updatedUser);
    }
    setIsEditModalOpen(false);
    setSelectedUser(null);
  }, [updateCachedUser]);

  // Generate token handler
  const handleGenerateToken = async (user: User) => {
    const now = Date.now();
    if (isGeneratingToken || (now - lastGeneratedTime < 3000)) {
      toast.warning('Please wait, token generation in progress...');
      return;
    }

    setSelectedUser(user);
    setIsTokenModalOpen(true);
    setIsGeneratingToken(true);
    setLastGeneratedTime(now);
    setGeneratedToken('');
    
    try {
      const response = await adminService.generateToken(user.id);
      setGeneratedToken(response.token);
      toast.success('Token generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate token');
      setIsTokenModalOpen(false);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Send email handler
  const handleSendTokenEmail = useCallback(async () => {
    if (!selectedUser || isSendingEmail || isSendingRef.current) {
      return;
    }
    
    const now = Date.now();
    if (now - lastSentTime < 60000) {
      toast.warning('Please wait at least 1 minute before sending another email');
      return;
    }
    
    setIsSendingEmail(true);
    isSendingRef.current = true;
    setLastSentTime(now);
    
    try {
      await adminService.sendActivationCodeEmail(selectedUser.id, generatedToken);
      toast.success('Activation code sent to email successfully!');
      setTimeout(() => setIsTokenModalOpen(false), 2000);
    } catch (error: any) {
      setLastSentTime(0);
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
      isSendingRef.current = false;
    }
  }, [selectedUser, generatedToken, isSendingEmail, lastSentTime]);

  // Copy token handler
  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(generatedToken);
    toast.success('Token copied to clipboard');
  }, [generatedToken]);

  // Delete user handler
  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      await adminService.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      updateCachedUser(selectedUser.id, { ...selectedUser, deleted_at: new Date().toISOString() });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  // Restore user handler
  const handleRestore = async (user: User) => {
    try {
      const restoredUser = await adminService.restoreUser(user.id);
      toast.success('User restored successfully');
      updateCachedUser(user.id, restoredUser);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore user');
    }
  };

  // Table columns definition
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => {
        const roleColors: Record<string, string> = {
          'Admin': 'bg-purple-100 text-purple-800',
          'Cns': 'bg-blue-100 text-blue-800',
          'Support': 'bg-green-100 text-green-800',
          'Manager Teknik': 'bg-orange-100 text-orange-800',
          'General Manager': 'bg-red-100 text-red-800',
        };
        const colorClass = roleColors[user.role] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {user.role}
          </span>
        );
      },
    },
    {
      key: 'employee_type',
      header: 'Employee Type',
      render: (user: User) => {
        const employeeType = user.employee?.employee_type || 'N/A';
        return employeeType
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (user: User) => {
        if (!user.last_login) return <span className="text-xs text-gray-400">Never</span>;
        const lastLogin = new Date(user.last_login);
        const now = new Date();
        const diffMs = now.getTime() - lastLogin.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeAgo = '';
        if (diffMins < 1) timeAgo = 'Just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
        else timeAgo = lastLogin.toLocaleDateString();
        
        return (
          <div className="text-xs">
            <div className="text-gray-700">{timeAgo}</div>
            <div className="text-gray-400">
              {lastLogin.toLocaleString('id-ID', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (user: User) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          user.deleted_at ? 'bg-red-100 text-red-800' :
          user.is_active ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.deleted_at ? 'Deleted' : user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="relative" ref={openDropdownId === user.id ? dropdownRef : null}>
          <button
            onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="More actions"
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>
          
          {openDropdownId === user.id && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                {!user.deleted_at ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditModalOpen(true);
                        setOpenDropdownId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span>Edit User</span>
                    </button>
                    <button
                      onClick={() => {
                        handleGenerateToken(user);
                        setOpenDropdownId(null);
                      }}
                      disabled={isGeneratingToken}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isGeneratingToken
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isGeneratingToken ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      ) : (
                        <Key className="h-4 w-4 text-green-600" />
                      )}
                      <span>Generate Token</span>
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        handleDelete(user);
                        setOpenDropdownId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete User</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleRestore(user);
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Restore User</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ], [isGeneratingToken, openDropdownId]);

  // Show loading if cache is not initialized
  if (!isInitialized) {
    return (
      <LoadingScreen 
        title="Loading Personnel Data"
        subtitle="Please wait while we fetch user information..."
        icon={Users}
      />
    );
  }

  return (
    <PageHeader
      title="User Management"
      subtitle="Manage system users and their permissions"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'User Management', href: '/admin/users' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Roles' },
                { value: 'Admin', label: 'Admin' },
                { value: 'Cns', label: 'CNS' },
                { value: 'Support', label: 'Support' },
                { value: 'Manager Teknik', label: 'Manager Teknik' },
                { value: 'General Manager', label: 'General Manager' },
              ]}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="min-w-[150px]"
            />
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'CNS', label: 'CNS' },
                { value: 'Support', label: 'Support' },
                { value: 'Manager Teknik', label: 'Manager Teknik' },
                { value: 'General Manager', label: 'General Manager' },
              ]}
              value={selectedEmployeeType}
              onChange={(e) => setSelectedEmployeeType(e.target.value)}
              className="min-w-[150px]"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#222E6A] hover:bg-[#1a2452]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <Table columns={columns} data={filteredUsers} keyExtractor={(user) => user.id.toString()} />
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          user={selectedUser}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        user={selectedUser}
        token={generatedToken}
        isGenerating={isGeneratingToken}
        isSending={isSendingEmail}
        onCopyToken={handleCopyToken}
        onSendEmail={handleSendTokenEmail}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title="Confirm Delete"
        size="sm"
        headerVariant="danger"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong>{selectedUser?.name}</strong>?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This action can be undone by restoring the user later.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
              }}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmDelete}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

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
    </PageHeader>
  );
};

export default UsersPage;
