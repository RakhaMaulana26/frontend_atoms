import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import Input from '../../common/Input';
import Select from '../../common/Select';
import { adminService } from '../../../services/adminService';
import type { User, UpdateUserRequest } from '../../../types';

interface EditUserModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser?: User) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    name: user.name,
    email: user.email,
    role: user.role,
    employee_type: user.employee?.employee_type || 'CNS',
    grade: user.grade,
    is_active: user.is_active,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync formData when user prop changes
  useEffect(() => {
    // Ensure employee_type matches role using consistent mapping
    const roleToEmployeeTypeMap: Record<string, string> = {
      'Admin': 'Administrator',
      'Cns': 'CNS', 
      'Support': 'Support',
      'Manager Teknik': 'Manager Teknik',
      'General Manager': 'General Manager',
    };
    
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      employee_type: (roleToEmployeeTypeMap[user.role] || user.employee?.employee_type || 'CNS') as any,
      grade: user.grade,
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
      grade: formData.grade,
      is_active: formData.is_active ?? user.is_active,
      employee: user.employee ? {
        ...user.employee,
        employee_type: formData.employee_type || user.employee.employee_type,
        is_active: formData.is_active ?? user.employee.is_active,
      } : undefined,
    };
    
    // Update UI immediately with optimistic data
    onSuccess(optimisticUser);
    onClose();

    try {
      // Send to backend in background
      const updatedUser = await adminService.updateUser(user.id, formData);
      toast.success('User updated successfully');
      
      // Replace with real data from server
      onSuccess(updatedUser);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user';
      toast.error(message);
      // Rollback - restore original user
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
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Input
          label="Grade"
          type="number"
          value={formData.grade?.toString() || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, grade: e.target.value ? parseInt(e.target.value) : undefined })}
          placeholder="Enter grade"
          min="1"
        />
        <Select
          label="Role"
          options={[
            { value: 'Admin', label: 'Administrator' },
            { value: 'Cns', label: 'CNS' },
            { value: 'Support', label: 'Support' },
            { value: 'Manager Teknik', label: 'Manager Teknik' },
            { value: 'General Manager', label: 'General Manager' },
          ]}
          value={formData.role}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const role = e.target.value;
            const employeeTypeMap: Record<string, string> = {
              'Admin': 'Administrator',
              'Cns': 'CNS',
              'Support': 'Support',
              'Manager Teknik': 'Manager Teknik',
              'General Manager': 'General Manager',
            };
            setFormData({ 
              ...formData, 
              role: role as any, 
              employee_type: employeeTypeMap[role] as any 
            });
          }}
        />
        <Select
          label="Employee Type"
          options={[
            { value: 'Administrator', label: 'Administrator' },
            { value: 'CNS', label: 'CNS' },
            { value: 'Support', label: 'Support' },
            { value: 'Manager Teknik', label: 'Manager Teknik' },
            { value: 'General Manager', label: 'General Manager' },
          ]}
          value={formData.employee_type}
          disabled={true}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, employee_type: e.target.value as any })}
          helperText="Employee type is automatically set based on selected role"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A]"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Active User
          </label>
        </div>
        <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]">
            Update User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
