import React, { useState, useEffect } from 'react';
import { useToast } from '../../../components/common/ToastContext';
import { adminService } from '../repository/adminService';
import type { User, CreateUserRequest, UpdateUserRequest } from '../../../types';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Card from '../../../components/common/Card';
import { UserPlus, Edit, Trash2, RotateCcw, Key, Search } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await adminService.getUsers({ 
        search: searchQuery, 
        role: selectedRole,
        employee_type: selectedEmployeeType 
      });
      setUsers(response.data);
    } catch (error: any) {
      showToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      await adminService.deleteUser(user.id);
      showToast('User deleted successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleRestore = async (user: User) => {
    try {
      await adminService.restoreUser(user.id);
      showToast('User restored successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      showToast('Failed to restore user', 'error');
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
      
      showToast(message, 'success');
    } catch (error: any) {
      showToast('Failed to generate token', 'error');
    }
  };

  const columns = [
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and employees</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
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
          <Button variant="primary" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        <Table
          data={users}
          columns={columns}
          keyExtractor={(user) => user.id}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      </Card>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchUsers();
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
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
            fetchUsers();
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
            <p className="text-center text-2xl font-mono font-bold text-primary-600">
              {generatedToken}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            This token will expire in 7 days. Share it with the user to activate their account or reset their password.
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(generatedToken);
              showToast('Token copied to clipboard', 'success');
            }}
          >
            Copy Token
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// Create User Modal Component
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    role: 'cns',
    employee_type: 'CNS',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminService.createUser(formData);
      showToast('User created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create user';
      showToast(message, 'error');
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
  onSuccess: () => void;
}> = ({ isOpen, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    name: user.name,
    email: user.email,
    role: user.role,
    employee_type: user.employee?.employee_type || 'CNS',
    is_active: user.is_active,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminService.updateUser(user.id, formData);
      showToast('User updated successfully', 'success');
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user';
      showToast(message, 'error');
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

export default UsersPage;
