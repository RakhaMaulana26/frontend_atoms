import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../modules/auth/core/AuthContext';
import { adminService } from '../../modules/admin/repository/adminService';
import type { User } from '../../types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onChangePassword: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onChangePassword 
}) => {
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

export default ProfileModal;
