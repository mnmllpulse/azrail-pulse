import React from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileUploadButton } from '../FileUploadButton';
import { useUser } from '../../contexts/UserContext';

interface StudioHeaderProps {
  isLight: boolean;
  type: string;
  title: string;
  isSavingInProgress?: boolean;
  lastSaved?: Date | null;
  saveLocation?: 'local' | 'cloud';
  onBackToBoard?: () => void;
  subtitle?: string;
}

export default function StudioHeader({
  isLight,
  type,
  title,
  isSavingInProgress = false,
  lastSaved = null,
  saveLocation = 'local',
  onBackToBoard,
  subtitle,
}: StudioHeaderProps) {
  const { t } = useLanguage();
  const { status } = useUser();

  const getSubtitle = (studioType: string): string => {
    switch (studioType) {
      case 'web':
        return t('webStudioDesc');
      case 'music':
        return t('musicStudioDesc');
      case 'video':
        return t('videoStudioDesc');
      case 'agent':
        return t('agentStudioDesc');
      case 'image':
        return t('imageStudioDesc');
      case 'lab':
        return t('pulseLabDesc');
      case 'code':
        return t('codeStudioDesc');
      case 'knowledge':
        return t('knowledgeHubDesc');
      case 'bots':
        return 'Configure and orchestrate your autonomous robotic and notification assistants.';
      case 'billing':
        return 'Manage your active subscription tiers, pricing options, and cloud resources.';
      default:
        return 'Advanced AI development workplace with real-time feedback and execution pipeline.';
    }
  };

  return (
    <div 
      id="unified-studio-header"
      className={`mb-6 p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-gray-50 to-indigo-50/30 border-gray-100 shadow-sm' 
          : 'bg-gradient-to-r from-[#0D0618]/60 to-[#05010A]/80 border-white/[0.03] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]'
      }`}
    >
      {/* Decorative ambient blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={onBackToBoard}
              className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                isLight ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white/90'
              }`}
            >
              ← NEXUS BOARD
            </button>
            <span className={isLight ? 'text-gray-300' : 'text-white/10'}>/</span>
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
              {title.toUpperCase()}
            </span>
          </div>

          {/* NAME STUDIO Heading - uppercase */}
          <h1 className={`text-2xl md:text-3xl font-bold font-sans tracking-wider uppercase mb-1.5 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {title.toUpperCase()}
          </h1>

          {/* Standardized Subtitle Description */}
          <p className={`text-xs font-sans max-w-2xl leading-relaxed ${
            isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'
          }`}>
            {subtitle || getSubtitle(type)}
          </p>
        </div>

        {/* Autosave Status Indicator */}
        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 justify-center">
          <div className="flex items-center gap-2 mb-1">
            <FileUploadButton isLight={isLight} className="scale-90" />
            <div className={`text-[9px] font-mono uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
              Load Memory
            </div>
          </div>
          {isSavingInProgress ? (
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/40'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Autosaving to Core...</span>
            </div>
          ) : lastSaved ? (
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-[#E0E0E0]/60'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                SAVED ({saveLocation.toUpperCase()}): {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isLight ? 'text-gray-400' : 'text-[#E0E0E0]/40'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
              <span>AUTOSAVE ACTIVE</span>
            </div>
          )}
          
          {/* Display Engine Resolution and Scaling Badge */}
          <div className="flex items-center gap-4">
            {status && (
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-mono ${
                status.plan === 'Free' 
                  ? (isLight ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-orange-500/10 border-orange-500/30 text-orange-400')
                  : (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
              }`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>{status.plan.toUpperCase()}</span>
                <span className="opacity-40">|</span>
                <span>{status.plan === 'Free' ? `${status.remaining}/10 GEN` : 'UNLIMITED'}</span>
              </div>
            )}
            
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-mono ${
              isLight ? 'bg-gray-100/50 border-gray-200 text-gray-500' : 'bg-white/[0.02] border-white/5 text-[#E0E0E0]/40'
            }`}>
              <span className="h-1 w-1 rounded-full bg-indigo-400 animate-pulse" />
              <span>GOST 2026/2027 MATRIX: AUTO-SCALE ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
