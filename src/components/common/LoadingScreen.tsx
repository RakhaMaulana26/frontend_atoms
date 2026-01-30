import React from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Centralized Loading Screen Component
 * Used consistently across all pages for loading states
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Loading',
  subtitle = 'Please wait while we fetch the data...',
  icon: Icon
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-[#222E6A] mx-auto"></div>
          {Icon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-12 w-12 text-[#222E6A] opacity-50" />
            </div>
          )}
        </div>
        <p className="mt-6 text-lg font-semibold text-gray-800">{title}</p>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
