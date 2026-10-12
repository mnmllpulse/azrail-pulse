import React from 'react';
import { LucideIcon } from 'lucide-react';

export type NeonColor = 'violet' | 'blue' | 'cyan' | 'green' | 'amber' | 'pink';

const colorMap = {
  violet: {
    border: 'border-[#7840ff]',
    glow: 'shadow-[0_0_15px_rgba(120,64,255,0.5)]',
    text: 'text-[#7840ff]',
    bg: 'bg-[#7840ff]/10',
  },
  blue: {
    border: 'border-[#3B82F6]',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    text: 'text-[#3B82F6]',
    bg: 'bg-[#3B82F6]/10',
  },
  cyan: {
    border: 'border-[#3bccff]',
    glow: 'shadow-[0_0_15px_rgba(59,204,255,0.5)]',
    text: 'text-[#3bccff]',
    bg: 'bg-[#3bccff]/10',
  },
  green: {
    border: 'border-[#10B981]',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    text: 'text-[#10B981]',
    bg: 'bg-[#10B981]/10',
  },
  amber: {
    border: 'border-[#F59E0B]',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
  },
  pink: {
    border: 'border-[#EC4899]',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.5)]',
    text: 'text-[#EC4899]',
    bg: 'bg-[#EC4899]/10',
  }
};

interface NeonIconProps {
  icon: React.ReactNode;
  color: NeonColor;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}

export default function NeonIcon({ icon, color, size = 'md', active = false }: NeonIconProps) {
  const styles = colorMap[color];
  
  const sizeClasses = {
    sm: 'w-8 h-8 [&>svg]:w-4 [&>svg]:h-4',
    md: 'w-12 h-12 [&>svg]:w-6 [&>svg]:h-6 border-2',
    lg: 'w-16 h-16 [&>svg]:w-8 [&>svg]:h-8 border-2',
    xl: 'w-24 h-24 [&>svg]:w-12 [&>svg]:h-12 border-[3px]',
  };

  return (
    <div 
      className={`
        relative flex items-center justify-center rounded-full 
        transition-all duration-300
        ${styles.border} ${styles.text}
        ${active ? styles.glow : 'hover:' + styles.glow}
        ${active ? styles.bg : 'bg-transparent'}
        ${sizeClasses[size]}
      `}
    >
      {/* Inner faint ring for detail */}
      <div className={`absolute inset-1 rounded-full border border-current opacity-30 border-dashed`}></div>
      {icon}
    </div>
  );
}
