import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Dna, Brain, Activity, User, Shield, BarChart3, Binary, Cpu, FileDown, ArrowLeft } from 'lucide-react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import Tooltip from '../components/Tooltip';
import { useNavigate } from 'react-router-dom';

export default function DNASequencer() {
  const navigate = useNavigate();
  const { uiPreferences, creativeDNAProfile, sequenceDNA } = useSystemState();
  const { t } = useLanguage();
  const isLight = uiPreferences.theme === 'light';
  
  const [isSequencing, setIsSequencing] = useState(false);
  const [dnaScore, setDnaScore] = useState(0);
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);

  const traits = [
    { id: 'analytical', label: t('analyticalDepth'), value: Math.round(creativeDNAProfile.traits.analytical), icon: <Brain />, color: 'bg-blue-500' },
    { id: 'creative', label: t('creativeChaos'), value: Math.round(creativeDNAProfile.traits.creative), icon: <Binary />, color: 'bg-purple-500' },
    { id: 'empathy', label: t('emotionalResonance'), value: Math.round(creativeDNAProfile.traits.empathy), icon: <Activity />, color: 'bg-rose-500' },
    { id: 'adaptive', label: t('neuralPlasticity'), value: Math.round(creativeDNAProfile.traits.adaptive), icon: <Cpu />, color: 'bg-emerald-500' },
  ];

  const startSequencing = () => {
    setIsSequencing(true);
    setDnaScore(0);
    toast.info("Extracting digital psycho-profile...");
    
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      setDnaScore(current);
      if (current >= 100) {
        clearInterval(interval);
        sequenceDNA();
        setIsSequencing(false);
        toast.success("DNA Sequencing complete");
      }
    }, 30);
  };

  const handleExportDNA = () => {
    const data = {
      creativeDNAProfile,
      timestamp: new Date().toISOString()
    };
    const content = JSON.stringify(data, null, 2);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "dna_profile.json");
    dlAnchorElem.click();
    toast.success("DNA profile successfully exported!");
  };

  return (
    <div className={`min-h-screen flex flex-col pt-24 px-6 pb-12 transition-colors duration-500 ${isLight ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
      <div className="max-w-4xl mx-auto w-full space-y-12">
        <button 
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 transition-colors w-fit text-sm font-mono uppercase tracking-wider mb-[-2rem] relative z-10 ${isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-2">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h1 className={`text-4xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>{t('dnaSequencerTitle')}</h1>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-400">{t('psychoProfileAnalysis')}</p>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Analysis Module */}
          <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center space-y-8 relative overflow-hidden ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/5'}`}>
            <div className="relative">
              <div className="w-48 h-48 rounded-full border-2 border-dashed border-emerald-500/20 animate-spin-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-4xl font-mono font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  {dnaScore}%
                </div>
              </div>
              <Dna className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-8 h-8 text-emerald-500 ${isSequencing ? 'animate-bounce' : ''}`} />
            </div>

            <div className="text-center space-y-2">
              <h2 className={`text-lg font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{t('profileSynthesis')}</h2>
              <p className="text-xs text-zinc-500 max-w-[200px]">{t('extractingPersonalityVectors')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Tooltip
                contentEn="Re-extract and analyze digital DNA parameters based on recent cognitive actions."
                contentRu="Повторно извлечь и проанализировать параметры цифровой ДНК на основе недавних действий."
                titleEn="Re-sequence DNA"
                titleRu="Ресеквенировать ДНК"
                isLight={isLight}
                className="flex-1"
              >
                <button
                  onClick={startSequencing}
                  disabled={isSequencing}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-xl cursor-pointer"
                >
                  {isSequencing ? t('analyzing') : t('reSequenceProfile')}
                </button>
              </Tooltip>

              <Tooltip
                contentEn="Download DNA traits and neural profile structures as a portable JSON document."
                contentRu="Скачать признаки ДНК и структуру нейронного профиля в формате переносимого JSON."
                titleEn="Export Profile"
                titleRu="Экспорт профиля"
                isLight={isLight}
                className="flex-1"
              >
                <button
                  onClick={handleExportDNA}
                  disabled={isSequencing}
                  className={`w-full py-4 rounded-2xl border font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isLight
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {t('exportLogic')}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Traits List */}
          <div className="space-y-4">
            {traits.map((trait) => (
              <motion.div
                key={trait.id}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedTrait(trait.id)}
                className={`p-6 rounded-3xl border cursor-pointer transition-all ${
                  selectedTrait === trait.id 
                    ? 'bg-emerald-500/10 border-emerald-500' 
                    : isLight 
                      ? 'bg-white border-zinc-200 hover:border-zinc-400' 
                      : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${trait.color} text-white`}>
                      {React.cloneElement(trait.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">{trait.label}</span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{trait.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${trait.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${trait.color}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* System Insights */}
        <div className={`p-8 rounded-[2.5rem] border ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/5'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h3 className={`text-sm font-mono font-bold uppercase tracking-widest ${isLight ? 'text-zinc-900' : 'text-white'}`}>{t('neuralInsightsTitle')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">{t('styleBiasTitle')}</div>
              <div className={`text-sm capitalize ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>{creativeDNAProfile.styleBias} aesthetics favored.</div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">{t('complexityScoreTitle')}</div>
              <div className={`text-sm ${creativeDNAProfile.complexityScore > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>{creativeDNAProfile.complexityScore}% - {creativeDNAProfile.complexityScore > 60 ? 'High' : 'Optimal'} tolerance.</div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">{t('generationPatternsTitle')}</div>
              <div className={`text-sm truncate ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>{creativeDNAProfile.generationTendencies.slice(0, 2).join(', ')}...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
