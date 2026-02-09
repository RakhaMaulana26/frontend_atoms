import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import Input from '../../common/Input';
import Select from '../../common/Select';
import { adminService } from '../../../services/adminService';
import type { User, CreateUserRequest } from '../../../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUser?: User | null, tempId?: number | string) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: '',
    email: '',
    role: 'Cns',
    employee_type: 'CNS',
    grade: undefined,
    is_active: true,
  });
  const [sendActivationEmail, setSendActivationEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // OPTIMISTIC UPDATE: Create temporary user object with complete employee structure
    const roleToEmployeeTypeMap: Record<string, string> = {
      'Admin': 'Administrator',
      'Cns': 'CNS',
      'Support': 'Support',
      'Manager Teknik': 'Manager Teknik',
      'General Manager': 'General Manager',
    };
    
    const tempId = `temp_${Date.now()}`; // Temporary ID as string
    const optimisticUser: any = {
      id: tempId,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      grade: formData.grade,
      is_active: formData.is_active,
      employee: {
        id: tempId,
        user_id: tempId,
        employee_type: roleToEmployeeTypeMap[formData.role] || formData.employee_type,
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
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
      
      // If send activation email is checked, generate token and send email
      if (sendActivationEmail) {
        try {
          const tokenResponse = await adminService.generateToken(newUser.id);
          await adminService.sendActivationCodeEmail(newUser.id, tokenResponse.token);
          toast.success('Activation code sent to email successfully!');
        } catch (emailError: any) {
          toast.error(emailError.response?.data?.message || 'Failed to send activation email');
        }
      }
      
      // Close modal after success
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'Cns',
        employee_type: 'CNS',
        grade: undefined,
        is_active: true,
      });
      setSendActivationEmail(false);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create User" size="lg" headerClassName="bg-[#222E6A] text-white flex items-center justify-between px-6 py-4 rounded-t-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              required
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <Select
              label="Position"
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
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
              required
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <Input
              label="Grade"
              type="number"
              value={formData.grade?.toString() || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, grade: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Enter grade"
              min="1"
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              }
            />
            <div className="col-span-2">
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
            </div>
          </div>
        </div>

        {/* Account Setup Section */}
        <div>
          <h3 className="text-sm font-semibold text-[#222E6A] mb-3">Account Setup</h3>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="sendActivationEmail"
              checked={sendActivationEmail}
              onChange={(e) => setSendActivationEmail(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A]"
            />
            <label htmlFor="sendActivationEmail" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-gray-700">Send activation email</div>
              <div className="text-xs text-gray-500 mt-1">
                User with status "Pending" will need to activate their account.
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t w-full -mx-6 px-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            isLoading={isLoading} 
            className="flex-1 bg-[#222E6A] hover:bg-[#1a2452]"
          >
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
