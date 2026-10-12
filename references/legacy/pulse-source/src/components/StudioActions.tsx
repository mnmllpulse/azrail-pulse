import React from 'react';
import { motion } from 'motion/react';
import { 
  Eye, 
  Code, 
  Save, 
  Play, 
  Volume2, 
  Download, 
  Sliders, 
  Cpu, 
  History, 
  Sparkles, 
  Maximize, 
  Activity, 
  BarChart3, 
  Zap,
  Keyboard
} from 'lucide-react';
import { toast } from 'sonner';
import Tooltip from './Tooltip';

interface StudioActionsProps {
  type: string | undefined;
  isLight: boolean;
  isInputFocused: boolean;
  triggerDiagnostics: () => void;
  triggerPulseWave: () => void;
  orientation?: 'horizontal' | 'vertical';
}

export default function StudioActions({ 
  type, 
  isLight, 
  isInputFocused, 
  triggerDiagnostics, 
  triggerPulseWave,
  orientation = 'horizontal'
}: StudioActionsProps) {
  
  if (isInputFocused) {
    return (
      <motion.div 
        key="focus-mode"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`flex items-center gap-2 ${orientation === 'vertical' ? 'flex-col' : ''}`}
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium ${
          isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
        }`}>
          <Keyboard className="w-3.5 h-3.5 animate-pulse" />
          <span>Active Focus</span>
          <span className="text-[10px] opacity-60 ml-1">Esc to exit</span>
        </div>
      </motion.div>
    );
  }

  const renderActions = () => {
    switch (type) {
      case 'web':
        return (
          <>
            <Tooltip content="Live Website Preview" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Launching live website preview...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Export HTML & JS Assets" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("HTML & JS assets exported successfully!")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Code className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Save Draft Blueprint" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Draft blueprint saved!")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Save className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      case 'music':
        return (
          <>
            <Tooltip content="Play Synthesized Master" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Playing synthesized audio master...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Play className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Adjust Audio Levels" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Optimized dynamic audio levels!")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Download WAV Master" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Downloading 24-bit studio WAV track...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      case 'video':
        return (
          <>
            <Tooltip content="Render Keyframes" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Rendering high-framerate keyframes...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Play className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Configure Upscaler" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Configured dynamic resolution limits")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Download MP4 Video" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Exporting production-ready MP4 asset...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      case 'agent':
        return (
          <>
            <Tooltip content="Deploy Agent API" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Agent profile active at model endpoint")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Cpu className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Save Configuration" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Saved customized agent instructions")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Save className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="View Prompt History" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast("Restored prompt revision logs")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <History className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      case 'image':
        return (
          <>
            <Tooltip content="Generate Creative Variations" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast.success("Synthesizing style variations...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Upscale to 4K Ultra-HD" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast.success("Upscaling resolution via neural pass...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Maximize className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Download PNG Asset" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast.success("Downloading lossless PNG master...")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      case 'lab':
        return (
          <>
            <Tooltip content="Run Diagnostics Pulse" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => {
                  triggerDiagnostics();
                  toast.success("Diagnostics sequence successfully run");
                }}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Export Telemetry CSV" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => toast.success("Telemetry report generated and saved as CSV")}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Trigger Pulse Wave" isLight={isLight} position={orientation === 'vertical' ? 'right' : 'top'}>
              <button 
                onClick={() => {
                  triggerPulseWave();
                  toast.success("High-energy custom pulse wave triggered!");
                }}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-1.5 ${orientation === 'vertical' ? 'flex-col' : ''}`}
    >
      {renderActions()}
    </motion.div>
  );
}
