import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '../../types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Avatar from '../ui/Avatar';

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

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        employee_type: (user as any).employee_type || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Handle profile update logic here
      console.log('Profile update:', formData);
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center mb-6">
            <Avatar variant="primary" size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your full name"
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter your email"
              required
            />

            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'pilot', label: 'Pilot' },
                { value: 'crew', label: 'Crew Member' },
                { value: 'manager', label: 'Manager' }
              ]}
              required
            />

            <Select
              label="Employee Type"
              value={formData.employee_type}
              onChange={(e) => handleChange('employee_type', e.target.value)}
              options={[
                { value: 'full_time', label: 'Full Time' },
                { value: 'part_time', label: 'Part Time' },
                { value: 'contractor', label: 'Contractor' }
              ]}
              required
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                Save Changes
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onChangePassword}
                className="flex-1"
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;