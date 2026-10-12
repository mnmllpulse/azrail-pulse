import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { useHistory } from '../contexts/HistoryContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Clock, Trash2, Search, Filter, Calendar, Zap, MessageSquare, Music, Video, Image as ImageIcon, Globe, Database, Terminal, Settings } from 'lucide-react';
import Tooltip from '../components/Tooltip';

export default function HistoryPage() {
  const { history, removeFromHistory, clearHistory } = useHistory();
  const { isLight } = useOutletContext<{ isLight: boolean }>();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredHistory = history.filter(item => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType ? item.type === filterType : true;
    return matchesSearch && matchesType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'web': return <Globe className="w-4 h-4" />;
      case 'music': return <Music className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'chat': return <MessageSquare className="w-4 h-4" />;
      case 'quantum': return < Zap className="w-4 h-4" />;
      case 'knowledge': return <Database className="w-4 h-4" />;
      case 'code': return <Terminal className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'web': return 'text-cyan-400 bg-cyan-400/10';
      case 'music': return 'text-amber-400 bg-amber-400/10';
      case 'video': return 'text-pink-400 bg-pink-400/10';
      case 'image': return 'text-emerald-400 bg-emerald-400/10';
      case 'chat': return 'text-blue-400 bg-blue-400/10';
      case 'quantum': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pulse-primary/10 rounded-2xl border border-pulse-primary/20">
            <Clock className="w-6 h-6 text-pulse-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
              {language === 'ru' ? 'Архив Нейронной Активности' : 'Neural Activity Archive'}
            </h1>
            <p className={`text-xs opacity-50 font-mono tracking-widest uppercase ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {language === 'ru' ? 'Системные логи и история генераций' : 'System logs and generation history'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/20'}`} />
            <input
              type="text"
              placeholder={language === 'ru' ? 'Поиск в архиве...' : 'Search archive...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 text-sm rounded-xl border outline-none transition-all w-64 ${
                isLight ? 'bg-white border-gray-200 text-gray-900 focus:ring-1 focus:ring-indigo-500' : 'bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>
          <Tooltip content={language === 'ru' ? 'Очистить историю' : 'Clear history'} isLight={isLight}>
            <button
              onClick={clearHistory}
              className={`p-2 rounded-xl border transition-all ${
                isLight ? 'bg-white border-gray-200 text-rose-600 hover:bg-rose-50' : 'bg-white/5 border-white/10 text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'web', 'music', 'video', 'image', 'chat', 'quantum', 'code'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type === 'all' ? null : type)}
            className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all border ${
              (type === 'all' && !filterType) || filterType === type
                ? 'bg-pulse-primary border-pulse-primary text-white font-bold'
                : isLight ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  isLight ? 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getStatusColor(item.type)}`}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold tracking-tight">{item.title}</h3>
                    <p className="text-xs opacity-50 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-mono uppercase opacity-40 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md font-bold tracking-widest ${getStatusColor(item.type)}`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className={`p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Clock className="w-16 h-16 mb-4" />
              <p className="font-mono uppercase tracking-[0.3em] text-xs">
                {language === 'ru' ? 'Архив пуст' : 'Archive empty'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
