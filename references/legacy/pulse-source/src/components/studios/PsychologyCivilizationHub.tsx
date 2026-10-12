import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpenCheck, Search, ChevronRight, UserCheck, Skull, Zap, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CognitiveGraph } from './CognitiveGraph';
import { pulsePsychologyCore } from '../../modules/PsychologyCivilization/store';
import { PsychologicalArchetypeCard } from './PsychologyCivilization';
import { CompetitorPsychoanalysis } from './CompetitorPsychoanalysis';

export function PsychologyCivilizationHub({ 
  isLight, 
  onTestInParser 
}: { 
  isLight?: boolean;
  onTestInParser: (text: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const bookshelf = pulsePsychologyCore.getBookshelf();
  const archetypesLibrary = pulsePsychologyCore.getArchetypes();
  const triggers = pulsePsychologyCore.getTriggers();
  
  const filteredBookshelf = bookshelf.map(section => {
    const matchedBooks = section.books.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...section, books: matchedBooks };
  }).filter(section => section.books.length > 0);

  return (
    <div className="space-y-6">
      {/* Visual Aggregation Hub */}
      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className={`text-xs font-mono uppercase font-bold tracking-widest ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Psychology Civilization Hub
            </h3>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                showAnalysis 
                  ? 'bg-pulse-primary text-white border-pulse-primary' 
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Target className="w-3 h-3" />
              {showAnalysis ? 'Close Analysis' : 'Pulse Lab: Psychoanalysis'}
            </button>
            <div className="text-[10px] font-mono text-zinc-500 hidden md:flex gap-4">
              <span>{archetypesLibrary.length} Archetypes</span>
              <span>{triggers.length} Triggers</span>
              <span>{bookshelf.reduce((acc, curr) => acc + curr.books.length, 0)} Profiles</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          {showAnalysis ? (
            <CompetitorPsychoanalysis isLight={isLight} />
          ) : (
            <CognitiveGraph isLight={isLight} />
          )}
        </div>
        
        {/* Quick Trigger Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
           {['manipulation', 'influence', 'defense', 'strategy'].map(cat => (
             <div key={cat} className={`p-3 rounded-xl border flex flex-col gap-1 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
               <span className="text-[9px] font-mono uppercase text-zinc-500">{cat}</span>
               <span className={`text-xs font-bold font-mono ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                 {triggers.filter(t => t.category === cat).length} Modules
               </span>
             </div>
           ))}
        </div>
      </div>

      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-4 h-4 text-amber-400" />
            <h3 className={`text-xs font-mono uppercase font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Архив Социальной Инженерии & Манипуляций
            </h3>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по книгам, авторам или описаниям..."
              className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs font-mono outline-none transition-all ${
                isLight 
                  ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500' 
                  : 'bg-black/40 border-white/5 text-white focus:border-amber-500/50'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookshelf.map((section, idx) => (
            <div key={idx} className="space-y-3.5">
              <h4 className="text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                {section.category}
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                {section.books.map((b, bIdx) => {
                  const Icon = b.icon;
                  return (
                    <div 
                      key={bIdx} 
                      className={`p-4 rounded-xl border ${b.accent} transition-all hover:scale-[1.01]`}
                    >
                      <div className="flex gap-3.5 items-start">
                        <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${isLight ? 'bg-white border-gray-200' : 'border-white/5 bg-black/20'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="flex justify-between items-start gap-2">
                            <div className={`text-xs font-bold leading-snug select-text ${isLight ? 'text-gray-900' : 'text-white'}`}>{b.title}</div>
                            <button
                              onClick={() => {
                                onTestInParser(`Книга: ${b.title} (${b.author})\nСуть: ${b.desc}\n\nПожалуйста, разбери эту когнитивную логику на атомы.`);
                              }}
                              className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all shrink-0 ${
                                isLight 
                                  ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100' 
                                  : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              Тест в Парсере
                            </button>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">{b.author}</div>
                          <p className="text-[11px] text-zinc-400 leading-normal select-text">{b.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredBookshelf.length === 0 && (
            <div className="col-span-2 text-center py-20 text-zinc-500 font-mono text-[10px]">
              Ничего не найдено по запросу "{searchQuery}". Попробуйте другой запрос.
            </div>
          )}
        </div>
      </div>

      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-white/5">
          <UserCheck className="w-4 h-4 text-rose-400" />
          <h3 className={`text-xs font-mono uppercase font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Тёмный Кабинет: Библиотека Архетипов
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {archetypesLibrary.map((archetype) => (
            <PsychologicalArchetypeCard key={archetype.id} archetype={archetype} isLight={isLight} />
          ))}
        </div>
      </div>
    </div>
  );
}
