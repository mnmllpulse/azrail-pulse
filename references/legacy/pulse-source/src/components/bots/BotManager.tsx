import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Power, 
  Video, 
  Image, 
  FileText, 
  Music, 
  Sparkles, 
  Activity, 
  Code, 
  Ghost, 
  Zap, 
  Cpu, 
  Monitor, 
  Eye, 
  Volume2, 
  ShieldAlert,
  Compass,
  Palette
} from 'lucide-react';
import { motion } from 'motion/react';
import { telegramService, TelegramBot } from '../../services/TelegramBotService';

const BOT_ICONS: Record<string, React.ComponentType<any>> = {
  'bot-pulse': Activity,
  'bot-coding': Code,
  'bot-ghost': Ghost,
  'bot-image': Image,
  'bot-motion': Video,
  'bot-arhitect': Palette,
  'bot-os': Monitor,
  'bot-director': Compass,
  'bot-text': FileText,
  'bot-prompt': Sparkles,
  'bot-filosofi': Bot,
  'bot-vision': Eye,
  'bot-sound': Volume2,
  'bot-visionari': Zap,
  'bot-sentry': ShieldAlert
};

export default function BotManager({ isLight }: { isLight?: boolean }) {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    telegramService.getBots().then(data => {
      setBots(data);
      setLoading(false);
    });
  }, []);

  const toggleBot = (botId: string) => {
    setBots(prev => prev.map(bot => 
      bot.id === botId 
        ? { ...bot, status: bot.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' }
        : bot
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 font-mono text-xs opacity-60">
        <Activity className="w-4 h-4 animate-spin mr-2" />
        LOADING BOT MATRIX INFRASTRUCTURE...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {bots.map(bot => {
        const IconComponent = BOT_ICONS[bot.id] || Bot;
        const isOnline = bot.status === 'ONLINE';

        return (
          <motion.div 
            key={bot.id} 
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
              isLight 
                ? isOnline 
                  ? 'bg-indigo-50/30 border-indigo-200/80 shadow-[0_4px_20px_rgba(99,102,241,0.06)]' 
                  : 'bg-white border-gray-100 shadow-sm'
                : isOnline 
                  ? 'bg-[#0b0c10] border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.08)] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_60%)]' 
                  : 'bg-[#040406] border-white/5'
            }`}
          >
            {/* Ambient Breathing Pulse Indicator on Active state */}
            {isOnline && (
              <span className="absolute top-0 right-0 flex h-3 w-3 mt-4 mr-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}

            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl border transition-colors ${
                  isLight 
                    ? isOnline ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'
                    : isOnline ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/5 text-zinc-500'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                {/* Modern Cinematic Toggle Switch */}
                <button 
                  onClick={() => toggleBot(bot.id)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    isOnline ? 'bg-emerald-500' : isLight ? 'bg-gray-200' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isOnline ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <h3 className={`font-semibold mb-1 text-sm tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>{bot.name}</h3>
              <p className={`text-[10px] font-mono mb-3 ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>@{bot.username}</p>
              <p className={`text-[11px] leading-relaxed mb-4 ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>{bot.description}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] mt-auto">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider">
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}`} />
                <span className={isLight ? 'text-gray-500' : 'text-zinc-400'}>{bot.status}</span>
              </div>
              <span className={`text-[8px] font-mono opacity-50 ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                {bot.metrics.messagesProcessed} MSG
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
