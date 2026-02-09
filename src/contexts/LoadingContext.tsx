import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import LoadingScreen from '../components/common/LoadingScreen';

type LoadingVariant = 'default' | 'minimal' | 'dots' | 'pulse' | 'orbit';

interface LoadingState {
  isLoading: boolean;
  title: string;
  subtitle: string;
  variant: LoadingVariant;
}

interface LoadingContextType {
  showLoading: (options?: {
    title?: string;
    subtitle?: string;
    variant?: LoadingVariant;
  }) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    title: 'Loading',
    subtitle: 'Please wait...',
    variant: 'default',
  });

  const showLoading = useCallback((options?: {
    title?: string;
    subtitle?: string;
    variant?: LoadingVariant;
  }) => {
    setLoadingState({
      isLoading: true,
      title: options?.title || 'Loading',
      subtitle: options?.subtitle || 'Please wait...',
      variant: options?.variant || 'default',
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => ({ ...prev, isLoading: false }));
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: loadingState.isLoading }}>
      {children}
      {loadingState.isLoading && (
        <LoadingScreen
          title={loadingState.title}
          subtitle={loadingState.subtitle}
          variant={loadingState.variant}
          fullScreen={true}
        />
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
