import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { authService } from '../../../modules/auth/repository/authService';
import Modal from '../../common/Modal';
import Button from '../../ui/Button';
import Input from '../../common/Input';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
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
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(formData);
      toast.success('Password changed successfully!');
      setFormData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      onClose();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
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

export default ChangePasswordModal;
