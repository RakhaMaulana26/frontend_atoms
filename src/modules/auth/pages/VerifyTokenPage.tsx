import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/common/ToastContext';
import { authService } from '../repository/authService';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Card from '../../../components/common/Card';

const VerifyTokenPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.verifyToken({ token });
      
      if (response.valid) {
        const isNewUser = !response.user?.has_password;
        const message = isNewUser 
          ? 'Token verified! Please set your password to activate your account.' 
          : 'Token verified! Please enter your new password.';
        
        showToast(message, 'success');
        navigate(`/set-password?token=${token}`);
      } else {
        showToast('Invalid or expired token', 'error');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Token verification failed';
      showToast(message, 'error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-700 mb-2">AIRNAV</h1>
          <p className="text-gray-600">Account Activation & Password Reset</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Token</h2>
              <p className="text-sm text-gray-600">
                Enter the activation code you received. This code can be used for account activation or password reset.
              </p>
            </div>

            <Input
              label="Activation / Reset Code"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              error={error}
              placeholder="ABC-XYZ123"
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Token'}
            </Button>

            <div className="text-center">
              <a
                href="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Login
              </a>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default VerifyTokenPage;
