import React, { ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  isLight?: boolean;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLight = false,
  icon,
  isLoading,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "px-6 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2";
  
  let variantStyles = "";
  if (disabled || isLoading) {
    variantStyles = "bg-zinc-800 text-zinc-500 cursor-not-allowed";
  } else {
    switch (variant) {
      case 'primary':
        variantStyles = isLight ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10';
        break;
      case 'secondary':
        variantStyles = isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/5 hover:bg-white/10 text-white';
        break;
      case 'danger':
        variantStyles = 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10';
        break;
      case 'ghost':
        variantStyles = isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/5 text-zinc-400 hover:text-white';
        break;
      case 'gradient':
        variantStyles = 'bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-md';
        break;
    }
  }

  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
