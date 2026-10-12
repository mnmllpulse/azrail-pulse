import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { GripHorizontal } from 'lucide-react';

interface DraggableStudioModuleProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const DraggableStudioModule: React.FC<DraggableStudioModuleProps> = ({
  title,
  children,
  className = '',
}) => {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={constraintsRef} className="w-full relative">
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        dragMomentum={false}
        whileDrag={{ scale: 1.01, zIndex: 50, boxShadow: '0 0 35px rgba(168, 85, 247, 0.3)' }}
        className={`relative rounded-2xl bg-zinc-950/80 border border-purple-500/20 backdrop-blur-xl p-4 transition-colors ${className}`}
      >
        {/* Header Drag Handle */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 cursor-grab active:cursor-grabbing select-none text-zinc-400 hover:text-purple-300">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-purple-400" />
            {title && (
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                {title}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            DRAG TO REPOSITION
          </span>
        </div>

        {/* Module Content */}
        <div>{children}</div>
      </motion.div>
    </div>
  );
};

export default DraggableStudioModule;
