import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, User, ArrowUp, ArrowLeft, Loader2, Mic, MicOff, Volume2, 
  Sparkles, Plus, Flag, ThumbsUp, ThumbsDown, Copy, RotateCcw,
  MessageSquare, Layout, MoreHorizontal, Share2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import VoiceInputButton from '../../components/VoiceInputButton';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

interface SavedAgent {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  metadata: any;
  createdAt: string;
}

export default function AgentChatSimulator({ 
  agent, 
  onClose, 
  isLight 
}: { 
  agent: SavedAgent; 
  onClose: () => void;
  isLight: boolean;
}) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'agent', content: language === 'ru' ? `Привет! Я ${agent.name}. Чем могу помочь?` : `Hello! I am ${agent.name}. How can I assist you today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel();
    };
  }, [isVoiceMode]); // Re-bind if needed, though empty deps might be fine. We use state inside callback so we might need a ref or proper dependency. Actually, handleSendMessage will be called. Let's make sure it has latest state if it depends on it.

  // Use a ref for isVoiceMode to access in callbacks
  const isVoiceModeRef = useRef(isVoiceMode);
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
    if (!isVoiceMode) {
      window.speechSynthesis.cancel();
      if (isListening && recognitionRef.current) {
        recognitionRef.current.abort();
      }
    }
  }, [isVoiceMode, isListening]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window && isVoiceModeRef.current) {
      const cleanText = text.replace(/\[.*?\]:\s*/, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language === 'ru' ? 'ru-RU' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (text: string, isRegeneration = false) => {
    if (!text.trim()) return;

    if (!isRegeneration) {
      const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
      setMessages(prev => [...prev, userMessage]);
      
      // Save to Azrail Memory Core
      fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id.toLowerCase().replace(/\s+/g, '-'),
          message: { role: 'user', content: text }
        })
      }).catch(err => console.error('Failed to save user message to memory:', err));
    }
    
    setInput('');
    setIsTyping(true);

    try {
      const chatHistory = isRegeneration ? messages.slice(0, -1) : messages;
      const lastUserMessage = isRegeneration 
        ? [...messages].reverse().find(m => m.role === 'user')?.content || text
        : text;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lastUserMessage,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          history: chatHistory
        })
      });

      const data = await response.json();
      
      let responseText = data.data;
      if (!response.ok) {
        responseText = `[Error]: ${data.error || 'Failed to get response'}`;
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: responseText
      };

      // Save to Azrail Memory Core
      fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id.toLowerCase().replace(/\s+/g, '-'),
          message: { role: 'assistant', content: responseText }
        })
      }).catch(err => console.error('Failed to save agent message to memory:', err));

      if (isRegeneration) {
        setMessages(prev => [...prev.slice(0, -1), agentMessage]);
      } else {
        setMessages(prev => [...prev, agentMessage]);
      }
      speak(responseText);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `[Error]: ${err.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'agent') {
      handleSendMessage('', true);
    }
  };

  const handleExportChat = () => {
    const chatText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-with-${agent.name}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden relative ${isLight ? 'bg-[#FAFAFA]' : 'bg-[#1E1F22]'} text-base font-sans`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between gap-4 border-b ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${isLight ? 'text-indigo-600 fill-indigo-600' : 'text-blue-400 fill-blue-400'}`} />
            <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-[#e2e2e2]'}`}>Dark Mnmll Pulse OS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleExportChat}
             title="Export Chat"
             className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
           >
             <Share2 className="w-5 h-5" />
           </button>
           <button className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
             <Plus className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 scroll-smooth flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col space-y-8">
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className="flex flex-col w-full"
            >
              {msg.role === 'user' ? (
                <div className="flex justify-end w-full">
                  <div className={`max-w-[80%] rounded-3xl px-5 py-3 text-[15px] leading-relaxed ${isLight ? 'bg-gray-100 text-gray-900' : 'bg-[#2B2D31] text-[#e2e2e2]'}`}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full group">
                   <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{agent.model.replace(/-/g, ' ')}</span>
                      <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>• Ran for 2s</span>
                   </div>
                   <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isLight ? 'text-gray-900' : 'text-[#e2e2e2]'}`}>
                      {msg.content}
                   </div>
                   
                   {/* Action Bar */}
                   <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button className={`px-2 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`}>
                        <Flag className="w-4 h-4" /> Checkpoint
                      </button>
                      <button className={`p-1.5 rounded-md transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`}><ThumbsUp className="w-4 h-4" /></button>
                      <button className={`p-1.5 rounded-md transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`}><ThumbsDown className="w-4 h-4" /></button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleRegenerate}
                        className={`p-1.5 rounded-md transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 w-full"
            >
               <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{agent.model.replace(/-/g, ' ')}</span>
               </div>
               <div className={`flex items-center gap-2 text-[15px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
               </div>
            </motion.div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Suggestion Chips */}
        <AnimatePresence>
          {messages.length === 0 && !input.trim() && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="w-full max-w-4xl px-4 md:px-8 pb-3 pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-x"
            >
              <button className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors flex items-center gap-2 ${isLight ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700' : 'border-white/10 bg-[#2B2D31] hover:bg-white/10 text-[#E0E0E0]'}`}>
                <Sparkles className="w-3.5 h-3.5" /> Suggest an improvement
              </button>
              <button className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors flex items-center gap-2 ${isLight ? 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700' : 'border-white/10 bg-[#2B2D31] hover:bg-white/10 text-[#E0E0E0]'}`}>
                Optimize memory usage
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="w-full max-w-4xl px-4 md:px-8 pb-4">
          <form onSubmit={handleSend} className={`relative flex items-center p-1.5 rounded-[2rem] transition-colors ${isLight ? 'bg-gray-100' : 'bg-[#2B2D31]'}`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Make changes, add new features, ask for anything`}
              className={`flex-1 bg-transparent px-4 py-2.5 outline-none text-[15px] ${isLight ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-gray-400'}`}
            />
            <div className="flex items-center pr-1">
              <AnimatePresence mode="popLayout">
                {!input.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }} 
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)', width: 0 }} 
                    className="flex items-center origin-right"
                  >
                    <VoiceInputButton value={input} onChange={setInput} isLight={isLight} size="sm" />
                    <button type="button" className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}>
                        <Plus className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button 
                type="submit" 
                disabled={!input.trim()} 
                layout
                className={`p-2.5 ml-1 rounded-full flex items-center justify-center transition-all ${!input.trim() ? (isLight ? 'bg-transparent text-gray-400' : 'bg-transparent text-white/30') : (isLight ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200')}`}
              >
                  <ArrowUp className="w-4 h-4" />
              </motion.button>
            </div>
          </form>
        </div>

        {/* Bottom Tabs */}
        <div className={`w-full py-3 px-4 flex justify-between md:justify-center items-center gap-2 text-[13px] border-t ${isLight ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#1E1F22]'}`}>
           <div className="flex items-center gap-1 mx-auto">
             <button className={`px-5 py-1.5 rounded-full ${isLight ? 'bg-gray-100 text-gray-900 font-medium' : 'bg-[#2B2D31] text-white font-medium'}`}>Chat</button>
             <button className={`px-5 py-1.5 rounded-full ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>Preview</button>
             <button className={`px-2 py-1.5 rounded-full ${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}><MoreHorizontal className="w-5 h-5" /></button>
           </div>
        </div>
      </div>
    </div>
  );
}
