import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Star } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

interface StudioCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  isLight: boolean;
  isPremium?: boolean;
}

export function StudioCard({ title, description, icon, onClick, isLight, isPremium }: StudioCardProps) {
  const { playHover, playActivation } = useAudio();

  const handleMouseEnter = () => {
    playHover();
  };

  const handleCardClick = () => {
    playActivation();
    onClick();
  };

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={handleMouseEnter}
      onClick={handleCardClick}
      className={`studio-module p-6 md:p-8 rounded-[2rem] border cursor-pointer group relative overflow-hidden flex flex-col h-full transition-all duration-300 ${
        isPremium 
          ? (isLight ? 'bg-indigo-50/30 border-pulse-primary/20' : 'bg-pulse-primary/5 border-pulse-primary/10 hover:border-pulse-primary/40')
          : (isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-xl' : 'bg-zinc-950/80 border-white/5 hover:border-white/10 hover:bg-zinc-900/80')
      }`}
    >
      {isPremium && (
        <div className="absolute top-6 right-6">
          <Star className="w-4 h-4 text-pulse-primary heartbeat-active" />
        </div>
      )}
      <div className="mb-6 flex transition-transform duration-500 group-hover:scale-105">
        {icon}
      </div>
      <h3 className={`text-lg md:text-xl font-bold mb-3 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</h3>
      <p className={`text-xs md:text-sm font-body flex-1 leading-relaxed ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>{description}</p>
      
      <div className={`mt-8 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors ${isLight ? 'text-gray-400 group-hover:text-pulse-primary' : 'text-zinc-600 group-hover:text-pulse-primary'}`}>
        <span>{isPremium ? 'ACCESS UNIVERSE' : 'INITIALIZE'}</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </motion.div>
  );
}
