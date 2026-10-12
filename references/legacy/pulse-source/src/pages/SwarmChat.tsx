import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Maximize2, Minimize2, Sparkles, AlertCircle, Settings, ArrowLeft, Plus, Cpu, Upload, Copy } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import VoiceInputButton from '../components/VoiceInputButton';
import { FileUploadButton } from '../components/FileUploadButton';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { AI_MODELS } from '../data/models';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentName?: string;
  timestamp: Date;
}

export default function SwarmChat() {
  const { isLight } = useOutletContext<{ isLight: boolean }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { activeAIModelId, setActiveAIModelId } = useSystemState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0) {
        return [
          {
            id: '1',
            role: 'system',
            content: t('swarmInitialized'),
            timestamp: new Date()
          },
          {
            id: '2',
            role: 'agent',
            agentName: 'Pulse Prime',
            content: t('pulsePrimeGreeting'),
            timestamp: new Date()
          }
        ];
      }
      return prev.map(msg => {
        if (msg.id === '1' && msg.role === 'system') {
          return { ...msg, content: t('swarmInitialized') };
        }
        if (msg.id === '2' && msg.role === 'agent' && msg.agentName === 'Pulse Prime') {
          return { ...msg, content: t('pulsePrimeGreeting') };
        }
        return msg;
      });
    });
  }, [language, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const agents = ['Pulse Prime', 'Studio Muse', 'Design Demon', 'Code Shadow', 'Market Ghost'];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    try {
      const systemPrompt = `You are a key member of an elite digital web agency swarm. Your name is "${randomAgent}".
- Pulse Prime is the master project planner.
- Studio Muse is the copywriter and content strategist.
- Design Demon is the visual artist and UI/UX designer.
- Code Shadow is the lead software developer.
- Market Ghost is the SEO analyst and growth marketer.

Provide a helpful, precise, and professional response to the user's query from the unique perspective of ${randomAgent}. Keep your answer concise, sharp, and encouraging.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          systemPrompt,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const agentMessage: Message = {
        id: Date.now().toString(),
        role: 'agent',
        agentName: randomAgent,
        content: data.data || `I've analyzed your prompt but encountered a routing issue. How else can the swarm assist?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (err: any) {
      console.error(err);
      const agentMessage: Message = {
        id: Date.now().toString(),
        role: 'agent',
        agentName: randomAgent,
        content: `Node communication lag detected. However, as ${randomAgent}, I suggest focusing on: "${input}". Let's synchronize and proceed!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden ${isLight ? 'bg-white text-gray-900' : 'bg-[#121212] text-[#e0e0e0]'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium tracking-wide flex items-center gap-2">
              {t('swarmIntelligenceTitle')}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </h2>
            <div className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('multiAgentCollaborativeChat')}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Model Selector */}
          <div className="hidden md:flex items-center gap-2">
            <Cpu className={`w-3.5 h-3.5 ${activeAIModelId ? 'text-blue-400' : 'text-zinc-500'}`} />
            <select
              value={activeAIModelId || ''}
              onChange={(e) => {
                const newId = e.target.value || null;
                setActiveAIModelId(newId);
                if (newId) {
                  const model = AI_MODELS.find(m => m.id === newId);
                  toast.success(`Swarm now routing through ${model?.name}`);
                } else {
                  toast.info('Reverted to default routing');
                }
              }}
              className={`text-[10px] bg-transparent border border-white/10 rounded-lg px-2 py-1 outline-none transition-colors hover:border-white/20 ${isLight ? 'text-gray-900 border-gray-200' : 'text-zinc-300'}`}
            >
              <option value="" className={isLight ? 'bg-white' : 'bg-[#121212]'}>Default Gateway</option>
              {AI_MODELS.map(model => (
                <option key={model.id} value={model.id} className={isLight ? 'bg-white' : 'bg-[#121212]'}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : msg.role === 'system'
                    ? (isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/20 text-amber-400')
                    : (isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white')
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : msg.role === 'system' ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1">
                <div className={`text-[10px] font-mono flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span>{msg.agentName || (msg.role === 'user' ? 'You' : 'System')}</span>
                  <span>•</span>
                  <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed relative group/msg ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : msg.role === 'system'
                      ? (isLight ? 'bg-amber-50 text-amber-900 rounded-tl-sm border border-amber-200' : 'bg-amber-500/10 text-amber-100 rounded-tl-sm border border-amber-500/20')
                      : (isLight ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#1A1A1A] text-gray-200 rounded-tl-sm')
                }`}>
                  {msg.content}

                  {/* Floating Copy Button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      toast.success(language === 'ru' ? 'Текст скопирован!' : 'Copied to clipboard!');
                    }}
                    className="absolute right-2 bottom-2 p-1 rounded-lg bg-black/60 hover:bg-black text-white/75 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity border border-white/10"
                    title={language === 'ru' ? 'Скопировать' : 'Copy message'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white'}`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className={`p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 ${isLight ? 'bg-gray-100' : 'bg-[#1A1A1A]'}`}>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 shrink-0 ${isLight ? 'bg-gray-50 border-t border-gray-200' : 'bg-[#121212] border-t border-white/5'}`}>
        <div className={`flex items-center gap-2 max-w-4xl mx-auto bg-transparent border rounded-2xl p-2 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/50 ${isLight ? 'border-gray-300 bg-white' : 'border-white/10 bg-[#141414] focus-within:border-indigo-500/50'}`}>
          <FileUploadButton isLight={isLight} onUploadSuccess={(data) => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'system',
              content: `File uploaded: ${data.file.name} (${Math.round(data.file.size / 1024)} KB). Link: ${data.file.path}`,
              timestamp: new Date()
            }]);
          }} />
          <VoiceInputButton value={input} onChange={setInput} isLight={isLight} size="md" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('askSwarmPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-inherit placeholder-opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className={`text-center mt-2 text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
          {t('azrailSoulSwarmProtocol')}
        </div>
      </div>
    </div>
  );
}
