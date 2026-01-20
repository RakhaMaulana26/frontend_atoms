import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../auth/core/AuthContext';
import { useDataCache } from '../../../contexts/DataCacheContext';
import PageHeader from '../../../components/layout/PageHeader';
import { adminService } from '../repository/adminService';
import { authService } from '../../auth/repository/authService';
import { useDebounce } from '../../../hooks/useDebounce';
import type { User, CreateUserRequest, UpdateUserRequest } from '../../../types';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import { Edit, Trash2, RotateCcw, Key, Users, Search, Plus, LogOut } from 'lucide-react';

const UsersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { users: cachedUsers, isLoading: cacheLoading, isInitialized, addUser, updateUser: updateCachedUser, removeUser } = useDataCache();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');
  
  // All useState hooks must be declared before any conditional returns
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Debounce search query for client-side filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Filter users from cache based on search and filters
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

  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(generatedToken);
    toast.success('Token copied to clipboard');
  }, [generatedToken]);

  // Memoize columns definition to avoid recreating on every render
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
          user.role === 'gm' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.role.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'employee_type',
      header: 'Employee Type',
      render: (user: User) => user.employee?.employee_type || '-',
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
        <div className="flex gap-2">
          {!user.deleted_at ? (
            <>
              <button
                onClick={() => {
                  setSelectedUser(user);
                  setIsEditModalOpen(true);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleGenerateToken(user)}
                className="text-green-600 hover:text-green-800"
                title="Generate Activation/Reset Code"
              >
                <Key className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(user)}
                className="text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleRestore(user)}
              className="text-green-600 hover:text-green-800"
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ], []);

  // Show loading if cache is not initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#454D7C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application data...</p>
        </div>
      </div>
    );
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    // Optimistic update: remove from cache first
    removeUser(selectedUser.id);
    setIsDeleteModalOpen(false);
    const deletedUser = selectedUser;
    setSelectedUser(null);
    
    try {
      await adminService.deleteUser(deletedUser.id);
      toast.success('User deleted successfully');
      // No fetch - pure optimistic update!
    } catch (error: any) {
      // Rollback if failed - re-add user to cache
      addUser(deletedUser);
      toast.error('Failed to delete user');
    }
  };

  const handleRestore = async (user: User) => {
    // Optimistic update: restore di cache dulu
    const restoredUser = { ...user, deleted_at: null };
    updateCachedUser(user.id, restoredUser);
    
    try {
      await adminService.restoreUser(user.id);
      toast.success('User restored successfully');
      // No fetch - pure optimistic update!
    } catch (error: any) {
      // Rollback jika gagal
      updateCachedUser(user.id, user);
      toast.error('Failed to restore user');
    }
  };

  const handleGenerateToken = async (user: User) => {
    try {
      const response = await adminService.generateToken(user.id);
      setGeneratedToken(response.token);
      setSelectedUser(user);
      setIsTokenModalOpen(true);
      
      const purpose = response.purpose || 'activation';
      const message = purpose === 'activation' 
        ? 'Activation code generated successfully!' 
        : 'Password reset code generated successfully!';
      
      toast.success(message);
    } catch (error: any) {
      toast.error('Failed to generate token');
    }
  };

  const handleSendTokenEmail = async () => {
    if (!selectedUser) return;
    
    setIsSendingEmail(true);
    try {
      await adminService.sendActivationCodeEmail(selectedUser.id, generatedToken);
      toast.success('Activation code sent to email successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <PageHeader
      title="Personnel Management"
      subtitle="Manage system users and their permissions"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Personnel Management', href: '/admin/users' }
      ]}
    >
      {/* Header Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[#222E6A]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <p className="text-gray-600 text-sm">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#222E6A] hover:bg-[#1a2550] text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>
        
      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All Roles' },
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'gm', label: 'GM' },
            { value: 'cns', label: 'CNS' },
            { value: 'support', label: 'Support' },
          ]}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All Employee Types' },
            { value: 'CNS', label: 'CNS' },
            { value: 'SUPPORT', label: 'SUPPORT' },
            { value: 'MANAGER', label: 'MANAGER' },
          ]}
          value={selectedEmployeeType}
          onChange={(e) => setSelectedEmployeeType(e.target.value)}
        />
      </div>
      </div>

      <Table
        data={filteredUsers}
        columns={columns}
        keyExtractor={(user) => user.id}
        isLoading={cacheLoading}
        emptyMessage="No users found"
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newUser, tempId) => {
          if (tempId) {
            // Replace or remove temporary user
            if (newUser) {
              // Replace temporary with real user in cache
              updateCachedUser(tempId, newUser);
            } else {
              // Rollback - remove temporary user if failed
              removeUser(tempId);
            }
          } else if (newUser) {
            // Direct add if no tempId
            addUser(newUser);
          }
          
          if (newUser) {
            setIsCreateModalOpen(false);
          }
        }}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          user={selectedUser}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={(updatedUser) => {
            // Optimistic update: update user di cache
            if (updatedUser) {
              updateCachedUser(updatedUser.id, updatedUser);
            }
            setIsEditModalOpen(false);
            setSelectedUser(null);
            // No fetch - using caching from optimistic update!
          }}
        />
      )}

      {/* Token Display Modal */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        title="Token Generated"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Token has been generated for <strong>{selectedUser?.name}</strong>
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-center text-2xl font-mono font-bold text-[#222E6A]">
              {generatedToken}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            This token will expire in 7 days. You can send it to the user's email or copy it to share manually.
          </p>
          <div className="flex gap-3">
            <Button
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleSendTokenEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span>Send to Email</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleCopyToken}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              <span>Copy Code</span>
            </Button>
          </div>
        </div>
      </Modal>

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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <strong className="text-gray-900">{selectedUser?.name}</strong>?
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onProfileUpdate={(updatedUser) => {
          // Update users cache if updated user exists in list
          updateCachedUser(updatedUser.id, updatedUser);
        }}
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
    </PageHeader>
  );
};

