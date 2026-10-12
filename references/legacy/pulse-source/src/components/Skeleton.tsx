import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  isLight?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", isLight = false }) => {
  return (
    <div 
      className={`relative overflow-hidden rounded-md ${
        isLight ? 'bg-black/5' : 'bg-white/5'
      } ${className}`}
    >
      <motion.div
        animate={{
          x: ['-100%', '200%']
        }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'linear'
        }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
      />
    </div>
  );
};

export const SkeletonItem: React.FC<SkeletonProps> = ({ className = '', isLight = false }) => {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl ${
        isLight 
          ? 'bg-gray-200/50' 
          : 'bg-white/[0.03] border border-white/[0.02]'
      } ${className}`}
    >
      <motion.div
        animate={{
          x: ['-100%', '200%']
        }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'linear'
        }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent skew-x-12 pointer-events-none"
      />
    </div>
  );
};

export function DashboardSkeleton({ isLight }: { isLight: boolean }) {
  return (
    <div className="space-y-8 animate-pulse w-full max-w-7xl mx-auto p-8">
      <div className={`p-6 rounded-[32px] border ${isLight ? 'bg-white border-gray-100' : 'bg-depth-nebula border-white/5'}`}>
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="space-y-2 flex-1">
            <SkeletonItem className="h-4 w-32" isLight={isLight} />
            <SkeletonItem className="h-8 w-48" isLight={isLight} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`p-6 rounded-[32px] border h-[240px] flex flex-col gap-4 ${isLight ? 'bg-white border-gray-100' : 'bg-depth-nebula border-white/5'}`}
          >
            <SkeletonItem className="w-12 h-12 rounded-2xl" isLight={isLight} />
            <div className="space-y-2 flex-1">
              <SkeletonItem className="h-6 w-3/4" isLight={isLight} />
              <SkeletonItem className="h-4 w-full" isLight={isLight} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton({ isLight = false }: { isLight?: boolean }) {
  return (
    <div className="space-y-4 w-full p-4">
      <Skeleton className="h-4 w-1/3" isLight={isLight} />
      <Skeleton className="h-16 w-full" isLight={isLight} />
      <Skeleton className="h-4 w-1/4" isLight={isLight} />
      <Skeleton className="h-16 w-full" isLight={isLight} />
    </div>
  );
}

export function ListSkeleton({ isLight = false }: { isLight?: boolean }) {
  return (
    <div className="space-y-3 w-full">
      {[1, 2, 3].map(i => (
        <Skeleton key={`skeleton-${i}`} className="h-12 w-full" isLight={isLight} />
      ))}
    </div>
  );
}

export function StudioSkeleton({ isLight = false }: { isLight?: boolean }) {
  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <Skeleton className="h-12 w-3/4" isLight={isLight} />
          <Skeleton className="h-4 w-full" isLight={isLight} />
          <Skeleton className="h-4 w-5/6" isLight={isLight} />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Skeleton className="h-24 w-full" isLight={isLight} />
            <Skeleton className="h-24 w-full" isLight={isLight} />
          </div>
        </div>
        <div className="w-full md:w-80 space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" isLight={isLight} />
          <Skeleton className="h-12 w-full" isLight={isLight} />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({ isLight = false }: { isLight?: boolean }) {
  return (
    <div className="space-y-6 w-full p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" isLight={isLight} />
        <Skeleton className="h-10 w-full" isLight={isLight} />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" isLight={isLight} />
        <Skeleton className="h-32 w-full" isLight={isLight} />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" isLight={isLight} />
    </div>
  );
}
