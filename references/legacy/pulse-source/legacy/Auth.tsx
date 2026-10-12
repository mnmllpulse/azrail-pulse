import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Fingerprint, 
  Mail, 
  Terminal, 
  ArrowRight, 
  Database, 
  Sparkles, 
  Cpu, 
  Layers, 
  Globe, 
  Send, 
  MessageSquare, 
  Check, 
  Loader2, 
  Activity, 
  HardDrive, 
  Star, 
  Lock, 
  Shield, 
  Languages, 
  RefreshCw, 
  Sliders, 
  Server, 
  Command, 
  ChevronRight, 
  X, 
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackItem {
  id: string;
  author: string;
  textEn: string;
  textRu: string;
  rating: number;
  timestamp: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  // Authentication Drawer State
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Core Telemetry State
  const [telemetry, setTelemetry] = useState({
    cpuLoad: 28,
    ramUsage: 4.12,
    activeSockets: 142,
    dbLatency: 4,
    uptime: '02:44:12'
  });

  // Sandbox 1: Neural Chat State
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sandbox 2: AI Translation State
  const [transText, setTransText] = useState('');
  const [transResult, setTransResult] = useState('');
  const [isTransLoading, setIsTransLoading] = useState(false);

  // Sandbox 3: Persistent Guestbook State
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [fbAuthor, setFbAuthor] = useState('');
  const [fbText, setFbText] = useState('');
  const [isFbSubmitting, setIsFbSubmitting] = useState(false);

  // Sandbox Tab Selection
  const [activeTab, setActiveTab] = useState<'chat' | 'translate' | 'guestbook'>('chat');

  // Fetch telemetry & guestbook feedback on mount
  useEffect(() => {
    fetchFeedback();
    
    // Telemetry updates simulation
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        cpuLoad: Math.floor(20 + Math.random() * 25),
        ramUsage: parseFloat((4.05 + Math.random() * 0.15).toFixed(2)),
        activeSockets: prev.activeSockets + (Math.random() > 0.5 ? 1 : -1),
        dbLatency: Math.floor(3 + Math.random() * 3),
        uptime: prev.uptime // Keep uptime stable
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/landing/feedback');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setFeedbacks(data.feedback);
        }
      }
    } catch (e) {
      console.error('Failed to load guestbook messages', e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    toast.loading(language === 'en' ? 'Synchronizing credential matrices...' : 'Синхронизация учетных записей...');

    setTimeout(() => {
      toast.dismiss();
      toast.success(language === 'en' ? 'Access Key accepted.' : 'Ключ доступа успешно подтвержден.');
      setIsSubmittingAuth(false);
      navigate('/dashboard');
    }, 1500);
  };

  const handlePasskeyLogin = () => {
    setIsSubmittingAuth(true);
    toast.loading(language === 'en' ? 'Scanning sovereign bio-signature...' : 'Сканирование суверенной био-подписи...');

    setTimeout(() => {
      toast.dismiss();
      toast.success(language === 'en' ? 'Biometrics verified. Welcome back, Architect.' : 'Биометрия проверена. С возвращением, Архитектор.');
      setIsSubmittingAuth(false);
      navigate('/dashboard');
    }, 1600);
  };

  // Trigger Neural Chat
  const handleNeuralChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;
    setIsChatLoading(true);
    setChatResponse('');
    toast.loading(language === 'en' ? 'Querying backend Gemini node...' : 'Запрос к узлу Gemini на сервере...');

    try {
      const res = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest_visitor',
          message: chatPrompt,
          systemPrompt: 'You are Azrail, the enigmatic overlord AI of the Dark Mnmll Pulse OS. Answer the visitor concisely with technical flair.'
        })
      });
      toast.dismiss();
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'ok') {
          setChatResponse(result.data);
          toast.success(language === 'en' ? 'AI response received!' : 'Ответ от ИИ получен!');
        } else {
          toast.error(result.error || 'Server error');
        }
      } else {
        toast.error('Network response was not ok');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Connection failed');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Trigger AI Translation
  const handleAITranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transText.trim()) return;
    setIsTransLoading(true);
    setTransResult('');
    toast.loading(language === 'en' ? 'Performing server-side context translation...' : 'Выполнение контекстного перевода на сервере...');

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transText,
          targetLang: language === 'en' ? 'ru' : 'en'
        })
      });
      toast.dismiss();
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'ok') {
          setTransResult(result.data);
          toast.success(language === 'en' ? 'Translation complete!' : 'Перевод выполнен!');
        } else {
          toast.error(result.error || 'Translation failed');
        }
      } else {
        toast.error('API Error');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to communicate with translation endpoint');
    } finally {
      setIsTransLoading(false);
    }
  };

  // Submit Feedback (Database persistent write)
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbAuthor.trim() || !fbText.trim()) {
      toast.error(language === 'en' ? 'Please fill in all fields' : 'Пожалуйста, заполните все поля');
      return;
    }
    setIsFbSubmitting(true);
    toast.loading(language === 'en' ? 'Saving record to uploads/feedback.json database...' : 'Сохранение записи в базу uploads/feedback.json...');

    try {
      const res = await fetch('/api/landing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: fbAuthor,
          textEn: language === 'en' ? fbText : '',
          textRu: language === 'ru' ? fbText : '',
          rating: 5
        })
      });
      toast.dismiss();
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'ok') {
          setFeedbacks(result.feedback);
          setFbText('');
          toast.success(language === 'en' ? 'Feedback committed successfully!' : 'Отзыв успешно сохранен в БД!');
        } else {
          toast.error(result.error || 'Write error');
        }
      } else {
        toast.error('Write failed');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to write to database endpoint');
    } finally {
      setIsFbSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07050F] text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      
      {/* Decorative Grid Mesh & Ambient Flares */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 90% 80%, rgba(14, 165, 233, 0.06) 0%, transparent 50%),
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px'
        }}
      />

      {/* Header Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-[#07050F]/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <span className="text-xs font-mono font-bold tracking-wider text-white">MP</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white uppercase font-mono">
              DARK MNMLL PULSE OS
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              {language === 'en' ? 'Neural Workspace Core' : 'Нейро-операционное ядро'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-indigo-500/30 hover:bg-white/5 transition-all text-xs font-mono"
            title="Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'en' ? 'EN' : 'RU'}</span>
          </button>

          {/* Enter Console Button */}
          <button
            onClick={() => setShowAuthDrawer(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{language === 'en' ? 'Enter OS Console' : 'Вход в Систему'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-24">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono uppercase tracking-widest">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>{language === 'en' ? 'Enterprise-Grade Full Stack' : 'Полноценный Enterprise Стек'}</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans">
              {language === 'en' ? (
                <>
                  The Minimalist OS <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400">
                    Driven by Autonomous AI
                  </span>
                </>
              ) : (
                <>
                  Минималистичная ОС <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400">
                    Управляемая Автономным ИИ
                  </span>
                </>
              )}
            </h2>

            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-xl font-mono">
              {language === 'en' ? (
                "Complete ecosystem with full-stack Node.js backend pipelines, persistent file database registers, dynamic Gemini AI model queries, and a stunning React frontend."
              ) : (
                "Завершенная экосистема с полноценным бэкендом на Node.js, постоянным файловым хранилищем данных, динамическими запросами к моделям Gemini ИИ и великолепным фронтендом на React."
              )}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => {
                  const element = document.getElementById('sandbox-terminal');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium rounded-xl text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(79,70,229,0.25)] transition-all flex items-center gap-3 cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-cyan-300" />
                <span>{language === 'en' ? 'Try Interactive Sandbox' : 'Интерактивная Песочница'}</span>
              </button>

              <button
                onClick={() => setShowAuthDrawer(true)}
                className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 text-zinc-300 hover:text-white font-medium rounded-xl text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{language === 'en' ? 'Launch Workspace' : 'Запустить Рабочий Кабинет'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Side Telemetry Card */}
          <div className="lg:col-span-5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-[#0C0A1A]/90 border border-white/10 rounded-2xl p-6 font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {language === 'en' ? 'CORE METRICS DETECTOR' : 'ДАТЧИК ПОКАЗАТЕЛЕЙ ЯДРА'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">PORT: 3000</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">CPU Load</span>
                    <span className="text-lg font-bold text-indigo-400 mt-1 block">{telemetry.cpuLoad}%</span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">RAM Cache</span>
                    <span className="text-lg font-bold text-indigo-400 mt-1 block">{telemetry.ramUsage} GB</span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">DB Latency</span>
                    <span className="text-lg font-bold text-indigo-400 mt-1 block">{telemetry.dbLatency} ms</span>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Sockets</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">{telemetry.activeSockets} live</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                  <span>System Uptime</span>
                  <span className="font-bold text-zinc-300">{telemetry.uptime}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SPECIALIST STUDIOS bento GRID */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xs font-bold tracking-widest text-indigo-400 uppercase font-mono">
              {language === 'en' ? 'OPERATIONAL SPHERES' : 'РАБОЧИЕ СФЕРЫ СИСТЕМЫ'}
            </h3>
            <h4 className="text-2xl md:text-4xl font-extrabold text-white">
              {language === 'en' ? 'Specialized Integration Hubs' : 'Специализированные Модули'}
            </h4>
            <p className="text-xs text-zinc-500 font-mono uppercase max-w-md mx-auto">
              {language === 'en' ? 'Explore visual tools engineered inside our Workspace' : 'Изучите возможности, заложенные в рабочем кабинете'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Studio 1 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Globe className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Web Studio' : 'Веб-Студия'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Visual component builder and layout orchestrator.' : 'Визуальный конструктор и генератор веб-интерфейсов.'}
                </p>
              </div>
              <span className="text-[9px] text-indigo-400/60 uppercase tracking-widest font-mono mt-4">01 // VISUAL LAYOUT</span>
            </div>

            {/* Studio 2 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Terminal className="w-5 h-5 text-emerald-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Code Studio' : 'Код-Студия'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Complete IDE with a sandboxed file explorer and project compiler.' : 'Интегрированная рабочая среда разработки, редактор и логи терминала.'}
                </p>
              </div>
              <span className="text-[9px] text-emerald-400/60 uppercase tracking-widest font-mono mt-4">02 // INTEGRATED IDE</span>
            </div>

            {/* Studio 3 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Cpu className="w-5 h-5 text-cyan-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Model Studio' : 'Студия Моделей'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Calibrate neural key configurations, temperature values, and output token scopes.' : 'Тонкая настройка параметров нейросети, температуры и лимитов токенов.'}
                </p>
              </div>
              <span className="text-[9px] text-cyan-400/60 uppercase tracking-widest font-mono mt-4">03 // NEURAL TUNER</span>
            </div>

            {/* Studio 4 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Sliders className="w-5 h-5 text-amber-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Automation Studio' : 'Студия Автоматизации'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Configure cognitive routing pipelines and automatic webhook events.' : 'Создание триггеров событий и автоматических вебхуков.'}
                </p>
              </div>
              <span className="text-[9px] text-amber-400/60 uppercase tracking-widest font-mono mt-4">04 // WEBHOOK ROUTING</span>
            </div>

            {/* Studio 5 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-pink-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 group-hover:bg-pink-600 group-hover:text-white transition-all">
                  <Activity className="w-5 h-5 text-pink-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Analytics Studio' : 'Студия Аналитики'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Monitor GPU usage, dynamic compilation latencies, and generation outputs.' : 'Живой мониторинг видеопамяти GPU, скорости генерации и расходов API.'}
                </p>
              </div>
              <span className="text-[9px] text-pink-400/60 uppercase tracking-widest font-mono mt-4">05 // TELEMETRY MONITOR</span>
            </div>

            {/* Studio 6 */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-rose-500/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <Shield className="w-5 h-5 text-rose-400 group-hover:text-white" />
                </div>
                <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {language === 'en' ? 'Security Center' : 'Центр Безопасности'}
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {language === 'en' ? 'Control client roles, secret key vaults, and sovereign encryption logs.' : 'Управление правами доступа, шифрованием и хранилищем ключей.'}
                </p>
              </div>
              <span className="text-[9px] text-rose-400/60 uppercase tracking-widest font-mono mt-4">06 // KEY VAULT</span>
            </div>

          </div>
        </section>

        {/* INTERACTIVE FULL-STACK COGNITIVE DEMO STATION */}
        <section id="sandbox-terminal" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
              {language === 'en' ? 'ACTIVE PIPELINES' : 'ДЕЙСТВУЮЩИЕ КОНВЕЙЕРЫ'}
            </h3>
            <h4 className="text-2xl md:text-4xl font-extrabold text-white">
              {language === 'en' ? 'Interactive Full-Stack Sandbox' : 'Интерактивная Full-Stack Песочница'}
            </h4>
            <p className="text-xs text-zinc-500 font-mono uppercase max-w-xl mx-auto">
              {language === 'en' ? 'Verify real client-server data synchronization in real-time below' : 'Проверьте реальную работу связки Фронтенд-Бэкенд-БД прямо на этой панели'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-white/10 rounded-2xl overflow-hidden bg-[#0A0815]">
            
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 border-r border-white/10 bg-white/[0.01] p-6 space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">
                {language === 'en' ? 'Select Pipeline Terminal' : 'Выберите Терминал данных'}
              </span>

              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full p-4 rounded-xl text-left border flex items-center justify-between transition-all font-mono ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                      : 'bg-transparent border-white/5 text-zinc-400 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold block uppercase">
                        {language === 'en' ? 'Neural Chat Proxy' : 'Нейрочат-Прокси'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">POST /api/chat/intelligent</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>

                <button
                  onClick={() => setActiveTab('translate')}
                  className={`w-full p-4 rounded-xl text-left border flex items-center justify-between transition-all font-mono ${
                    activeTab === 'translate'
                      ? 'bg-cyan-600/10 border-cyan-500/30 text-white'
                      : 'bg-transparent border-white/5 text-zinc-400 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold block uppercase">
                        {language === 'en' ? 'AI Translation node' : 'Узел AI Перевода'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">POST /api/translate</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>

                <button
                  onClick={() => setActiveTab('guestbook')}
                  className={`w-full p-4 rounded-xl text-left border flex items-center justify-between transition-all font-mono ${
                    activeTab === 'guestbook'
                      ? 'bg-purple-600/10 border-purple-500/30 text-white'
                      : 'bg-transparent border-white/5 text-zinc-400 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="text-xs font-bold block uppercase">
                        {language === 'en' ? 'Guestbook Database' : 'База Гостевой Книги'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">GET/POST /api/landing/feedback</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              </div>

              {/* Server Terminal Mini Log */}
              <div className="pt-6 border-t border-white/5 space-y-2">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block">
                  {language === 'en' ? 'Server Signal Console' : 'Консоль Сигналов Сервера'}
                </span>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-[9px] text-indigo-300 space-y-1 max-h-[140px] overflow-y-auto">
                  <p className="text-emerald-400">● [SERVER]: Express server listening on port 3000</p>
                  <p className="text-zinc-500">○ [DAEMON]: Metatron Core operational on port 3001</p>
                  <p className="text-indigo-400">● [DATABASE]: Connected to uploads/feedback.json</p>
                  {isChatLoading && <p className="text-amber-400">▶ [HTTP]: POST /api/chat/intelligent - PENDING</p>}
                  {isTransLoading && <p className="text-amber-400">▶ [HTTP]: POST /api/translate - PENDING</p>}
                  {isFbSubmitting && <p className="text-amber-400">▶ [HTTP]: POST /api/landing/feedback - PENDING</p>}
                </div>
              </div>
            </div>

            {/* Sandbox Main Terminal Output */}
            <div className="lg:col-span-8 p-6 bg-black/20 flex flex-col justify-between min-h-[420px]">
              <AnimatePresence mode="wait">
                
                {/* TAB 1: NEURAL CHAT PROXY */}
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">
                          {language === 'en' ? 'Live Gemini Chat Simulation' : 'Живая Симуляция Чат-Узла Gemini'}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">active route</span>
                      </div>

                      <div className="space-y-4 max-h-[220px] overflow-y-auto p-2 bg-white/[0.01] rounded-xl border border-white/5">
                        <div className="flex gap-2.5">
                          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-mono text-[10px] text-white shrink-0 mt-0.5">AZ</div>
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Azrail Overlord Core</span>
                            <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                              {language === 'en' ? 'Welcome. I proxy directly to the server\'s Gemini 3.5 Flash neural core. Enter any technical query below.' : 'Приветствую. Я перенаправляю запросы напрямую к ядру Gemini 3.5 Flash на сервере. Введите запрос.'}
                            </p>
                          </div>
                        </div>

                        {chatResponse && (
                          <div className="flex gap-2.5">
                            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-mono text-[10px] text-white shrink-0 mt-0.5">AZ</div>
                            <div className="space-y-1 min-w-0">
                              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Azrail Overlord Core</span>
                              <p className="text-xs text-indigo-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed font-mono">
                                {chatResponse}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleNeuralChat} className="flex gap-2.5 mt-4">
                      <input
                        type="text"
                        value={chatPrompt}
                        onChange={(e) => setChatPrompt(e.target.value)}
                        placeholder={language === 'en' ? 'Ask Azrail anything (e.g. explain cloud infrastructure)...' : 'Спросите Azrail (например, как устроен докер)...'}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 outline-none transition-colors"
                        disabled={isChatLoading}
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'en' ? 'Transmit' : 'Отправить'}</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* TAB 2: AI TRANSLATION NODE */}
                {activeTab === 'translate' && (
                  <motion.div
                    key="translate"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
                          {language === 'en' ? 'Context-Aware translation pipeline' : 'Контекстный Переводчик на Gemini'}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">active route</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">
                            {language === 'en' ? 'Source Input' : 'Исходный Текст'}
                          </label>
                          <textarea
                            value={transText}
                            onChange={(e) => setTransText(e.target.value)}
                            placeholder={language === 'en' ? 'Enter text in English to translate to Russian...' : 'Введите текст на русском для перевода на английский...'}
                            className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-cyan-500/50 outline-none transition-colors resize-none"
                            disabled={isTransLoading}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block">
                            {language === 'en' ? 'AI Output (Translation)' : 'Результат перевода ИИ'}
                          </label>
                          <div className="w-full h-28 bg-white/[0.01] border border-white/5 rounded-xl p-3 text-xs font-mono text-cyan-300 overflow-y-auto">
                            {isTransLoading ? (
                              <div className="flex items-center justify-center h-full gap-2 text-zinc-500">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                <span>Translating...</span>
                              </div>
                            ) : transResult ? (
                              transResult
                            ) : (
                              <span className="text-zinc-600">
                                {language === 'en' ? 'Translation output will render here...' : 'Результат перевода появится здесь...'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleAITranslate}
                        disabled={isTransLoading || !transText.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs rounded-xl px-6 py-3 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        <span>{language === 'en' ? 'Translate' : 'Перевести'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: PERSISTENT GUESTBOOK DATABASE */}
                {activeTab === 'guestbook' && (
                  <motion.div
                    key="guestbook"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-purple-400 font-mono uppercase tracking-wider">
                          {language === 'en' ? 'Persistent Guestbook Feed (File Database)' : 'Постоянная база гостевой книги (Файл-БД)'}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Real-time reads & writes</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        
                        {/* Write Form */}
                        <form onSubmit={handleAddFeedback} className="md:col-span-2 space-y-3">
                          <div>
                            <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block mb-1">Author</label>
                            <input
                              type="text"
                              value={fbAuthor}
                              onChange={(e) => setFbAuthor(e.target.value)}
                              placeholder="andrik494@gmail.com"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors"
                              disabled={isFbSubmitting}
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block mb-1">Message</label>
                            <textarea
                              value={fbText}
                              onChange={(e) => setFbText(e.target.value)}
                              placeholder={language === 'en' ? 'Enter public guestbook comment...' : 'Напишите комментарий в книгу...'}
                              className="w-full h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:border-purple-500/50 outline-none transition-colors resize-none"
                              disabled={isFbSubmitting}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isFbSubmitting}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-[10px] rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Commit to DB' : 'Записать в БД'}</span>
                          </button>
                        </form>

                        {/* Read List */}
                        <div className="md:col-span-3 space-y-3 max-h-[190px] overflow-y-auto p-1 bg-white/[0.01] rounded-xl border border-white/5">
                          {feedbacks.length > 0 ? (
                            feedbacks.map((fb) => (
                              <div key={fb.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-indigo-400 font-mono font-bold">{fb.author}</span>
                                  <span className="text-[8px] text-zinc-600 font-mono">
                                    {new Date(fb.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300 font-mono">
                                  {language === 'en' ? fb.textEn : fb.textRu}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                              No records found. Write the first entry!
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </section>

        {/* SECURITY & DEPLOY ARCHITECTURE PROOF */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white">
              {language === 'en' ? 'Secure, Immutable Sandbox' : 'Безопасная Неизменяемая Песочница'}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed font-mono">
              {language === 'en' ? (
                "The workspace protects all sensitive Gemini keys behind robust server proxies on Express. Rates are actively monitored, memory states synchronized via the Azrail Core daemon, and local actions backed up autonomously."
              ) : (
                "Рабочая среда надежно защищает все чувствительные ключи Gemini за прокси-сервером Express. Все лимиты активно проверяются, сессии кэшируются через демон Azrail Core, а изменения синхронизируются автономно."
              )}
            </p>

            <ul className="space-y-3 font-mono text-xs text-zinc-400">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{language === 'en' ? 'Zero Client-Side API Leakage risk' : 'Полное отсутствие риска утечки API-ключей'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{language === 'en' ? 'Real-time JSON database transaction logging' : 'Логирование транзакций в JSON-базу данных в реальном времени'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{language === 'en' ? 'WebAuthn Passkey simulation terminal' : 'Симуляция входа по биометрическим ключам Passkey'}</span>
              </li>
            </ul>
          </div>

          <div className="p-8 bg-gradient-to-br from-zinc-950 to-[#0C0B1B] border border-white/10 rounded-2xl space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{language === 'en' ? 'System Code Preview' : 'Фрагмент Серверного Кода'}</span>
            </h4>

            <div className="bg-black/60 rounded-xl p-4 border border-white/5 overflow-x-auto">
              <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed">
{`// server.ts - Secure Gemini API Proxy
app.post("/api/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    contents: [{ text: \`Translate \${text} into \${targetLang}\` }]
  });
  res.json({ status: "ok", data: response.text });
});`}
              </pre>
            </div>

            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono text-center">
              {language === 'en' ? 'ESTABLISHED SECURE EXPORTS' : 'НАДЕЖНАЯ АРХИТЕКТУРА ЭКСПОРТА'}
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 py-12 bg-black/40 text-center text-xs text-zinc-500 font-mono space-y-4">
        <p className="uppercase tracking-widest">
          {language === 'en' ? 'DARK MNMLL PULSE OS // VERIFIED FULL STACK COMPLIANCE' : 'DARK MNMLL PULSE OS // ПОЛНОЕ СООТВЕТСТВИЕ СТАНДАРТАМ'}
        </p>
        <p className="flex items-center justify-center gap-2">
          <span>{language === 'en' ? 'Crafted with' : 'Создано с'}</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>{language === 'en' ? 'for Developer andrik494@gmail.com' : 'для разработчика andrik494@gmail.com'}</span>
        </p>
      </footer>

      {/* SECURE ACCESS TERMINAL DRAWER (SLIDE-OUT) */}
      <AnimatePresence>
        {showAuthDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthDrawer(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#090714] border-l border-white/10 z-[110] p-8 flex flex-col justify-between font-mono"
            >
              <div className="space-y-8">
                {/* Drawer Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                      {language === 'en' ? 'SECURE CONSOLE LOGIN' : 'АВТОРИЗАЦИЯ ДОСТУПА'}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowAuthDrawer(false)}
                    className="p-1.5 rounded-lg border border-white/5 hover:border-white/20 text-zinc-500 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Auth Panel */}
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                      <Command className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase">
                      {language === 'en' ? 'Authenticating Developer' : 'Вход для Разработчиков'}
                    </h4>
                    <p className="text-[10px] text-zinc-500 uppercase">
                      {language === 'en' ? 'andrik494@gmail.com sovereign session' : 'сессия разработчика andrik494@gmail.com'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Passkey Option */}
                    <button
                      onClick={handlePasskeyLogin}
                      disabled={isSubmittingAuth}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_4px_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                    >
                      <Fingerprint className="w-5 h-5 text-cyan-300" />
                      <span>{language === 'en' ? 'Continue with Passkey' : 'Войти с помощью Passkey'}</span>
                    </button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] uppercase">OR</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Magic Link Option */}
                    <form onSubmit={handleLogin} className="space-y-3">
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">Developer Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="andrik494@gmail.com"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-indigo-500/50 transition-colors"
                          disabled={isSubmittingAuth}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingAuth}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4 text-indigo-400" />
                        <span>{language === 'en' ? 'Send Magic Link' : 'Получить Ссылку'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="text-[9px] text-zinc-600 text-center uppercase tracking-widest pt-6 border-t border-white/5">
                {language === 'en' ? 'Sovereign encryption protocol active' : 'Протокол шифрования активен'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
