import React from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'pulse';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLight?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLight = false, leftIcon, rightIcon, isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-mono uppercase tracking-widest transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95";
    
    const sizes = {
      sm: "px-3 py-1.5 text-[10px] rounded-lg",
      md: "px-5 py-2.5 text-[11px] rounded-xl",
      lg: "px-8 py-4 text-xs rounded-2xl",
      icon: "p-2 rounded-lg"
    };

    const variants = {
      primary: isLight 
        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm" 
        : "bg-pulse-primary text-white hover:bg-pulse-deep shadow-[0_0_20px_rgba(123,77,255,0.3)] hover:shadow-[0_0_30px_rgba(123,77,255,0.5)]",
      secondary: isLight
        ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
        : "bg-white/5 text-white/90 hover:bg-white/10 border border-white/5",
      ghost: isLight
        ? "bg-transparent text-gray-600 hover:bg-gray-100"
        : "bg-transparent text-white/60 hover:bg-white/5",
      danger: isLight
        ? "bg-red-50 text-red-600 hover:bg-red-100"
        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
      outline: isLight
        ? "bg-transparent border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        : "bg-transparent border border-white/10 text-white/80 hover:border-white/20 hover:bg-white/5",
      pulse: isLight
        ? "bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse"
        : "bg-pulse-primary/10 text-pulse-accent border border-pulse-primary/20 animate-pulse shadow-[0_0_15px_rgba(123,77,255,0.2)]"
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
