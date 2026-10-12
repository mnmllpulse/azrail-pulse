import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Cpu, Music, Code, ShieldCheck, DollarSign, X, Send, 
  ExternalLink, CheckCircle2, MessageSquare, Terminal, RefreshCw, Layers
} from 'lucide-react';
import { telegramService, TelegramBot, TelegramBotLog } from '../services/TelegramBotService';

interface TelegramBotsPortalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export default function TelegramBotsPortal({ isOpen, onClose, isLight }: TelegramBotsPortalProps) {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('pulse-prime');
  const [logs, setLogs] = useState<TelegramBotLog[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [twaSandboxActive, setTwaSandboxActive] = useState<boolean>(false);
  const [twaInitData, setTwaInitData] = useState<string>('');
  const [twaThemeParams, setTwaThemeParams] = useState<any>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Bots data
  const loadBotsData = async () => {
    setIsLoading(true);
    try {
      const botsList = await telegramService.getBots();
      setBots(botsList);
      // Load initial logs
      const initialLogs = await telegramService.getLogs('pulse-prime');
      setLogs(initialLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBotsData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedBotId) {
      telegramService.getLogs(selectedBotId).then(setLogs);
      setTwaSandboxActive(false);
    }
  }, [selectedBotId, isOpen]);

  // Scroll to bottom of logs on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, twaSandboxActive]);

  const activeBot = bots.find(b => b.id === selectedBotId) || bots[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeBot) return;

    const currentText = inputMessage;
    setInputMessage('');

    // Append user message immediately for real-time responsiveness
    const tempUserLog: TelegramBotLog = {
      id: Math.random().toString(),
      botId: activeBot.id,
      direction: 'incoming',
      text: currentText,
      timestamp: new Date().toISOString(),
      user: '@andrik494'
    };
    setLogs(prev => [...prev, tempUserLog]);

    try {
      const result = await telegramService.sendMessage(activeBot.id, currentText);
      // Use logs returned from backend to maintain consistent state
      setLogs(result.logs);
      
      // Refresh bots to sync metrics
      const updatedBots = await telegramService.getBots();
      setBots(updatedBots);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchTwa = async () => {
    if (!activeBot) return;
    try {
      const initInfo = await telegramService.launchWebApp(activeBot.id);
      setTwaInitData(initInfo.initData);
      setTwaThemeParams(initInfo.themeParams);
      setTwaSandboxActive(true);

      // Refresh bots to sync metrics
      const updatedBots = await telegramService.getBots();
      setBots(updatedBots);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to map Bot icon based on ID
  const getBotIcon = (id: string, className: string = "w-5 h-5") => {
    switch(id) {
      case 'pulse-prime':
        return <Cpu className={className} />;
      case 'studio-muse':
        return <Music className={className} />;
      case 'design-demon':
        return <Layers className={className} />;
      case 'code-shadow':
        return <Code className={className} />;
      case 'market-ghost':
        return <DollarSign className={className} />;
      default:
        return <Bot className={className} />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Content Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`relative z-10 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border shadow-2xl font-sans ${
            isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0a0a0c] border-white/5 text-gray-100'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-[#0f0f12]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-400'}`}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wider uppercase font-mono">Telegram Bot Network Controller</h3>
                <p className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  INITIALIZING SECURE AGENT WEBHOOKS & WEB APP LAUNCHERS
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${
                isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid Layout */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            {/* Left Column: Bots Network List */}
            <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
              isLight ? 'border-gray-100 bg-gray-50/50' : 'border-white/5 bg-[#0a0a0c]'
            }`}>
              <div className={`p-3.5 border-b flex items-center justify-between text-[9px] font-mono uppercase tracking-widest ${
                isLight ? 'text-gray-400 border-gray-100' : 'text-gray-500 border-white/5'
              }`}>
                <span>ACTIVE BOT NODES</span>
                <button onClick={loadBotsData} className="hover:text-indigo-400 transition-colors">
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-2.5 space-y-2">
                {bots.map((bot) => {
                  const isActive = bot.id === selectedBotId;
                  return (
                    <button
                      key={bot.id}
                      onClick={() => setSelectedBotId(bot.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border flex items-start gap-3 ${
                        isActive 
                          ? (isLight ? 'bg-white border-indigo-200 shadow-sm' : 'bg-[#121217] border-white/10')
                          : (isLight ? 'bg-transparent border-transparent hover:bg-gray-100' : 'bg-transparent border-transparent hover:bg-white/5')
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isActive 
                          ? 'bg-indigo-500 text-white' 
                          : (isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-400')
                      }`}>
                        {getBotIcon(bot.id, "w-4 h-4")}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-xs truncate">{bot.name}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${
                            bot.status === 'ONLINE' 
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-indigo-500/15 text-indigo-400'
                          }`}>
                            {bot.status}
                          </span>
                        </div>
                        <p className={`text-[10px] mt-1 truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                          @{bot.username}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bot Network Status Footer */}
              <div className={`p-3.5 border-t text-[10px] font-mono ${
                isLight ? 'border-gray-100 bg-gray-50 text-gray-500' : 'border-white/5 bg-[#0e0e12] text-gray-400'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span>NETWORK LINK SPEED:</span>
                  <span className="text-emerald-400 font-bold">EXQUISITE (12ms)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TELEGRAM ROUTER:</span>
                  <span className="text-indigo-400">ONLINE</span>
                </div>
              </div>
            </div>

            {/* Right Column: Bot Live Interaction Sandbox */}
            {activeBot && (
              <div className="flex-grow flex flex-col min-h-0 bg-transparent">
                {/* Bot Stats & Description Banner */}
                <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 ${
                  isLight ? 'border-gray-100 bg-white' : 'border-white/5 bg-[#0a0a0c]'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase">{activeBot.name} Core</span>
                      <span className="text-xs text-gray-400 font-mono">@{activeBot.username}</span>
                    </div>
                    <p className={`text-[10px] mt-1 max-w-xl ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {activeBot.description}
                    </p>
                  </div>

                  <button
                    onClick={handleLaunchTwa}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-medium transition-all"
                  >
                    <span>LAUNCH WEB APP</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sub-Layout: Telemetry on left, Chat Simulator on right */}
                <div className="flex-grow min-h-0 flex flex-col lg:flex-row">
                  {/* Left: Metadata & Telemetry */}
                  <div className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r p-4 overflow-y-auto space-y-4 font-mono text-[10px] shrink-0 ${
                    isLight ? 'border-gray-100' : 'border-white/5 bg-[#09090b]'
                  }`}>
                    <div>
                      <span className={`text-[9px] uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>BOT CAPABILITIES</span>
                      <ul className="mt-2 space-y-1.5">
                        {activeBot.capabilities.map((cap, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <span className={`text-[9px] uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>BOT TELEMETRY</span>
                      <div className="mt-2.5 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>MESSAGES:</span>
                          <span className="font-bold">{activeBot.metrics.messagesProcessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>TWA SESSIONS:</span>
                          <span className="font-bold text-indigo-400">{activeBot.metrics.webAppSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>COMMANDS:</span>
                          <span className="font-bold text-emerald-400">{activeBot.metrics.commandsTriggered}</span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>WEBHOOK ENDPOINT:</span>
                          <span className={`p-1.5 rounded break-all text-[8px] font-mono ${
                            isLight ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-300'
                          }`}>
                            https://andrik494.tg/api/webhook/{activeBot.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <span className={`text-[9px] uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>SUPPORTED COMMANDS</span>
                      <div className="mt-2 space-y-2">
                        {activeBot.commands.map((cmd) => (
                          <div 
                            key={cmd.command} 
                            onClick={() => setInputMessage(`/${cmd.command}`)}
                            className={`p-1.5 rounded cursor-pointer transition-colors border ${
                              isLight ? 'bg-gray-50 border-gray-100 hover:bg-gray-100' : 'bg-white/5 border-white/5 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-indigo-400 font-bold text-xs">/{cmd.command}</span>
                            <p className="text-[8px] text-gray-400 mt-0.5">{cmd.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Simulated Client Chat View or Web App Sandbox */}
                  <div className="flex-grow flex flex-col min-h-0 bg-transparent relative">
                    <AnimatePresence mode="wait">
                      {!twaSandboxActive ? (
                        /* CHAT INTERACTIVE EMULATOR */
                        <motion.div 
                          key="chat"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25 }}
                          className="flex-grow flex flex-col min-h-0"
                        >
                          <div className={`px-4 py-2 border-b flex items-center justify-between text-[10px] font-mono shrink-0 ${
                            isLight ? 'bg-gray-50 text-gray-500' : 'bg-[#0b0b0e] text-gray-400'
                          }`}>
                            <span className="flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              <span>TELEGRAM CHAT EMULATOR</span>
                            </span>
                            <span className="text-[8px] text-emerald-400">ACTIVE CONNECTION</span>
                          </div>

                          {/* Message List */}
                          <div className={`flex-grow overflow-y-auto p-4 space-y-3.5 ${
                            isLight ? 'bg-[#f8f9fa]' : 'bg-[#040405]'
                          }`}>
                            {logs.map((log) => {
                              const isIncoming = log.direction === 'incoming';
                              return (
                                <div key={log.id} className={`flex flex-col ${isIncoming ? 'items-end' : 'items-start'}`}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[8px] font-mono text-gray-400">
                                      {isIncoming ? log.user : `@${activeBot.username}`}
                                    </span>
                                    <span className="text-[7px] text-gray-500 font-mono">
                                      {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                    </span>
                                  </div>
                                  <div className={`p-3 rounded-2xl max-w-sm text-xs font-sans whitespace-pre-wrap leading-relaxed ${
                                    isIncoming 
                                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                                      : (isLight ? 'bg-white border text-gray-800 rounded-tl-none shadow-sm' : 'bg-[#141419] border border-white/5 text-gray-100 rounded-tl-none')
                                  }`}>
                                    {log.text}
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Input Area */}
                          <form 
                            onSubmit={handleSendMessage}
                            className={`p-3 border-t flex gap-2 shrink-0 ${
                              isLight ? 'bg-white border-gray-100' : 'bg-[#0a0a0c] border-white/5'
                            }`}
                          >
                            <input 
                              type="text"
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              placeholder={`Send command or ask @${activeBot.username}...`}
                              className={`flex-grow px-3.5 py-2 rounded-xl text-xs font-sans outline-none border transition-colors ${
                                isLight 
                                  ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500' 
                                  : 'bg-[#101014] border-white/5 text-gray-100 focus:border-indigo-500/50'
                              }`}
                            />
                            <button 
                              type="submit"
                              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </form>
                        </motion.div>
                      ) : (
                        /* TELEGRAM WEB APP SANDBOX EMULATOR */
                        <motion.div 
                          key="twa"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25 }}
                          className="flex-grow flex flex-col min-h-0 bg-[#060608]"
                        >
                          <div className="px-4 py-2 border-b border-white/5 bg-[#0a0a0d] flex items-center justify-between text-[10px] font-mono shrink-0 text-gray-400">
                            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                              <span>TWA CLIENT CONTAINER (IFRAME)</span>
                            </span>
                            <button 
                              onClick={() => setTwaSandboxActive(false)}
                              className="text-[9px] font-mono text-gray-400 hover:text-white underline transition-colors"
                            >
                              EXIT WEB APP EMULATOR
                            </button>
                          </div>

                          <div className="flex-grow flex flex-col p-4 space-y-4 overflow-y-auto font-mono text-[10px]">
                            {/* App Screen Replica */}
                            <div className="border border-white/10 rounded-xl bg-[#0d0d11] p-4 flex flex-col space-y-3.5">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9px] text-gray-400">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>APPLET_CONTAINER_LIVE</span>
                                </span>
                                <span>tgWebAppStartParam={activeBot.id}</span>
                              </div>

                              <div className="space-y-2">
                                <span className="text-gray-500">INIT_DATA_STRING (SECURE SIGNATURE):</span>
                                <div className="p-2 rounded bg-black/60 text-[8px] font-mono border border-white/5 break-all leading-normal text-indigo-300">
                                  {twaInitData}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                                <div className="space-y-1">
                                  <span className="text-gray-500">THEME_BG_COLOR:</span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3.5 h-3.5 rounded border border-white/10" style={{backgroundColor: twaThemeParams?.bg_color}} />
                                    <span>{twaThemeParams?.bg_color}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-gray-500">THEME_TEXT_COLOR:</span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3.5 h-3.5 rounded border border-white/10" style={{backgroundColor: twaThemeParams?.text_color}} />
                                    <span>{twaThemeParams?.text_color}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2">
                                <span className="text-gray-500">SIMULATED WEB APP IFRAME PREVIEW:</span>
                                <div className="mt-2 border border-white/5 rounded-lg bg-[#050505] p-6 text-center text-xs text-gray-400 space-y-2">
                                  <p className="font-sans text-white text-sm font-semibold">Welcome to {activeBot.name} TWA Dashboard</p>
                                  <p className="font-sans text-[11px] text-gray-400 max-w-sm mx-auto">
                                    The active Telegram Web App is running with deep integration inside the Pulse Engine container at port 3000. All metrics synced dynamically.
                                  </p>
                                  <div className="inline-block mt-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded text-[9px] font-mono">
                                    STATUS: HANDSHAKE COMPLETED
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Setup helper */}
                            <div className="p-3.5 rounded-xl border border-indigo-500/15 bg-indigo-950/20 text-indigo-300 space-y-2 font-mono text-[9px] leading-normal">
                              <div className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                <span>PRODUCTION REAL WEBHOOK INTEGRATION GUIDE:</span>
                              </div>
                              <p className="text-gray-400 text-[10px] font-sans">
                                To point your live Telegram Bot to this container, update your <code className="bg-black/30 px-1 py-0.5 rounded">.env</code> keys with your real bot tokens. The service automatically binds webhooks, allowing seamless two-way telemetry!
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
