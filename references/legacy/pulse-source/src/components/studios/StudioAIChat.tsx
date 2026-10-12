import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, Mic, MicOff, Volume2, VolumeX, Paperclip, 
  Loader2, Play, Check, FileText, Download, Sparkles, ChevronRight, 
  ChevronLeft, Brain, Cpu, Music, Video, Code, Globe, HelpCircle, Trash2, X, Copy, ClipboardPaste
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSystemState } from '../../contexts/SystemStateContext';
import { useStudioAI } from '../../contexts/StudioAIContext';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSpeaking?: boolean;
  fileAttachment?: {
    name: string;
    size: number;
    type: string;
    path?: string;
  };
}

interface StudioAIChatProps {
  studioType: string;
  isLight?: boolean;
}

export function StudioAIChat({ studioType, isLight = false }: StudioAIChatProps) {
  const { language } = useLanguage();
  const { playHover, playActivation } = useAudio();
  const { uiPreferences, setUIPreferences } = useSystemState();
  const { getAIContextPrompt } = useStudioAI();
  
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cached = localStorage.getItem(`chat_history_${studioType}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    return [];
  });
  
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${studioType}`, JSON.stringify(messages));
    }
  }, [messages, studioType]);

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    toast.success(language === 'ru' ? 'Скопировано!' : 'Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveResponse = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let ext = '.txt';
    if (studioType === 'code') ext = '.ts';
    else if (studioType === 'web') ext = '.html';
    else if (studioType === 'music') ext = '.json';
    else if (studioType === 'image') ext = '.txt';
    
    link.download = `ai-response-${studioType}-${Date.now()}${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(language === 'ru' ? 'Ответ сохранен в файл!' : 'Saved response to file!');
  };
  
  // Voice Input (Speech Recognition) state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Voice Output (TTS) state
  const isTtsEnabled = uiPreferences.ttsEnabled;
  const [activeSpeechUtterance, setActiveSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const exportChatHistory = async (format: 'pdf' | 'zip') => {
    try {
      const chatText = messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      if (format === 'zip') {
        const zip = new JSZip();
        zip.file(`chat-history-${studioType}.txt`, chatText);
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-export-${studioType}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const doc = new jsPDF();
        
        // Simple text wrap for PDF
        const lines = doc.splitTextToSize(chatText, 180);
        let y = 10;
        for (let i = 0; i < lines.length; i++) {
          if (y > 280) {
            doc.addPage();
            y = 10;
          }
          doc.text(lines[i], 10, y);
          y += 7;
        }
        doc.save(`chat-export-${studioType}.pdf`);
      }
      toast.success(language === 'ru' ? `Чат экспортирован в ${format.toUpperCase()}!` : `Chat exported to ${format.toUpperCase()}!`);
    } catch (e) {
      console.error('Export failed', e);
      toast.error('Export failed');
    }
  };

  // File Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    path?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Setup Default Messages based on Studio Type
  useEffect(() => {
    const welcomeMessages: Record<string, { en: string; ru: string }> = {
      web: {
        en: "Welcome to the Web Studio AI Assistant. Upload web layouts, ZIP repositories, or write prompts to generate full-stack responsive web interfaces, CSS designs, or SEO optimization plans.",
        ru: "Добро пожаловать в ИИ-ассистент Web-студии. Загружайте файлы макетов, ZIP-архивы или пишите запросы для генерации интерактивных веб-интерфейсов, стилей CSS и планов SEO-оптимизации."
      },
      code: {
        en: "Code Studio AI active. Describe software architectures, backend APIs, or upload code scripts (JS, TS, Python, PDF) to analyze logic structures and auto-generate clean executable scripts.",
        ru: "ИИ-модуль Код-студии активен. Опишите архитектуру программного обеспечения, эндпоинты API или загружайте скрипты (JS, TS, Python, PDF) для рефакторинга и генерации чистого кода."
      },
      music: {
        en: "Quantum Music Orchestrator loaded. Upload Ableton Live templates (.als / ZIP), audio samples, synth presets, or prompt me to write custom generative algorithms and melody sequences.",
        ru: "Квантовый музыкальный оркестратор запущен. Загружайте шаблоны Ableton Live (.als / ZIP), аудио-сэмплы, пресеты синтезаторов или попросите меня написать генеративные алгоритмы и аккорды."
      },
      video: {
        en: "Video Studio AI initialized. Upload video clips, cinematic scripts, scene templates, or prompt to generate structured screenplay dialogues, visual cues, and shot list timelines.",
        ru: "ИИ-модуль Видео-студии инициализирован. Загружайте видеоклипы, кинематографические сценарии, шаблоны сцен или пишите запросы для генерации раскадровок и диалогов."
      },
      agent: {
        en: "Autonomous Agent Forge companion online. Prompt to synthesize neural bot properties, configure cognitive workflows, or upload bot blueprints and workflow parameters in JSON/ZIP.",
        ru: "Компаньон кузницы автономных агентов в сети. Задавайте параметры для синтеза когнитивных ботов, настраивайте мультиагентные воркфлоу или загружайте чертежи JSON/ZIP."
      },
      image: {
        en: "Neural Image Studio companion active. Describe visual assets, banner dimensions, or upload sketches to draft Stable Diffusion parameters, custom SVG compositions, and design guidelines.",
        ru: "Нейросетевой компаньон Имидж-студии активен. Опишите визуальные ассеты, баннеры или загружайте наброски для генерации промптов Stable Diffusion, SVG-графики и руководств."
      },
      lab: {
        en: "Pulse Neuro-Lab environment connected. Upload research datasets, biochemical sequences, or prompt to design futuristic deep learning experiments and biological matrix predictions.",
        ru: "Окружение нейролаборатории Pulse подключено. Загружайте наборы данных исследований, биохимические цепочки или ставьте задачи по проектированию экспериментов глубокого обучения."
      },
      knowledge: {
        en: "Semantic Knowledge Hub AI active. Upload heavy documents (PDF, DOCX, TXT), database structures, or ask queries to retrieve vectorized information, construct synapses, and index memories.",
        ru: "ИИ Семантического Хаба Знаний активен. Загружайте документы (PDF, DOCX, TXT), структуры баз данных или пишите запросы для векторного поиска информации и индексации синапсов."
      },
      sandbox: {
        en: "Core Full-Stack Sandbox active. Root mode enabled. Upload anything: ZIP, Code, HTML, Tracks, Ableton Live projects, VST data, PDFs. Let's engineer the Pulse OS architecture together.",
        ru: "Ядро Full-Stack песочницы активно. Доступ root включен. Загружайте любые форматы: ZIP, Код, HTML, Треки, Ableton Live, данные VST, PDF. Давайте конструировать архитектуру Pulse OS вместе."
      }
    };

    const defMsg = welcomeMessages[studioType] || {
      en: "Studio AI Core active. I am ready to assist you. Ask questions, upload workspace files, or dictate voice commands.",
      ru: "Ядро ИИ-студии активно. Я готов помочь вам. Задавайте вопросы, загружайте файлы проекта или диктуйте голосовые команды."
    };

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: language === 'ru' ? defMsg.ru : defMsg.en,
        timestamp: new Date()
      }
    ]);
  }, [studioType, language]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup Web Speech API (Speech Recognition)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === 'ru' ? 'ru-RU' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
        toast.success(language === 'ru' ? `Распознано: "${transcript}"` : `Transcribed: "${transcript}"`);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak a message (Text-To-Speech)
  const speakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error(language === 'ru' ? 'Синтез речи не поддерживается браузером' : 'Speech synthesis not supported in this browser');
      return;
    }

    // Toggle active speaking or stop if already speaking this message
    const currentlySpeaking = messages.find(m => m.id === msgId)?.isSpeaking;
    window.speechSynthesis.cancel();

    if (currentlySpeaking) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isSpeaking: false } : m));
      return;
    }

    // Set all other messages to not speaking
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isSpeaking: true } : { ...m, isSpeaking: false }));

    // Clean text from markdown notations before speaking
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/```[\s\S]*?```/g, '[Code Block]')
      .substring(0, 800); // safety cap

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'ru' ? 'ru-RU' : 'en-US';
    
    // Attempt to set a premium sounding natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const desiredLang = language === 'ru' ? 'ru' : 'en';
    const voice = voices.find(v => v.lang.startsWith(desiredLang) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isSpeaking: false } : m));
    };

    utterance.onerror = () => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isSpeaking: false } : m));
    };

    window.speechSynthesis.speak(utterance);
    setActiveSpeechUtterance(utterance);
  };

  // Toggle listening
  const handleMicClick = () => {
    playActivation();
    if (!recognitionRef.current) {
      toast.error(language === 'ru' ? 'Голосовой ввод не поддерживается вашим браузером.' : 'Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel(); // Stop speaking when starting to listen
      recognitionRef.current.start();
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  // Handle standard file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  // Upload file function
  const uploadFile = async (file: File) => {
    playActivation();
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errMsg = 'Upload failed';
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch(e) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      if (result.status === 'ok') {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          path: result.file?.path
        });
        toast.success(
          language === 'ru' 
            ? `Файл "${file.name}" успешно загружен!` 
            : `File "${file.name}" uploaded successfully!`
        );
      }
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error(
        language === 'ru'
          ? 'Не удалось загрузить файл'
          : 'File upload failed'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && !uploadedFile) return;

    playActivation();
    const promptText = inputValue.trim();
    const promptFile = uploadedFile;
    
    // Clear inputs
    setInputValue('');
    setUploadedFile(null);

    // Create user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText || (language === 'ru' ? `Анализ файла: ${promptFile?.name}` : `Analyzing file: ${promptFile?.name}`),
      timestamp: new Date(),
      fileAttachment: promptFile || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // Structure the specific system instruction role based on Studio Type
      const systemInstructions: Record<string, string> = {
        web: `You are the Web Design Lead. Provide responsive layouts, Tailwind classes, and HTML structures.`,
        code: `You are the Principal Software Architect. Focus on typescript, Express API endpoints, modular patterns, and clean code optimization.`,
        music: `You are the Sound Designer & Ableton Arranger. Provide MIDI sequence notes, wavetable instructions, chord intervals (Cmaj7, etc.), synthesizers presets formulas, and arrangement timelines.`,
        video: `You are the Cinematic Director and Scriptwriter. Generate dramatic scenes, structured screenplay formats, shot guides, and video script scenarios.`,
        agent: `You are the Cognitive Bot Architect. Design multi-agent workflows, state rules, JSON configurations, and prompt commands.`,
        image: `You are the Creative Graphic Designer. Create design style briefs, Stable Diffusion prompt weights, color palettes, and SVG mockups.`,
        lab: `You are the Quantum Bioinformatics Lead. Propose advanced data modeling experiments, neural sequences, bio-synthetic steps, and formulas.`,
        knowledge: `You are the Chief Knowledge Engineer. Extract vector indexes, build semantic graphs, map episodic memory arrays, and index databases.`
      };

      const rolePrompt = systemInstructions[studioType] || `You are an AI assistant in the Dark Mnmll Pulse OS.`;
      
      // Inject uploaded file context if present
      let finalMessage = promptText;
      if (promptFile) {
        finalMessage += `\n\n[USER ATTACHED WORKSPACE FILE: Name: ${promptFile.name}, Type: ${promptFile.type}, Size: ${promptFile.size} bytes]. Analyze this file structure and incorporate it into your studio generation task.`;
      }

      // Wrap with AI Context Provider to include workspace files & terminal logs
      const enrichedMessage = getAIContextPrompt(finalMessage);

      const response = await fetch('/api/chat/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'workspace_user',
          message: enrichedMessage,
          systemPrompt: `You are a high-tech AI module in the Dark Mnmll Pulse OS, specifically serving the "${studioType}" studio. Answer precisely, use a minimal tech/Swiss aesthetic tone, format key code or specifications cleanly, and respond in the user's language (either English or Russian). You are aware of the workspace file tree and terminal logs provided to help user debug, write, or fix scripts. ${rolePrompt}`,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        })
      });

      if (!response.ok) {
        throw new Error('Intelligence api failure');
      }

      const resJson = await response.json();
      
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: resJson.data || 'Error loading response',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Auto TTS if enabled
      if (isTtsEnabled && resJson.data) {
        speakText(resJson.data, assistantMsg.id);
      }

    } catch (err) {
      console.error(err);
      toast.error(language === 'ru' ? 'Ошибка соединения с ИИ' : 'AI connection failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStudioIcon = () => {
    switch (studioType) {
      case 'web': return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'code': return <Code className="w-4 h-4 text-blue-400" />;
      case 'music': return <Music className="w-4 h-4 text-amber-400 animate-pulse" />;
      case 'video': return <Video className="w-4 h-4 text-pink-400" />;
      case 'agent': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'lab': return <Brain className="w-4 h-4 text-emerald-400" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative shrink-0 z-40 select-none">
      {/* Mini Toggle tab sticking to side when collapsed */}
      {!isOpen && (
        <button
          onClick={() => {
            playActivation();
            setIsOpen(true);
          }}
          className={`fixed right-0 top-1/2 -translate-y-1/2 p-3 rounded-l-2xl border flex flex-col items-center gap-2 shadow-2xl transition-all cursor-pointer z-[45] ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              : 'bg-[#0B081E]/95 border-purple-900/30 text-indigo-300 hover:bg-purple-950/20'
          }`}
        >
          <ChevronLeft className="w-4 h-4 animate-bounce-left" />
          <MessageSquare className="w-5 h-5 animate-pulse text-indigo-400" />
          <span className="text-[8px] font-mono font-bold tracking-widest uppercase writing-mode-vertical">
            {language === 'ru' ? 'ИИ ЧАТ' : 'AI CHAT'}
          </span>
        </button>
      )}

      {/* Main Collapsible Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
            className={`flex flex-col border rounded-3xl overflow-hidden shadow-2xl h-[70vh] lg:h-[75vh] w-full lg:w-[450px] ${
              isDragging ? 'ring-2 ring-indigo-500/50' : ''
            } ${
              isLight 
                ? 'bg-[#F9FAFB]/95 border-zinc-200 text-zinc-900' 
                : 'bg-[#070511]/95 border-purple-950/40 text-zinc-200'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-zinc-100/90 border-zinc-200' : 'bg-[#0A071A]/95 border-white/5'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${isLight ? 'bg-zinc-200 text-zinc-800' : 'bg-white/5'}`}>
                  {getStudioIcon()}
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono">
                    {language === 'ru' ? 'Студийный ИИ Компаньон' : 'Studio AI Companion'}
                  </h4>
                  <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                    {studioType.toUpperCase()} WORKSPACE
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Export Buttons */}
                <button
                  onClick={() => {
                    playActivation();
                    exportChatHistory('pdf');
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isLight 
                      ? 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100' 
                      : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Export Chat to PDF"
                >
                  <span className="text-[9px] font-bold">PDF</span>
                </button>
                <button
                  onClick={() => {
                    playActivation();
                    exportChatHistory('zip');
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isLight 
                      ? 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100' 
                      : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Export Chat to ZIP"
                >
                  <span className="text-[9px] font-bold">ZIP</span>
                </button>

                {/* TTS Toggle */}
                <button
                  onClick={() => {
                    playActivation();
                    setUIPreferences({ ...uiPreferences, ttsEnabled: !uiPreferences.ttsEnabled });
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isTtsEnabled
                      ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                      : isLight 
                        ? 'border-zinc-200 text-zinc-400 bg-white hover:text-zinc-600'
                        : 'border-white/5 text-zinc-600 bg-white/3 hover:text-zinc-400'
                  }`}
                  title={isTtsEnabled ? "Disable automatic Text-To-Speech (Global)" : "Enable automatic Text-To-Speech (Global)"}
                >
                  {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Hide drawer button */}
                <button
                  onClick={() => {
                    playActivation();
                    setIsOpen(false);
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isLight 
                      ? 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100' 
                      : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Drag & Drop Visual overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-500/50 m-4 rounded-2xl"
                >
                  <Paperclip className="w-12 h-12 text-indigo-400 animate-bounce" />
                  <h3 className="text-sm font-bold uppercase tracking-widest mt-3">
                    {language === 'ru' ? 'Перетащите файл сюда' : 'Drop Workspace Files'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase mt-1 text-center">
                    {language === 'ru' 
                      ? 'Поддерживаются ZIP, PDF, Ableton проекты (.als), сэмплы и синт пресеты' 
                      : 'Accepts ZIP, PDF, Ableton (.als), WAV samples, & synth parameters'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative ${
              isLight ? 'bg-zinc-50' : 'bg-black/20'
            }`}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  {/* File Attachment Header if present */}
                  {msg.fileAttachment && (
                    <div className={`mb-1 p-2 rounded-xl border flex items-center gap-2 text-[10px] font-mono ${
                      isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/3 border-white/5'
                    }`}>
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <div className="min-w-0 max-w-[160px]">
                        <p className="truncate font-bold text-zinc-300">{msg.fileAttachment.name}</p>
                        <p className="text-[8px] text-zinc-500 uppercase">
                          {(msg.fileAttachment.size / 1024).toFixed(1)} KB • {msg.fileAttachment.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bubble Message */}
                  <div 
                    className={`p-3 rounded-2xl text-xs leading-relaxed font-mono cursor-text select-text ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : isLight
                          ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-xs'
                          : 'bg-[#0E0B25]/90 border border-purple-950/30 text-zinc-300 rounded-tl-none'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleCopyText(msg.content, msg.id);
                    }}
                    title={language === 'ru' ? 'Зажмите/Правый клик для копирования' : 'Long-press/Right-click to copy'}
                  >
                    {msg.content}
                  </div>

                  {/* Speak message or utility footer */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2.5 mt-1 px-1">
                      {/* Listen Button */}
                      <button
                        onClick={() => speakText(msg.content, msg.id)}
                        className={`text-[9px] font-mono flex items-center gap-1 cursor-pointer hover:text-indigo-400 transition-colors ${
                          msg.isSpeaking ? 'text-cyan-400 font-bold animate-pulse' : 'text-zinc-500'
                        }`}
                      >
                        {msg.isSpeaking ? (
                          <>
                            <VolumeX className="w-2.5 h-2.5" />
                            <span>[ {language === 'ru' ? 'Стоп' : 'Mute'} ]</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>[ {language === 'ru' ? 'Слушать' : 'Listen'} ]</span>
                          </>
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className={`text-[9px] font-mono flex items-center gap-1 cursor-pointer hover:text-indigo-400 transition-colors ${
                          copiedId === msg.id ? 'text-emerald-400 font-bold' : 'text-zinc-500'
                        }`}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span>[ {language === 'ru' ? 'Скопировано' : 'Copied'} ]</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>[ {language === 'ru' ? 'Копии' : 'Copy'} ]</span>
                          </>
                        )}
                      </button>

                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveResponse(msg.content)}
                        className="text-[9px] font-mono flex items-center gap-1 cursor-pointer hover:text-indigo-400 text-zinc-500 transition-colors"
                      >
                        <Download className="w-2.5 h-2.5" />
                        <span>[ {language === 'ru' ? 'Сохранить' : 'Save'} ]</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>
                    {language === 'ru' ? 'ИИ генерирует сценарий/код...' : 'AI processing scenario/assets...'}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attached file pre-upload box */}
            {uploadedFile && (
              <div className={`p-2.5 border-t shrink-0 flex items-center justify-between ${
                isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0B081E]/60 border-white/5'
              }`}>
                <div className="flex items-center gap-2 text-[10px] font-mono min-w-0">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-indigo-300">{uploadedFile.name}</p>
                    <p className="text-[8px] text-zinc-500 uppercase">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • READY TO SEND
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playActivation();
                    setUploadedFile(null);
                  }}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form 
              onSubmit={handleSendMessage} 
              className={`p-3 border-t flex items-center gap-2 shrink-0 ${
                isLight ? 'bg-white border-zinc-200' : 'bg-[#06040C] border-white/5'
              }`}
            >
              {/* File Upload Button */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isUploading
                    ? 'opacity-50 cursor-wait'
                    : isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
                title="Upload ZIP, PDF, Ableton Templates, Samples or Synths"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 text-indigo-400" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="*/*"
              />

              {/* Paste Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setInputValue(prev => prev + text);
                    toast.success("Pasted from clipboard");
                  } catch (e) {
                    toast.error("Clipboard access denied");
                  }
                }}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer hidden sm:flex ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Text Area Prompt Input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  language === 'ru' 
                    ? 'Сценарий, музыка, код, ZIP...' 
                    : 'Prompt scripts, music, code...'
                }
                className={`flex-1 text-xs px-3 py-2 border rounded-xl font-mono focus:outline-none transition-all ${
                  isLight
                    ? 'bg-white border-zinc-200 text-zinc-900 focus:border-indigo-500'
                    : 'bg-black/30 border-white/5 text-zinc-100 focus:border-indigo-500/50 placeholder-zinc-600'
                }`}
              />

              {/* Voice Command Button */}
              <button
                type="button"
                onClick={handleMicClick}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500/20 border-red-500/40 text-red-500 animate-pulse'
                    : isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
                title={language === 'ru' ? 'Голосовой ввод' : 'Dictate with your voice'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isGenerating || (!inputValue.trim() && !uploadedFile)}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isGenerating || (!inputValue.trim() && !uploadedFile)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-indigo-500/30'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Footer quick action helper */}
            <div className={`px-4 py-1.5 border-t text-[8px] font-mono text-zinc-500 uppercase tracking-widest shrink-0 flex justify-between ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0A071A]/80 border-white/5'
            }`}>
              <span>Speech input active</span>
              <span>Ableton/ZIP supported</span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
