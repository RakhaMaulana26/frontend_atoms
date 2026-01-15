import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../../components/common/ToastContext';
import { authService } from '../repository/authService';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Card from '../../../components/common/Card';
import { CheckCircle, XCircle } from 'lucide-react';

const SetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [errors, setErrors] = useState<{ password?: string; passwordConfirmation?: string }>({});

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      showToast('Token is required', 'error');
      navigate('/verify-token');
      return;
    }

    // Verify token and check user status
    const verifyTokenStatus = async () => {
      try {
        const response = await authService.verifyToken({ token });
        if (response.valid) {
          setIsNewUser(!response.user?.has_password);
          setUserName(response.user?.name || '');
        } else {
          showToast('Invalid or expired token', 'error');
          navigate('/verify-token');
        }
      } catch (error) {
        showToast('Invalid or expired token', 'error');
        navigate('/verify-token');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyTokenStatus();
  }, [token, navigate, showToast]);

  const validatePassword = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
  };

  const validation = validatePassword(password);

  const validateForm = () => {
    const newErrors: { password?: string; passwordConfirmation?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = 'Please confirm your password';
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authService.setPassword({
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      
      const successMessage = response.action === 'activation' 
        ? 'Account activated successfully! You can now login.' 
        : 'Password reset successfully! You can now login with your new password.';
      
      showToast(successMessage, 'success');
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to set password';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-700 mb-2">AIRNAV</h1>
          <p className="text-gray-600">
            {isNewUser ? 'Activate Your Account' : 'Reset Your Password'}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isNewUser ? 'Set Password' : 'Reset Password'}
              </h2>
              {userName && (
                <p className="text-sm text-gray-600 mb-2">
                  Welcome, <span className="font-semibold">{userName}</span>!
                </p>
              )}
              <p className="text-sm text-gray-600">
                {isNewUser 
                  ? 'Create a strong password to activate your account'
                  : 'Enter your new password to reset your account'
                }
              </p>
            </div>

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Enter your password"
              autoComplete="new-password"
              autoFocus
            />

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Password requirements:</p>
                <div className="space-y-1">
                  <PasswordRequirement
                    met={validation.minLength}
                    text="At least 8 characters"
                  />
                  <PasswordRequirement
                    met={validation.hasUpperCase}
                    text="Contains uppercase letter"
                  />
                  <PasswordRequirement
                    met={validation.hasLowerCase}
                    text="Contains lowercase letter"
                  />
                  <PasswordRequirement
                    met={validation.hasNumber}
                    text="Contains number"
                  />
                </div>
              </div>
            )}

            <Input
              label="Confirm Password"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              error={errors.passwordConfirmation}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={!Object.values(validation).every((v) => v)}
            >
              {isLoading ? 'Setting Password...' : 'Set Password'}
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

const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className="flex items-center gap-2 text-xs">
    {met ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-300" />
    )}
    <span className={met ? 'text-green-700' : 'text-gray-500'}>{text}</span>
  </div>
);

export default SetPasswordPage;
