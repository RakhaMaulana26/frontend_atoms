import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  headerVariant?: 'primary' | 'danger';
  headerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  headerVariant = 'primary',
  headerClassName,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full overflow-hidden animate-fade-scale-up`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className={`flex items-start justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-t-lg ${
              headerVariant === 'danger' 
                ? 'bg-gradient-to-r from-red-600 to-red-700' 
                : 'bg-gradient-to-r from-[#454D7C] to-[#222E6A]'
            } ${headerClassName || ''}`}>
              <h2 className="min-w-0 flex-1 text-lg sm:text-xl font-semibold leading-tight text-white">{title}</h2>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md p-2 text-white transition duration-200 ease-in-out hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-4 sm:px-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-[#D8DAED]/30 border-t border-gray-200 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;