import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  effect3d?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  effect3d = true,
  ...props
}) => {
  // Base classes with 3D effect - removed focus ring for cleaner look
  const baseClasses = `inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none ${
    effect3d 
      ? 'transform group-hover:translate-y-[2px] group-active:translate-y-[4px]' 
      : 'transition-colors'
  }`;

  const variantClasses = {
    primary: effect3d 
      ? 'bg-[#454D7C] text-white group-hover:bg-[#3a4166] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#222E6A]'
      : 'bg-[#222E6A] text-white hover:bg-[#1a2550] shadow-md hover:shadow-lg',
    secondary: effect3d
      ? 'bg-[#6B7399] text-white group-hover:bg-[#5A628F] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#454D7C]'
      : 'bg-[#454D7C] hover:bg-[#3a4166] text-white',
    danger: effect3d
      ? 'bg-gradient-to-b from-[#EF5350] to-[#E53935] text-white group-hover:from-[#E53935] group-hover:to-[#D32F2F] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#D32F2F]'
      : 'bg-red-600 text-white hover:bg-red-700',
    success: effect3d
      ? 'bg-gradient-to-b from-[#66BB6A] to-[#4CAF50] text-white group-hover:from-[#4CAF50] group-hover:to-[#43A047] border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#43A047]'
      : 'bg-green-600 text-white hover:bg-green-700',
    outline: effect3d
      ? 'border-2 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-[#454D7C] text-[#454D7C] group-hover:bg-gradient-to-b group-hover:from-[#EEF0FF] group-hover:to-[#E3E6FF] bg-white'
      : 'border-2 border-[#222E6A] text-[#222E6A] hover:bg-[#D8DAED]',
    ghost: effect3d
      ? 'group-hover:bg-gradient-to-b group-hover:from-gray-100 group-hover:to-gray-200 text-gray-700 border-b-[6px] group-hover:border-b-[3px] group-active:border-b-[1px] border-transparent group-hover:border-gray-300'
      : 'hover:bg-gray-100 text-gray-700'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const wrapperHeightClasses = {
    sm: 'h-[34px]',
    md: 'h-[42px]',
    lg: 'h-[54px]'
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className={`inline-flex group ${effect3d ? wrapperHeightClasses[size] : ''} items-end`}>
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={isDisabled}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    </div>
  );
};

export default Button;