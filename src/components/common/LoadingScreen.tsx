import React from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  fullScreen?: boolean;
  variant?: 'default' | 'minimal' | 'dots' | 'pulse' | 'orbit';
}

/**
 * Centralized Loading Screen Component
 * Used consistently across all pages for loading states
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Loading',
  subtitle = 'Please wait while we fetch the data...',
  icon: Icon,
  fullScreen = true,
  variant = 'default'
}) => {
  const containerClass = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30'
    : 'flex items-center justify-center py-16';

  // Default - Modern animated spinner with rings
  if (variant === 'default') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-8">
          {/* Animated Logo Container */}
          <div className="relative w-32 h-32">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#222E6A] border-r-[#222E6A]/30 animate-spin" 
                 style={{ animationDuration: '1.5s' }} />
            
            {/* Middle pulsing ring */}
            <div className="absolute inset-3 rounded-full border-2 border-[#222E6A]/20 animate-pulse" />
            
            {/* Inner rotating ring (opposite direction) */}
            <div className="absolute inset-6 rounded-full border-2 border-transparent border-b-[#222E6A]/60 border-l-[#222E6A]/60"
                 style={{ animation: 'spin 1s linear infinite reverse' }} />
            
            {/* Center icon container */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#222E6A] to-[#3a4a8a] rounded-2xl flex items-center justify-center shadow-xl"
                   style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                {Icon ? (
                  <Icon className="h-7 w-7 text-white" />
                ) : (
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xl font-semibold text-gray-800">{title}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
            
            {/* Animated dots */}
            <div className="flex gap-1.5 mt-2">
              <span className="w-2 h-2 bg-[#222E6A] rounded-full"
                    style={{ animation: 'bounce 1s ease-in-out infinite' }} />
              <span className="w-2 h-2 bg-[#222E6A]/70 rounded-full"
                    style={{ animation: 'bounce 1s ease-in-out 0.1s infinite' }} />
              <span className="w-2 h-2 bg-[#222E6A]/40 rounded-full"
                    style={{ animation: 'bounce 1s ease-in-out 0.2s infinite' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Minimal - Simple elegant spinner
  if (variant === 'minimal') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#222E6A] animate-spin" />
          </div>
          {title && <p className="text-sm font-medium text-gray-600">{title}</p>}
        </div>
      </div>
    );
  }

  // Dots - Three bouncing dots
  if (variant === 'dots') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-[#222E6A] rounded-full"
                 style={{ animation: 'bounce 0.6s ease-in-out infinite' }} />
            <div className="w-4 h-4 bg-[#222E6A]/70 rounded-full"
                 style={{ animation: 'bounce 0.6s ease-in-out 0.15s infinite' }} />
            <div className="w-4 h-4 bg-[#222E6A]/40 rounded-full"
                 style={{ animation: 'bounce 0.6s ease-in-out 0.3s infinite' }} />
          </div>
          {title && <p className="text-sm text-gray-600">{title}</p>}
        </div>
      </div>
    );
  }

  // Pulse - Modern pulsing circles
  if (variant === 'pulse') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-[#222E6A]/5"
                 style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <div className="absolute inset-3 rounded-full bg-[#222E6A]/10"
                 style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) 0.3s infinite' }} />
            <div className="absolute inset-6 rounded-full bg-[#222E6A]/20 animate-pulse" />
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-[#222E6A] rounded-full shadow-lg flex items-center justify-center">
                {Icon ? (
                  <Icon className="h-5 w-5 text-white" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">{title}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Orbit - Orbiting dots around center
  if (variant === 'orbit') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            {/* Orbiting container */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#222E6A] rounded-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#222E6A]/50 rounded-full" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-3 bg-[#222E6A]/70 rounded-full" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 bg-[#222E6A]/30 rounded-full" />
            </div>
            
            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#222E6A] to-[#3a4a8a] rounded-xl flex items-center justify-center shadow-lg">
                {Icon ? (
                  <Icon className="h-6 w-6 text-white" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-semibold">{title}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingScreen;
