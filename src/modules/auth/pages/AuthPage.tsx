import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/AuthContext';
import { useToast } from '../../../components/common/ToastContext';
import { authService } from '../repository/authService';
import AirnavLogo from '../../../assets/Airnav.svg';
import { ChevronLeft, Eye, EyeOff, Mail, CheckCircle, KeyRound } from 'lucide-react';

type AuthView = 'login' | 'activate' | 'forgot-password' | 'forgot-password-success' | 'reset-code' | 'set-password';

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<'login' | 'activate'>('login');
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Activate state
  const [activationCode, setActivationCode] = useState('');
  
  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  
  // Reset code state
  const [resetCode, setResetCode] = useState('');
  
  // Set password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password });
      showToast('Login successful!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Activate Handler
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode || activationCode.trim().length === 0) {
      showToast('Please enter your activation code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.verifyToken({ token: activationCode.trim() });
      if (response.valid) {
        setVerifiedToken(activationCode.trim());
        setIsNewUser(!response.user?.has_password);
        showToast('Code verified! Please set your password.', 'success');
        setCurrentView('set-password');
      } else {
        showToast('Invalid or expired code', 'error');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Code verification failed';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('Please enter your email address', 'error');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email: forgotEmail });
      showToast(response.message, 'success');
      setCurrentView('forgot-password-success');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset code. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Code Handler
  const handleResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || resetCode.trim().length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.verifyToken({ token: resetCode.trim() });
      if (response.valid) {
        setVerifiedToken(resetCode.trim());
        setIsNewUser(false);
        showToast('Code verified! Please enter your new password.', 'success');
        setCurrentView('set-password');
      } else {
        showToast('Invalid or expired code', 'error');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Code verification failed';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Set Password Handler
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await authService.setPassword({
        token: verifiedToken,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      const message = isNewUser 
        ? 'Account activated successfully! You can now log in.' 
        : 'Password reset successfully! You can now log in with your new password.';
      showToast(message, 'success');
      // Reset all states
      setCurrentView('login');
      setActiveTab('login');
      setEmail('');
      setPassword('');
      setActivationCode('');
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setVerifiedToken('');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to set password';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentView === 'login') {
      navigate('/');
    } else if (currentView === 'activate') {
      setCurrentView('login');
      setActiveTab('login');
    } else if (currentView === 'forgot-password' || currentView === 'forgot-password-success') {
      setCurrentView('login');
      setActiveTab('login');
    } else if (currentView === 'reset-code') {
      setCurrentView('forgot-password');
    } else if (currentView === 'set-password') {
      setCurrentView('login');
      setActiveTab('login');
    }
  };

  const handleTabChange = (tab: 'login' | 'activate') => {
    setActiveTab(tab);
    setCurrentView(tab);
  };

  const getTitle = () => {
    switch (currentView) {
      case 'login':
      case 'activate':
        return activeTab === 'login' ? 'Welcome Back!' : 'Activate Your Account';
      case 'forgot-password':
        return 'Forgot Password?';
      case 'forgot-password-success':
        return 'Check Your Email';
      case 'reset-code':
        return 'Enter Reset Code';
      case 'set-password':
        return isNewUser ? 'Set Your Password' : 'Reset Your Password';
      default:
        return 'Welcome Back!';
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case 'login':
        return 'Sign in to access your account.';
      case 'activate':
        return 'Enter your admin-generated activation code.';
      case 'forgot-password':
        return 'Enter your email and we\'ll send you a code to reset your password.';
      case 'forgot-password-success':
        return '';
      case 'reset-code':
        return `Enter the 6-digit code we sent to ${forgotEmail}`;
      case 'set-password':
        return isNewUser ? 'Create a secure password for your account.' : 'Enter your new password.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md bg-[#D8DAED] rounded-3xl shadow-xl p-8 animate-fade-scale-up">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-[#4A5578] hover:text-[#2C3558] mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Logo and Title */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={AirnavLogo} alt="AirNav Logo" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-[#2C3558]">ATOMS</h1>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-6">
          {currentView === 'reset-code' && (
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-full p-4 shadow-md">
                <KeyRound className="text-[#222E6A]" size={32} />
              </div>
            </div>
          )}
          {currentView === 'forgot-password-success' && (
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
            </div>
          )}
          <h2 className="text-xl font-semibold text-[#2C3558] mb-1">{getTitle()}</h2>
          {getSubtitle() && <p className="text-sm text-[#7B8199]">{getSubtitle()}</p>}
        </div>

        {/* Tabs - Only show for login/activate */}
        {(currentView === 'login' || currentView === 'activate') && (
          <div className="relative bg-white rounded-xl p-1 mb-6 shadow-sm">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#222E6A] rounded-lg transition-transform duration-300 ease-out shadow-md ${
                activeTab === 'activate' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'
              }`}
            />
            <div className="relative flex gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors duration-300 z-10 ${
                  activeTab === 'login' ? 'text-white' : 'text-[#7B8199] hover:text-[#5A6382]'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('activate')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors duration-300 z-10 ${
                  activeTab === 'activate' ? 'text-white' : 'text-[#7B8199] hover:text-[#5A6382]'
                }`}
              >
                Activate Account
              </button>
            </div>
          </div>
        )}

        {/* Content Views */}
        {/* Login Form */}
        {currentView === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5 animate-slide-in-left">
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@airnav.com"
                className="w-full px-4 py-3 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] shadow-md"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] pr-12 shadow-md"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B8199] hover:text-[#2C3558] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#7B8199] text-[#2C3558] focus:ring-[#2C3558] cursor-pointer"
                />
                <span className="text-[#5A6382]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setCurrentView('forgot-password')}
                className="text-[#7B8199] hover:text-[#2C3558] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-xs text-center text-[#7B8199] mt-6">
              By continuing, you agree to our{' '}
              <a href="#" className="text-[#5A6382] hover:text-[#2C3558] underline">Terms & Conditions</a>
              {' '}and{' '}
              <a href="#" className="text-[#5A6382] hover:text-[#2C3558] underline">Privacy Policy</a>.
            </p>
          </form>
        )}

        {/* Activate Form */}
        {currentView === 'activate' && (
          <form onSubmit={handleActivate} className="space-y-5 animate-slide-in-right">
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">Activation Code</label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="XXX-XXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] shadow-md text-center text-2xl tracking-wider font-mono"
                maxLength={10}
                autoFocus
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-800">
                <strong>📧 Check your notification</strong><br />
                Your administrator has generated an activation code for you (format: XXX-XXXXXX).
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Continue to Activate'}
            </button>
            <p className="text-xs text-center text-[#7B8199]">
              Don't have an activation code?{' '}
              <span className="text-[#5A6382]">Contact your administrator</span>
            </p>
          </form>
        )}

        {/* Forgot Password Form */}
        {currentView === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-scale-up">
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="example@airnav.com"
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] shadow-md"
                  autoComplete="email"
                  autoFocus
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B8199]" size={20} />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <div className="mt-4 text-center">
              <p className="text-xs text-[#7B8199]">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('login');
                    setActiveTab('login');
                  }}
                  className="text-[#222E6A] hover:text-[#1a2550] font-medium underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Forgot Password Success */}
        {currentView === 'forgot-password-success' && (
          <div className="text-center py-8 animate-fade-scale-up">
            <p className="text-sm text-[#7B8199] mb-6">
              We've sent a 6-digit password reset code to <strong>{forgotEmail}</strong>. 
              Please check your inbox and enter the code to reset your password.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setCurrentView('reset-code')}
                className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                Enter Reset Code
              </button>
              <button
                onClick={() => {
                  setCurrentView('login');
                  setActiveTab('login');
                }}
                className="w-full bg-white hover:bg-gray-50 text-[#222E6A] font-medium py-3 rounded-xl transition-all shadow-sm"
              >
                Back to Login
              </button>
            </div>
            <p className="text-xs text-[#7B8199] mt-6">
              Didn't receive the code?{' '}
              <button
                onClick={() => {
                  setCurrentView('forgot-password');
                  setForgotEmail('');
                }}
                className="text-[#222E6A] hover:text-[#1a2550] font-medium underline"
              >
                Try again
              </button>
            </p>
          </div>
        )}

        {/* Reset Code Form */}
        {currentView === 'reset-code' && (
          <form onSubmit={handleResetCode} className="space-y-6 animate-fade-scale-up">
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-3 text-center">Password Reset Code</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] shadow-md text-center text-4xl tracking-[0.5em] font-bold"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
              />
            </div>
            <div className="bg-white border-l-4 border-[#222E6A] rounded-lg p-4 shadow-sm">
              <p className="text-xs text-[#4A5578]">
                <strong>🔐 Password Reset Code</strong><br />
                This is a 6-digit numeric code sent to your email. The code will expire in 24 hours.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || resetCode.length !== 6}
              className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Code & Reset Password'}
            </button>
            <div className="text-center space-y-3 pt-2">
              <p className="text-xs text-[#7B8199]">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('forgot-password')}
                  className="text-[#222E6A] hover:text-[#1a2550] font-semibold underline"
                >
                  Resend code
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Set Password Form */}
        {currentView === 'set-password' && (
          <form onSubmit={handleSetPassword} className="space-y-5 animate-fade-scale-up">
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] pr-12 shadow-md"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B8199] hover:text-[#2C3558] transition-colors"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2C3558] mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 rounded-xl bg-white border-none focus:outline-none focus:ring-2 focus:ring-[#222E6A] text-[#2C3558] placeholder:text-[#B0B6C7] pr-12 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B8199] hover:text-[#2C3558] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-800 font-semibold mb-2">Password Requirements:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  • At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                  • Contains uppercase letter
                </li>
                <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                  • Contains lowercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  • Contains number
                </li>
              </ul>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#222E6A] hover:bg-[#1a2550] text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting Password...' : isNewUser ? 'Activate Account' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