// Create User Modal Component
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUser?: User | null, tempId?: number) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    role: 'cns',
    employee_type: 'CNS',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // OPTIMISTIC UPDATE: Create temporary user object
    const tempId = Date.now(); // Temporary ID
    const optimisticUser: any = {
      id: tempId,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      is_active: formData.is_active,
      employee: {
        employee_type: formData.employee_type
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    
    // Update UI immediately with optimistic data
    onSuccess(optimisticUser);

    try {
      // Send to backend in background
      const newUser = await adminService.createUser(formData);
      toast.success('User created successfully');
      
      // Replace temporary user with real user from server
      onSuccess(newUser, tempId);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create user';
      toast.error(message);
      // Rollback - hapus temporary user
      onSuccess(null, tempId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Select
          label="Role"
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'gm', label: 'GM' },
            { value: 'cns', label: 'CNS' },
            { value: 'support', label: 'Support' },
          ]}
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
        />
        <Select
          label="Employee Type"
          options={[
            { value: 'CNS', label: 'CNS' },
            { value: 'Support', label: 'Support' },
            { value: 'Manager', label: 'Manager' },
          ]}
          value={formData.employee_type}
          onChange={(e) => setFormData({ ...formData, employee_type: e.target.value as any })}
        />
        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit User Modal Component
const EditUserModal: React.FC<{
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser?: User) => void;
}> = ({ isOpen, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    name: user.name,
    email: user.email,
    role: user.role,
    employee_type: user.employee?.employee_type || 'CNS',
    is_active: user.is_active,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync formData when user prop changes
  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      employee_type: user.employee?.employee_type || 'CNS',
      is_active: user.is_active,
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // OPTIMISTIC UPDATE: Update cache FIRST before API call
    const optimisticUser: User = {
      ...user,
      name: formData.name || user.name,
      email: formData.email || user.email,
      role: (formData.role || user.role) as any,
      is_active: formData.is_active ?? user.is_active,
      employee: user.employee ? {
        ...user.employee,
        employee_type: (formData.employee_type || user.employee.employee_type) as any
      } : undefined,
    };
    
    // Update UI immediately with optimistic data
    onSuccess(optimisticUser);

    try {
      // Send to backend in background
      const updatedUser = await adminService.updateUser(user.id, formData);
      toast.success('User updated successfully');
      
      // Update again with real data from server (if there are differences)
      onSuccess(updatedUser);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user';
      toast.error(message);
      // Rollback to original data if failed
      onSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Select
          label="Role"
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'gm', label: 'GM' },
            { value: 'cns', label: 'CNS' },
            { value: 'support', label: 'Support' },
          ]}
          value={formData.role || ''}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
        />
        <Select
          label="Employee Type"
          options={[
            { value: 'CNS', label: 'CNS' },
            { value: 'Support', label: 'Support' },
            { value: 'Manager', label: 'Manager' },
          ]}
          value={formData.employee_type || ''}
          onChange={(e) => setFormData({ ...formData, employee_type: e.target.value as any })}
        />
        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            Update User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Profile Modal Component
const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onProfileUpdate?: (updatedUser: User) => void;
  onChangePassword: () => void;
  onLogout: () => void;
}> = ({ isOpen, onClose, user, onProfileUpdate, onChangePassword, onLogout }) => {
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
    
    // OPTIMISTIC UPDATE: Update UI DULU sebelum API call
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
    
    // Update context dan parent state immediately
    updateUser(optimisticUser);
    if (onProfileUpdate) {
      onProfileUpdate(optimisticUser);
    }
    
    try {
      // Send to backend in background
      const updatedUser = await adminService.updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role as any,
        employee_type: formData.employee_type as any,
        is_active: user.is_active,
      });
      
      // Update lagi dengan data real dari server
      updateUser(updatedUser);
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }
      
      toast.success('Profile updated successfully');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update profile');
      // Rollback ke data original jika gagal
      updateUser(user);
      if (onProfileUpdate) {
        onProfileUpdate(user);
      }
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

export default UsersPage;
