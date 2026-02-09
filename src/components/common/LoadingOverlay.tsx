import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  variant?: 'overlay' | 'replace' | 'blur';
}

/**
 * LoadingOverlay - Wraps content with loading state
 * 
 * Variants:
 * - overlay: Shows spinner on top of blurred content
 * - replace: Replaces content with loading spinner
 * - blur: Only blurs content without spinner overlay
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  variant = 'overlay'
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  if (variant === 'replace') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#222E6A] animate-spin" />
        </div>
        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Content with blur effect */}
      <div className={`transition-all duration-200 ${isLoading ? 'blur-sm pointer-events-none select-none' : ''}`}>
        {children}
      </div>

      {/* Overlay spinner */}
      {variant === 'overlay' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10">
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl shadow-lg">
            <RefreshCw className="h-8 w-8 text-[#222E6A] animate-spin" />
            {message && <p className="text-sm text-gray-600">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;
