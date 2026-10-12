import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { motion } from 'motion/react';
import Tooltip from '../Tooltip';

interface SortableModuleProps {
  id: string;
  children: React.ReactNode;
  isDraggingEnabled: boolean;
  isLight: boolean;
}

export const SortableModule: React.FC<SortableModuleProps> = ({ 
  id, 
  children, 
  isDraggingEnabled,
  isLight
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isDraggingEnabled && (
        <Tooltip 
          contentEn="Drag to reorder module" 
          contentRu="Перетащите, чтобы изменить порядок"
          position="right"
          isLight={isLight}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20"
        >
          <div 
            {...attributes} 
            {...listeners}
            className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
              isLight ? 'bg-white shadow-sm border border-gray-200 text-gray-400' : 'bg-depth-space shadow-xl border border-white/10 text-white/40'
            }`}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </Tooltip>
      )}
      <motion.div
        layout
        initial={false}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
