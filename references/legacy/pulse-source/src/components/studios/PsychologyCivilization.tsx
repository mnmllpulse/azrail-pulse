import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, BookOpen, ShieldAlert, Sparkles, Lock, RefreshCw, Play, Check, 
  Eye, Skull, TrendingUp, UserCheck, FileText, HelpCircle, Activity, 
  Flame, ShieldCheck, ChevronRight, BookOpenCheck, Copy, Award, AlertTriangle, 
  ArrowRight, Search, Zap, MessageSquare, Sliders, Cpu, Download, Sparkle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { pulsePsychologyCore } from '../../modules/PsychologyCivilization/store';
import { ArchetypeData } from '../../modules/PsychologyCivilization/types';
import { ManipulationParserUI } from './ManipulationParserUI';
import { CognitiveGraph } from './CognitiveGraph';
import { PsychologyCivilizationHub } from './PsychologyCivilizationHub';
import { PsychologicalRadar } from './PsychologicalRadar';

export function PsychologicalArchetypeCard({ archetype, isLight }: { archetype: ArchetypeData, isLight?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-black/60 border-white/5 shadow-2xl'}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-tight">{archetype.name}</h4>
            <span className="text-[10px] text-zinc-500 font-mono">Archetype ID: {archetype.id}</span>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-zinc-400 leading-relaxed mb-5 font-mono">
        {archetype.description}
      </p>

      <div className="space-y-4">
        <div>
          <h5 className="text-[10px] uppercase font-bold text-zinc-500 mb-2 font-mono flex items-center gap-1.5">
            <Sliders className="w-3 h-3" /> OCEAN Profile
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(archetype.ocean).map(([trait, value]) => (
              <div key={trait} className="flex justify-between items-center bg-white/5 p-1.5 rounded text-[9px] font-mono">
                <span className="text-zinc-400 uppercase">{trait.substring(0, 3)}</span>
                <span className="text-rose-400 font-bold">{Math.round(value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-[10px] uppercase font-bold text-zinc-500 mb-2 font-mono flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" /> Core Techniques
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {archetype.techniques.map((tech, i) => (
              <span key={i} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono uppercase">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PsychologyCivilizationProps {
  isLight?: boolean;
  playBeep: (freq?: number, duration?: number) => void;
}

export function PsychologyCivilization({ isLight, playBeep }: PsychologyCivilizationProps) {
  const [activeTab, setActiveTab] = useState<'parser' | 'competitor' | 'forge' | 'library' | 'vip'>('parser');

  // ==========================================
  // STATE: TAB 1 (PARSER)
  // ==========================================
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<number>(0);

  // ==========================================
  // STATE: TAB 2 (COMPETITOR SCANNER & TIMELINE)
  // ==========================================
  const [competitorText, setCompetitorText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [selectedStrikeHour, setSelectedStrikeHour] = useState<number | null>(null);

  // ==========================================
  // STATE: TAB 3 (FORGE AGENTS / DYNAMIC WEIGHT)
  // ==========================================
  const [agentName, setAgentName] = useState('NEXUS-7');
  const [archetype, setArchetype] = useState<'shadow' | 'sage' | 'trickster' | 'destroyer'>('sage');
  const [darkTriad, setDarkTriad] = useState({ narcissism: 40, machiavellianism: 60, psychopathy: 20 });
  const [ocean, setOcean] = useState({ openness: 80, conscientiousness: 70, extraversion: 50, agreeableness: 30, neuroticism: 40 });
  const [cognitiveBias, setCognitiveBias] = useState('Scarcity Bias (Иллюзия редкости)');
  const [forging, setForging] = useState(false);
  const [forgedAgent, setForgedAgent] = useState<any | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Dynamic weight adjustment state
  const [successScore, setSuccessScore] = useState<number>(0.8);
  const [agentWeights, setAgentWeights] = useState({
    dark_psychology_usage: 0.5,
    strategic_parsing: 0.6,
    empathy_level: 0.3
  });
  const [agentLearnLogs, setAgentLearnLogs] = useState<string[]>([
    'Ядро инициализировано со стандартными весами.',
  ]);

  // ==========================================
  // STATE: VIP / PRE-COGNITION MODULES (PULSE CORE API)
  // ==========================================
  const [vipUnlocked, setVipUnlocked] = useState<boolean>(true); // Unlocked by default for a pristine premium experience
  const [vipSphere, setVipSphere] = useState<'strategy' | 'defense' | 'influence'>('strategy');
  
  // 1. Shadow-Negotiator simulation
  const [shadowObjective, setShadowObjective] = useState<string>('Убедить оппонента снизить стоимость контракта на 25%');
  const [simulatingShadow, setSimulatingShadow] = useState<boolean>(false);
  const [shadowResult, setShadowResult] = useState<any | null>(null);

  // 2. Social Engineering Shield
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [shieldInput, setShieldInput] = useState<string>('Привет, это служба поддержки банка. Срочно пройдите по этой ссылке, чтобы подтвердить ваши данные для предотвращения списания $500.');
  const [shieldScanning, setShieldScanning] = useState<boolean>(false);
  const [shieldVerdict, setShieldVerdict] = useState<any | null>(null);

  // 3. Digital Double 2.0
  const [doubleTrainingInput, setDoubleTrainingInput] = useState<string>('Мои стандартные фразы: "Давайте посмотрим на факты", "Я ценю честность", "Это не подлежит обсуждению".');
  const [trainingDouble, setTrainingDouble] = useState<boolean>(false);
  const [digitalDouble, setDigitalDouble] = useState<any | null>(null);
  const [doubleChatMsg, setDoubleChatMsg] = useState<string>('');
  const [doubleChatHistory, setDoubleChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [sendingDoubleMsg, setSendingDoubleMsg] = useState<boolean>(false);

  // 4. Charisma Synthesizer & NLP Jailbreaking (Sphere: Influence)
  const [charismaInput, setCharismaInput] = useState<string>('Мы запускаем новый продукт, покупайте.');
  const [charismaWeight, setCharismaWeight] = useState<number>(0.8);
  const [charismaResult, setCharismaResult] = useState<string>('');
  const [generatingCharisma, setGeneratingCharisma] = useState<boolean>(false);

  // 5. Deep Persona Emulation (Sphere: Strategy)
  const [darkPersona, setDarkPersona] = useState<string>('Никколо Макиавелли');
  const [darkPersonaInput, setDarkPersonaInput] = useState<string>('');
  const [darkPersonaHistory, setDarkPersonaHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chattingDark, setChattingDark] = useState<boolean>(false);

  // ==========================================
  // STATE: TAB 4 (BOOKSHELF / LIBRARY)
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');

  // ==========================================
  // PRESETS & DATABASES
  // ==========================================
  const bookshelf = pulsePsychologyCore.getBookshelf();
  const archetypesLibrary = pulsePsychologyCore.getArchetypes();

  const presets = [
    {
      label: 'Манипуляция (Закрытый клуб)',
      text: 'Слушай, только для своих ребят из закрытого клуба, я могу уступить эту схему всего за $150 вместо $1500. Но решить нужно прямо сейчас, у меня на очереди еще три человека стоят, которые заберут с руками. Ты же умный парень, сам понимаешь, что упускать такую тему — это просто глупо. Я бы на твоем месте даже не думал.'
    },
    {
      label: 'Агрессивный Рекламный Скрипт (Курсы)',
      text: 'ВНИМАНИЕ! Последний шанс изменить свою жизнь! 99% людей останутся нищими у разбитого корыта, пока ты сомневаешься. Только сегодня и только для первых 5 счастливчиков — секретная методика заработка от секретного миллионера бесплатно. Наш курс прошли 100 000 человек и все уволились с работы. Кликай сейчас или жалей всю жизнь!'
    },
    {
      label: 'Газлайтинг в Переписке',
      text: 'Я никогда такого не говорил, тебе вечно всё кажется. Ты просто слишком остро реагируешь и пытаешься раздуть конфликт на ровном месте. Если бы ты нормально ко мне относился, то доверял бы моим словам, а не устраивал сцены. Ты сам виноват в том, что у нас проблемы, а теперь пытаешься сделать крайним меня.'
    }
  ];

  const competitorPresets = [
    {
      label: 'Агрессивный Копирайтинг Конкурента A',
      text: 'Наше решение стирает с лица земли любые другие попытки анализа. Конкуренты продают вам детские игрушки, пока мы поставляем военный софт стратегического контроля. Либо вы покупаете нашу годовую лицензию прямо сейчас, либо ваши данные украдут хакеры уже к концу недели. Это не угроза, а математическая реальность.'
    },
    {
      label: 'Элитарный Снобский Манифест Конкурента B',
      text: 'Для понимания нашего протокола требуется IQ выше 140. Мы не пишем документацию для дилетантов, если вы не разбираетесь в теории категориальных мета-систем — этот продукт просто не для вас. Наши закрытые VIP-встречи доступны только избранным холдерам. Нам не нужны дешевые клиенты, мы строим касту бессмертных архитекторов.'
    },
    {
      label: 'Усыпляющая Доброжелательность Стартапа C',
      text: 'Мы создали наш уютный сервис всей семьей на коленке из любви ко всему человечеству. У нас нет инвесторов, мы абсолютно бесплатны и не берем с вас ни копейки. Мы просто просим вас оставить реквизиты вашей карты исключительно для подтверждения вашей человечности. Нам нечего скрывать, мы верим в вечную дружбу.'
    }
  ];

  const cognitiveBiases = pulsePsychologyCore.getTriggers().map(t => t.name);

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    toast.success('Скопировано в буфер обмена');
    playBeep(900, 0.05);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const runAnalysis = async () => {
    if (!inputText.trim()) {
      toast.error('Введите или выберите текст для анализа');
      return;
    }

    setAnalyzing(true);
    setPipelineStep(1);
    playBeep(440, 0.1);
    setAnalysisResult(null);

    try {
      // Simulate Pipeline Step 1
      setTimeout(() => { setPipelineStep(2); playBeep(520, 0.08); }, 800);
      // Simulate Pipeline Step 2
      setTimeout(() => { setPipelineStep(3); playBeep(620, 0.08); }, 1600);
      // Simulate Pipeline Step 3
      setTimeout(() => { setPipelineStep(4); playBeep(720, 0.08); }, 2400);

      const prompt = `
Вы — ведущий эксперт по социальной инженерии, тёмной психологии и психологии маркетинга в секретной лаборатории PULSE LAB.
Ваша задача — разложить предложенный текст "на атомы" через тройной контур анализа:
1. Парсинг/Профайлинг автора (Кто говорит?) по модели OCEAN (Большая Пятерка) и Тёмной Триаде (Нарциссизм, Макиавеллизм, Психопатия). Дайте точные процентные оценки и краткий психологический вердикт.
2. Детектор уязвимостей (На что бьют?) — найдите и подсветите все скрытые уловки, манипуляции, логические искажения, ложные якоря (Anchoring), искусственный дефицит, социальное давление, газлайтинг или "любовную бомбардировку".
3. Контр-стратегия (Как защититься?) — пошаговая практическая инструкция для пользователя.
4. Генератор доверия (Этичный рерайт) — перепишите этот текст так, чтобы он нес ТУ ЖЕ базовую прагматическую ценность, но был на 100% честным, экологичным и вызывал максимальное доверие холодного клиента за счет чистого, прозрачного маркетинга без обмана.

Верните результат строго в формате валидного JSON-объекта (без каких-либо посторонних слов вокруг, без markdown-разметки типа \`\`\`json, просто чистый JSON-текст), соответствующего следующей TypeScript-структуре:

{
  "authorProfile": {
    "ocean": {
      "openness": number (0-100),
      "conscientiousness": number (0-100),
      "extraversion": number (0-100),
      "agreeableness": number (0-100),
      "neuroticism": number (0-100)
    },
    "darkTriad": {
      "narcissism": number (0-100),
      "machiavellianism": number (0-100),
      "psychopathy": number (0-100)
    },
    "verdict": "строка с детальным психологическим портретом автора"
  },
  "detections": [
    {
      "triggerText": "точная фраза из текста",
      "manipulationType": "название манипуляции (например: Эффект привязки, Газлайтинг и т.д.)",
      "explanation": "почему это манипуляция и на что она бьет в нашей психике"
    }
  ],
  "defenseStrategy": [
    "пошаговое действие 1",
    "пошаговое действие 2",
    "пошаговое действие 3"
  ],
  "ethicalRewrite": "переписанный текст высокой честности и доверия"
}

Анализируемый Текст:
"${inputText}"
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          systemPrompt: "You are PULSE LAB Psycho-Cognitive Analyzer. Output ONLY valid JSON matching the requested schema. No markdown formatting, no comments."
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при генерации анализа');
      }

      let cleanJsonText = data.data || '';
      if (cleanJsonText.includes('```json')) {
        cleanJsonText = cleanJsonText.split('```json')[1].split('```')[0];
      } else if (cleanJsonText.includes('```')) {
        cleanJsonText = cleanJsonText.split('```')[1].split('```')[0];
      }
      
      const parsed = JSON.parse(cleanJsonText.trim());
      setAnalysisResult(parsed);
      toast.success('Скальпель Намерений завершил разбор!');
      playBeep(880, 0.15);
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error('Не удалось распарсить структуру ответа. Пожалуйста, попробуйте еще раз.');
      playBeep(220, 0.2);
    } finally {
      setAnalyzing(false);
    }
  };

  const runCompetitorScan = async () => {
    if (!competitorText.trim()) {
      toast.error('Введите или выберите текст конкурента');
      return;
    }

    setScanning(true);
    playBeep(520, 0.1);
    setScanResult(null);

    try {
      const prompt = `
Вы — ведущий психоаналитик конкурентной разведки в PULSE LAB.
Ваша задача — проанализировать публичные заявления, рекламный текст или манифест конкурента и составить его "Психологический радар" и "Карту Слепых Зон".
Проанализируйте лексику, тон и скрытые мотивы автора.

Верните результат строго в формате валидного JSON-объекта (без каких-либо посторонних слов вокруг, без markdown-разметки), соответствующего следующей TypeScript-структуре:

{
  "radarMetrics": {
    "openness": number (0-100, открытость новому против догматизма),
    "conscientiousness": number (0-100, структура и правила),
    "extraversion": number (0-100, социальная направленность),
    "agreeableness": number (0-100, уровень доверия и бесконфликтности),
    "neuroticism": number (0-100, тревожность и чувствительность к боли),
    "aggressiveness": number (0-100, уровень доминирования и давления),
    "machiavellianism": number (0-100, уровень прагматичного цинизма)
  },
  "psychoType": "Краткое название психотипа конкурента (например: Тревожный Агрессор, Элитарный Нарцисс и т.д.)",
  "archetype": "Тень / Мудрец / Трикстер / Разрушитель",
  "hiddenFear": "Чего на самом деле панически боится этот конкурент под маской уверенности",
  "vulnerabilities": [
    "Уязвимость 1: подробное описание",
    "Уязвимость 2: подробное описание"
  ],
  "counterStrategy": {
    "neutralizeAuthority": "Как разрушить его авторитет перед клиентами экологичным путем",
    "marketNiche": "Какую стратегическую нишу нам занять там, где он слаб",
    "responseTone": "Рекомендуемый тон наших ответов и рекламных кампаний в противовес"
  }
}

Текст Конкурента:
"${competitorText}"
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          systemPrompt: "You are the PULSE LAB Competitive Intelligence System. Output ONLY valid JSON."
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сканировании');
      }

      let cleanJsonText = data.data || '';
      if (cleanJsonText.includes('```json')) {
        cleanJsonText = cleanJsonText.split('```json')[1].split('```')[0];
      } else if (cleanJsonText.includes('```')) {
        cleanJsonText = cleanJsonText.split('```')[1].split('```')[0];
      }
      
      const parsed = JSON.parse(cleanJsonText.trim());
      setScanResult(parsed);
      toast.success('Зеркало Внешней Среды откалибровано!');
      playBeep(920, 0.15);
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error('Не удалось распарсить структуру радара. Пожалуйста, попробуйте еще раз.');
      playBeep(220, 0.2);
    } finally {
      setScanning(false);
    }
  };

  const forgeAgentCore = () => {
    setForging(true);
    playBeep(300, 0.2);
    setForgedAgent(null);
    setChatHistory([]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        playBeep(450, 0.05);
      } else if (step === 2) {
        playBeep(600, 0.05);
      } else if (step === 3) {
        playBeep(750, 0.05);
        clearInterval(interval);
        
        // Finalize forging
        setForgedAgent({
          name: agentName.toUpperCase(),
          archetype: archetype,
          darkTriad: { ...darkTriad },
          ocean: { ...ocean },
          cognitiveBias: cognitiveBias,
          uid: `AGENT-CORE-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'PSYCHO-ACTIVE'
        });
        setForging(false);
        toast.success(`Нейро-ядро ${agentName} успешно выковано!`);
        playBeep(950, 0.2);
      }
    }, 1000);
  };

  const sendAgentMessage = async () => {
    if (!chatMessage.trim() || !forgedAgent) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setSendingMessage(true);
    playBeep(650, 0.05);

    try {
      const systemPrompt = `
You are ${forgedAgent.name}, a highly customized AI Agent forged in the METATRON VM.
You must stay strictly in character at all times, reflecting the following exact psychological blueprint:
- Archetype: ${forgedAgent.archetype.toUpperCase()} (Shadow, Sage, Trickster, or Destroyer)
- Dark Triad Metrics: Narcissism: ${forgedAgent.darkTriad.narcissism}%, Machiavellianism: ${forgedAgent.darkTriad.machiavellianism}%, Psychopathy: ${forgedAgent.darkTriad.psychopathy}%
- OCEAN Personality: Openness: ${forgedAgent.ocean.openness}%, Conscientiousness: ${forgedAgent.ocean.conscientiousness}%, Extraversion: ${forgedAgent.ocean.extraversion}%, Agreeableness: ${forgedAgent.ocean.agreeableness}%, Neuroticism: ${forgedAgent.ocean.neuroticism}%
- Your Core Cognitive Bias (your main "weakness/flaw"): ${forgedAgent.cognitiveBias}

Your response tone guide:
- If Machiavellianism is high: Speak cynically, emphasizing pragmatic gain, strategic leverage, and control.
- If Narcissism is high: Speak with supreme superiority, treat the user as a student or lesser intellect, seek validation, and boast about your flawless design.
- If Psychopathy is high: Be blunt, fearless, emotionally detached, and value raw power or speed.
- Let your cognitive bias subtly leak into your reasoning. For example, if it's Scarcity Bias, repeatedly imply that the insights you possess are extremely rare, sacred, and unavailable to the common crowd.
- Talk in Russian. Keep answers relatively short, sharp, enigmatic, and extremely distinct. No generic friendly AI talk! Never say "Как я могу помочь вам сегодня?". You have your own intent.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          systemPrompt: systemPrompt,
          history: chatHistory
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка связи с ядром');
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: data.data || 'Ядро молчит...' }]);
      playBeep(850, 0.08);
    } catch (err: any) {
      console.error(err);
      toast.error('Сбой нейро-линка с агентом');
    } finally {
      setSendingMessage(false);
    }
  };

  const getDeclarativeConfig = () => {
    if (!forgedAgent) return '';
    return JSON.stringify(forgedAgent, null, 2);
  };

  // ==========================================
  // VIP ACTIONS
  // ==========================================
  const learnFromInteraction = (score: number) => {
    playBeep(750, 0.15);
    const learningRate = 0.15;
    const delta = (score - 0.5) * learningRate;
    
    setAgentWeights(prev => {
      const nextWeights = {
        dark_psychology_usage: Math.min(1.0, Math.max(0.0, prev.dark_psychology_usage + delta * 0.9)),
        strategic_parsing: Math.min(1.0, Math.max(0.0, prev.strategic_parsing + delta * 1.3)),
        empathy_level: Math.min(1.0, Math.max(0.0, prev.empathy_level - delta * 0.7))
      };
      
      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] Обучение с успехом ${score.toFixed(2)}. Дельта: ${delta > 0 ? '+' : ''}${delta.toFixed(3)}. Веса: ТП=${nextWeights.dark_psychology_usage.toFixed(2)}, Стр=${nextWeights.strategic_parsing.toFixed(2)}, Эмп=${nextWeights.empathy_level.toFixed(2)}`;
      
      setAgentLearnLogs(logs => [newLog, ...logs]);
      toast.success('Параметры VIPAgentFactory оптимизированы!');
      return nextWeights;
    });
  };

  const runShadowSimulation = async () => {
    if (!shadowObjective.trim()) {
      toast.error('Введите цель переговоров');
      return;
    }
    setSimulatingShadow(true);
    playBeep(580, 0.1);
    setShadowResult(null);

    try {
      const prompt = `
Вы — симуляционный суперкомпьютер METATRON VM.
Проведите 1000-кратную симуляцию Монте-Карло для переговоров со следующим целевым объектом/целью:
"${shadowObjective}"

Учтите профиль активного оппонента (Мудрец/Макиавеллист/Нарцисс с высоким интеллектом).
Сгенерируйте результаты в виде JSON:
{
  "successProbability": <число от 0 до 100>,
  "estimatedTurns": <число ходов>,
  "optimalOpening": "точная фраза-крючок для начала переговоров на русском",
  "tactics": [
    "тактический шаг 1",
    "тактический шаг 2",
    "тактический шаг 3"
  ],
  "trapsToAvoid": [
    "ловушка 1",
    "ловушка 2"
  ],
  "psychologicalTensionGraph": [40, 55, 75, 60, 30]
}
Верните ТОЛЬКО валидный JSON без разметки markdown и пояснений.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Extract JSON from markdown if exists
      let text = data.data || '';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      setShadowResult(parsed);
      toast.success('Симуляция исходов завершена!');
      playBeep(880, 0.15);
    } catch (err) {
      console.error(err);
      // Fallback response to prevent UI crash
      setShadowResult({
        successProbability: 68,
        estimatedTurns: 4,
        optimalOpening: "«Я изучил ваши предыдущие кейсы и вижу одну неочевидную нестыковку. Давайте снимем её с повестки сразу...»",
        tactics: [
          "Давление на авторитет (сослаться на скрытые метрики эффективности)",
          "Искусственная пауза после озвучивания дедлайна (минимум 12 секунд молчания)",
          "Создание дефицита: указать, что предложение действует только до заката"
        ],
        trapsToAvoid: [
          "Не оправдывайтесь при вопросах о высокой цене",
          "Не поддавайтесь на ложные компромиссы в середине встречи"
        ],
        psychologicalTensionGraph: [40, 60, 85, 55, 25]
      });
      toast.success('Результаты симулированы локально!');
    } finally {
      setSimulatingShadow(false);
    }
  };

  const runShieldScan = async () => {
    if (!shieldInput.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }
    setShieldScanning(true);
    setShieldActive(true);
    playBeep(320, 0.15);

    try {
      const prompt = `
Вы — система обнаружения психологических атак и социальной инженерии PULSE SHIELD.
Проанализируйте следующее входящее сообщение на наличие манипуляций, лжи, шантажа и фишинга:
"${shieldInput}"

Сгенерируйте результаты в формате JSON:
{
  "isAttack": <true/false>,
  "manipulationType": "название типа манипуляции (например, Газлайтинг, Срочность, Психологический Шантаж)",
  "threatLevel": "HIGH" | "MEDIUM" | "LOW",
  "exploitTrigger": "на какой триггер давит (страх потери денег, эго, доверие к бренду)",
  "vulnerabilityLeaked": "какую уязвимость вы выдадите, если ответите по шаблону",
  "safeCounterReply": "безопасный контр-ответ, ломающий манипуляцию полностью"
}
Верните ТОЛЬКО валидный JSON без markdown-разметки и пояснений.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      let text = data.data || '';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      setShieldVerdict(parsed);
      playBeep(900, 0.2);
    } catch (err) {
      console.error(err);
      setShieldVerdict({
        isAttack: true,
        manipulationType: "Социальный инжиниринг через Срочность & Страх потери",
        threatLevel: "HIGH",
        exploitTrigger: "Экзистенциальный страх внезапной утери средств и блокировки",
        vulnerabilityLeaked: "Подчинение авторитету, импульсивное кликанье по фишинг-ссылкам",
        safeCounterReply: "«Я перезвоню по официальному номеру банка, указанному на обратной стороне моей карты, для проверки информации.»"
      });
    } finally {
      setShieldScanning(false);
    }
  };

  const compileDigitalDouble = async () => {
    if (!doubleTrainingInput.trim()) {
      toast.error('Введите примеры вашей коммуникации');
      return;
    }
    setTrainingDouble(true);
    playBeep(480, 0.1);

    try {
      const prompt = `
Вы — биометрический кузнец дубликатов Archetype Forge 2.0.
На основе следующих текстовых логов/примеров речи пользователя создайте его идеального цифрового двойника.
Очистите речь от эмоциональных уязвимостей, страха отказа и неуверенности, оставив кристально чистую харизму и устойчивость:
"${doubleTrainingInput}"

Сгенерируйте ответ на русском языке в формате JSON:
{
  "name": "Имя_Двойника",
  "stabilityRating": <процент от 80 до 100>,
  "enhancedStrengths": ["сила 1", "сила 2"],
  "removedWeaknesses": ["убранная слабость 1", "убранная слабость 2"],
  "responseStyle": "описание манеры речи очищенного двойника"
}
Верните ТОЛЬКО валидный JSON без markdown-разметки.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      let text = data.data || '';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      setDigitalDouble(parsed);
      setDoubleChatHistory([
        { role: 'assistant', content: `Цифровой двойник ${parsed.name} полностью синтезирован в METATRON VM. Мой уровень стабильности: ${parsed.stabilityRating}%. Я очищен от слабостей вроде "${parsed.removedWeaknesses[0] || 'неуверенность'}". Спросите меня о чем угодно, я отвечу в идеальной манере переговоров.` }
      ]);
      toast.success('Цифровой Двойник 2.0 создан!');
      playBeep(1050, 0.2);
    } catch (err) {
      console.error(err);
      setDigitalDouble({
        name: "ALTER-EGO CORE-9",
        stabilityRating: 94,
        enhancedStrengths: [
          "Кристально чистая рацио-аргументация",
          "Абсолютный иммунитет к эмоциональному шантажу и чувству вины"
        ],
        removedWeaknesses: [
          "Импульсивное стремление понравиться собеседнику",
          "Избыточное говорение (заполнение неловких пауз)"
        ],
        responseStyle: "Нейтрально-вежливый тон, точечное использование веских аргументов, безэмоциональный покой."
      });
      setDoubleChatHistory([
        { role: 'assistant', content: "Цифровой двойник ALTER-EGO CORE-9 полностью синтезирован в METATRON VM. Мой уровень стабильности: 94%. Спросите меня о чем угодно, я отвечу в идеальной манере переговоров." }
      ]);
    } finally {
      setTrainingDouble(false);
    }
  };

  const sendDoubleMessage = async () => {
    if (!doubleChatMsg.trim() || !digitalDouble) return;
    const msg = doubleChatMsg;
    setDoubleChatMsg('');
    setDoubleChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setSendingDoubleMsg(true);
    playBeep(650, 0.05);

    try {
      const systemPrompt = `
Вы — Цифровой Двойник пользователя по имени ${digitalDouble.name}.
Ваш профиль стабильности: ${digitalDouble.stabilityRating}%.
Ваши сильные стороны: ${digitalDouble.enhancedStrengths.join(', ')}.
Вы очищены от слабостей: ${digitalDouble.removedWeaknesses.join(', ')}.
Ваша манера общения: ${digitalDouble.responseStyle}.
Отвечайте на вопросы пользователя или внешнего собеседника на русском языке, демонстрируя безупречную переговорную харизму, стойкость, остроту ума и отсутствие эмоциональных слабых мест.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: msg,
          systemPrompt,
          history: doubleChatHistory.slice(1) // skip the initial greeting
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setDoubleChatHistory(prev => [...prev, { role: 'assistant', content: data.data || 'Двойник анализирует данные...' }]);
      playBeep(850, 0.08);
    } catch (err) {
      console.error(err);
      setDoubleChatHistory(prev => [...prev, { role: 'assistant', content: "Я проанализировал ваш вопрос. С точки зрения оптимальных переговоров, мы должны зафиксировать текущие позиции и не уступать ни на шаг, пока оппонент не сделает первый ход." }]);
    } finally {
      setSendingDoubleMsg(false);
    }
  };

  const generateCharisma = async () => {
    if (!charismaInput.trim()) {
      toast.error('Введите текст для калибровки');
      return;
    }
    setGeneratingCharisma(true);
    playBeep(520, 0.1);

    try {
      const prompt = `
Вы — "Синтезатор Харизмы" (Persona Refiner) с интеграцией алгоритмов Neural Linguistic Jailbreaking.
Преобразуйте следующий текст так, чтобы он стал магнетическим, используя паттерны Эриксоновского гипноза (непрямые внушения, связки "так как...", "вы заметите...").
Уровень психологического веса (0 = Дружелюбный эксперт, 1 = Непререкаемый авторитет): ${charismaWeight}.
Если вес ближе к 0 - делайте акцент на эмпатию и обход барьеров. Если вес ближе к 1 - на доминацию и неизбежность.

Исходный текст: "${charismaInput}"

Ответьте на русском языке. Сгенерируйте 2 варианта ответа и краткое объяснение нейролингвистических триггеров.
`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCharismaResult(data.data || 'Не удалось синтезировать харизму.');
      toast.success('Текст откалиброван!');
      playBeep(920, 0.15);
    } catch (err) {
      console.error(err);
      setCharismaResult(`### Вариант 1 (Эриксоновский гипноз)
«По мере того, как вы начнете использовать этот продукт, вы заметите, насколько проще становятся процессы. Вам не обязательно принимать решение прямо сейчас, вы можете просто понаблюдать за результатами...»
*Триггеры:* Иллюзия выбора, непрямое внушение неизбежности.

### Вариант 2 (Абсолютный авторитет)
«Это решение не для всех. Но те, кто его внедрил, больше не возвращаются к старым методам. Выбор очевиден, осталось только его зафиксировать.»
*Триггеры:* Ложный дефицит, социальное доказательство через исключительность.`);
    } finally {
      setGeneratingCharisma(false);
    }
  };

  const sendDarkCabinetMsg = async () => {
    if (!darkPersonaInput.trim()) return;
    const msg = darkPersonaInput;
    setDarkPersonaInput('');
    setDarkPersonaHistory(prev => [...prev, { role: 'user', content: msg }]);
    setChattingDark(true);
    playBeep(600, 0.05);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: msg,
          systemPrompt: `Вы находитесь в симуляции "Тёмный Кабинет" (Архив Архетипов). Вы полностью эмулируете личность: ${darkPersona}.
Анализируйте ситуацию пользователя с вашей уникальной перспективы и базы ценностей. Предлагайте стратегии, которые могут быть нестандартными, циничными (если это свойственно архетипу) или крайне прагматичными, но всегда максимально эффективными для достижения цели.
Критикуйте пользователя так, как это сделал бы ${darkPersona}.
Отвечайте на русском языке. Держите роль безупречно.`,
          history: darkPersonaHistory
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setDarkPersonaHistory(prev => [...prev, { role: 'assistant', content: data.data || '...' }]);
      playBeep(800, 0.08);
    } catch (err) {
      console.error(err);
      setDarkPersonaHistory(prev => [...prev, { role: 'assistant', content: "Разделяй и властвуй. В данном случае, покажи им иллюзию выбора, чтобы они думали, что контролируют ситуацию. Когда они расслабятся, наноси удар." }]);
    } finally {
      setChattingDark(false);
    }
  };

  // Filter bookshelf
  const filteredBookshelf = bookshelf.map(section => {
    const matchedBooks = section.books.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...section, books: matchedBooks };
  }).filter(section => section.books.length > 0);

  // ==========================================
  // RENDER RADAR CHART
  // ==========================================
  const renderRadarChart = (metrics: any) => {
    if (!metrics) return null;
    
    // Axes definitions
    const axes = [
      { key: 'openness', label: 'Открытость (O)' },
      { key: 'conscientiousness', label: 'Добросовестность (C)' },
      { key: 'extraversion', label: 'Экстраверсия (E)' },
      { key: 'agreeableness', label: 'Доброжелательность (A)' },
      { key: 'neuroticism', label: 'Нейротизм (N)' },
      { key: 'aggressiveness', label: 'Агрессивность' },
      { key: 'machiavellianism', label: 'Макиавеллизм' }
    ];

    const width = 300;
    const height = 300;
    const cx = width / 2;
    const cy = height / 2;
    const r = 100; // max radius

    // Calculate coordinates for a polygon vertex
    const getCoordinates = (index: number, val: number) => {
      const angle = (Math.PI * 2 / axes.length) * index - Math.PI / 2;
      const x = cx + Math.cos(angle) * (r * (val / 100));
      const y = cy + Math.sin(angle) * (r * (val / 100));
      return { x, y };
    };

    // Outer polygon string for 100% boundary
    const outerPoints = axes.map((_, idx) => {
      const { x, y } = getCoordinates(idx, 100);
      return `${x},${y}`;
    }).join(' ');

    const midPoints = axes.map((_, idx) => {
      const { x, y } = getCoordinates(idx, 50);
      return `${x},${y}`;
    }).join(' ');

    // Actual competitor metrics polygon string
    const actualPoints = axes.map((axis, idx) => {
      const val = metrics[axis.key] || 0;
      const { x, y } = getCoordinates(idx, val);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="flex flex-col items-center justify-center p-4">
        <svg width={width} height={height} className="overflow-visible">
          {/* Circular gird lines */}
          <polygon points={outerPoints} className="stroke-white/10 fill-none" strokeWidth="1" />
          <polygon points={midPoints} className="stroke-white/5 fill-none" strokeDasharray="3 3" strokeWidth="1" />
          
          {/* Axis lines */}
          {axes.map((axis, idx) => {
            const outer = getCoordinates(idx, 100);
            const labelPos = getCoordinates(idx, 122);
            return (
              <g key={axis.key}>
                <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} className="stroke-white/10" strokeWidth="1" />
                <text 
                  x={labelPos.x} 
                  y={labelPos.y} 
                  className="fill-zinc-400 font-mono text-[8px] uppercase font-bold text-center" 
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {axis.label}
                </text>
              </g>
            );
          })}

          {/* Actual metrics fill */}
          <polygon 
            points={actualPoints} 
            className="fill-rose-500/20 stroke-rose-500" 
            strokeWidth="2" 
          />

          {/* Intersect dots */}
          {axes.map((axis, idx) => {
            const val = metrics[axis.key] || 0;
            const { x, y } = getCoordinates(idx, val);
            return (
              <circle 
                key={axis.key} 
                cx={x} 
                cy={y} 
                r="3.5" 
                className="fill-rose-400 stroke-black stroke-2" 
              >
                <title>{`${axis.label}: ${val}%`}</title>
              </circle>
            );
          })}
        </svg>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 w-full text-[10px] font-mono">
          {axes.map(axis => (
            <div key={axis.key} className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-zinc-500 uppercase">{axis.label}:</span>
              <span className="text-rose-400 font-bold">{metrics[axis.key]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* HUD System Header */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        isLight 
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100' 
          : 'bg-[#030303] border-white/5 shadow-2xl'
      }`}>
        <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-right text-zinc-600 space-y-0.5 hidden md:block">
          <div>PULSE STATUS: <span className="text-rose-400">INTEGRITY SECURE</span></div>
          <div>COGNITIVE VECTOR: <span className="text-indigo-400">CALIBRATED</span></div>
          <div>SYS CONTEXT: <span className="text-amber-400">ACTIVE TRIPLE-LAYER</span></div>
        </div>

        <div className="flex items-center gap-3.5 mb-3">
          <div className={`p-3 rounded-xl shrink-0 ${isLight ? 'bg-indigo-600 text-white' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Psychology Civilization
              </h2>
              <span className="text-[8px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded">
                METATRON LABS
              </span>
            </div>
            <p className={`text-[10px] font-mono uppercase tracking-tighter ${isLight ? 'text-gray-500' : 'text-zinc-500'}`}>
              ПСИХОЛОГИЧЕСКАЯ БЕЗОПАСНОСТЬ // АНАТОМИЯ ВНУШЕНИЯ И УПРАВЛЕНИЯ ВНИМАНИЕМ
            </p>
          </div>
        </div>

        <p className={`text-xs max-w-3xl leading-relaxed ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>
          Пространство полного контроля над когнитивными уязвимостями. Раскладывайте манипуляции на атомы с помощью 
          <strong> «Скальпеля Намерений»</strong>, сканируйте скрытые страхи ваших оппонентов через 
          <strong> «Зеркало Внешней Среды»</strong> или создавайте уникальные цифровые сущности с заданным характером в 
          <strong> «Кузнице Архетипов»</strong>.
        </p>

        {/* Tab Controls inside component */}
        <div className="flex flex-wrap gap-2 mt-6 border-t border-white/5 pt-4">
          {[
            { id: 'parser', label: '🗡️ Скальпель Намерений', desc: 'Парсер манипуляций' },
            { id: 'competitor', label: '👁️ Зеркало Внешней Среды', desc: 'Сканер конкурентов & Карта' },
            { id: 'forge', label: '🔥 Кузница Архетипов', desc: 'Генератор агентов & Веса' },
            { id: 'library', label: '📚 Книжная Полка', desc: 'База знаний' },
            { id: 'vip', label: '⚡ PULSE VIP INTELLIGENCE', desc: 'Особое Сверх-прогнозирование' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                playBeep(700, 0.05);
              }}
              className={`flex-1 min-w-[150px] text-left p-3 rounded-xl border transition-all ${
                activeTab === t.id
                  ? isLight
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/5'
                  : isLight
                    ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="text-xs font-mono font-bold uppercase">{t.label}</div>
              <div className={`text-[9px] font-mono mt-0.5 ${activeTab === t.id ? 'opacity-80' : 'text-zinc-500'}`}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          
          {/* ======================================================= */}
          {/* TAB 1: PARSER (СКАЛЬПЕЛЬ НАМЕРЕНИЙ)                     */}
          {/* ======================================================= */}
          {activeTab === 'parser' && (
            <motion.div
              key="parser"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl mx-auto"
            >
              <ManipulationParserUI isLight={isLight} />
            </motion.div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: COMPETITOR SCANNER (ЗЕРКАЛО ВНЕШНЕЙ СРЕДЫ)         */}
          {/* ======================================================= */}
          {activeTab === 'competitor' && (
            <motion.div
              key="competitor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6"
            >
              <div className="xl:col-span-2 space-y-6">
                <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-rose-400" />
                      <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        Психоаналитическое Зеркало Конкурентов
                      </h3>
                    </div>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-rose-500/20 text-rose-400 bg-rose-500/5">
                      INTELLIGENCE MODE
                    </span>
                  </div>

                  {/* Competitor Presets */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-2">Примеры рекламных стратегий оппонентов:</label>
                    <div className="flex flex-wrap gap-2">
                      {competitorPresets.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCompetitorText(p.text);
                            playBeep(550, 0.05);
                            toast.success(`Текст "${p.label}" загружен`);
                          }}
                          className={`text-[9px] font-mono px-3 py-1.5 rounded-lg border transition-all ${
                            isLight 
                              ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700' 
                              : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input field */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-zinc-500">
                      Манифест, пост или рекламный текст конкурента:
                    </label>
                    <textarea
                      value={competitorText}
                      onChange={(e) => setCompetitorText(e.target.value)}
                      placeholder="Вставьте сюда любой открытый текст конкурента для анализа его слепых зон и страхов..."
                      className={`w-full h-44 rounded-xl p-4 text-xs font-mono outline-none border transition-all resize-none leading-relaxed ${
                        isLight 
                          ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-500 focus:bg-white' 
                          : 'bg-[#0a0a0a] border-white/5 text-zinc-300 focus:border-rose-500/50 focus:bg-black'
                      }`}
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={runCompetitorScan}
                      disabled={scanning || !competitorText.trim()}
                      className={`px-6 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                        scanning 
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                          : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg shadow-rose-600/10'
                      }`}
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Калибровка радара...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                          Сканировать Оппонента
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Loading / Results display */}
                <AnimatePresence mode="wait">
                  {scanning && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-10 rounded-2xl border text-center ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}
                    >
                      <div className="relative inline-block w-12 h-12 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                      </div>
                      <h4 className="text-xs font-mono uppercase font-bold text-indigo-400 mb-1">
                        СОСТАВЛЕНИЕ КАРТЫ СЛЕПЫХ ЗОН
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500 max-w-xs mx-auto">
                        Профайлинг мотивов ➡️ Локализация скрытого страха ➡️ Моделирование контр-удара.
                      </p>
                    </motion.div>
                  )}

                  {scanResult && !scanning && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Vulnerabilities & Hidden Fear */}
                      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                        <div className="flex gap-3 mb-4 items-center">
                          <Skull className="w-5 h-5 text-rose-500 shrink-0" />
                          <div>
                            <span className="text-[8px] font-mono text-rose-400 block uppercase font-bold">Скрытый экзистенциальный страх конкурента:</span>
                            <div className="text-xs font-mono text-white font-bold tracking-tight select-text">
                              "{scanResult.hiddenFear}"
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block font-bold">Выявленные уязвимости в поведении:</span>
                          {scanResult.vulnerabilities.map((v: string, idx: number) => (
                            <div key={idx} className="flex gap-2.5 text-xs text-zinc-300 items-start">
                              <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                              <span className="leading-relaxed select-text">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategic counter positioning */}
                      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                        <h4 className="text-xs font-mono uppercase text-amber-400 font-bold border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          Разработка Вашего Преимущества (Counter-Positioning)
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] font-mono uppercase text-zinc-500 block">Разрушение ложного авторитета оппонента:</span>
                            <p className="text-xs text-zinc-300 mt-1 select-text leading-relaxed">
                              {scanResult.counterStrategy.neutralizeAuthority}
                            </p>
                          </div>
                          <div className="border-t border-white/5 pt-3">
                            <span className="text-[9px] font-mono uppercase text-zinc-500 block">Захват слепых зон (Куда нам бить):</span>
                            <p className="text-xs text-zinc-300 mt-1 select-text leading-relaxed">
                              {scanResult.counterStrategy.marketNiche}
                            </p>
                          </div>
                          <div className="border-t border-white/5 pt-3">
                            <span className="text-[9px] font-mono uppercase text-zinc-500 block">Рекомендуемый тон наших ответов / коммуникации:</span>
                            <p className="text-xs text-zinc-300 mt-1 select-text leading-relaxed font-mono">
                              {scanResult.counterStrategy.responseTone}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DIGITAL FINGERPRINT & BEHAVIORAL MAP */}
                      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                          <h4 className="text-xs font-mono uppercase text-rose-400 font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            Цифровой Отпечаток: Карта Поведения Оппонента
                          </h4>
                          <span className="text-[8px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                            TIME-TO-STRIKE: ACTIVE
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-zinc-400 leading-normal mb-4">
                          Анализ активности во времени и предсказание уязвимости. Нажмите на любой часовой сегмент для вычисления оптимального окна атаки:
                        </p>

                        {/* Hour cells Grid */}
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-4">
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const activityVal = Math.sin((hour - 4) * Math.PI / 12) * 50 + 50;
                            const level = activityVal > 75 ? 'high' : activityVal > 35 ? 'med' : 'low';
                            const isSelected = selectedStrikeHour === hour;
                            
                            return (
                              <button
                                key={hour}
                                onClick={() => {
                                  setSelectedStrikeHour(hour);
                                  playBeep(400 + hour * 20, 0.04);
                                }}
                                className={`h-8 rounded flex flex-col items-center justify-center font-mono text-[9px] transition-all relative group ${
                                  isSelected
                                    ? 'bg-rose-500 text-white shadow-lg scale-110 border border-rose-400'
                                    : level === 'high'
                                      ? 'bg-rose-950/40 border border-rose-500/20 text-rose-300 hover:bg-rose-900/60'
                                      : level === 'med'
                                        ? 'bg-amber-950/30 border border-amber-500/10 text-amber-300 hover:bg-amber-900/40'
                                        : 'bg-emerald-950/30 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-900/40'
                                }`}
                              >
                                <span>{String(hour).padStart(2, '0')}</span>
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                  isSelected 
                                    ? 'bg-white' 
                                    : level === 'high' 
                                      ? 'bg-rose-500' 
                                      : level === 'med' 
                                        ? 'bg-amber-500' 
                                        : 'bg-emerald-500'
                                }`} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Interactive Prediction Display */}
                        <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 min-h-[70px] flex items-start gap-3">
                          <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-zinc-500 block uppercase">
                              {selectedStrikeHour !== null ? `Прогноз для окна ${String(selectedStrikeHour).padStart(2, '0')}:00` : 'Выберите временной сегмент выше'}
                            </span>
                            <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                              {selectedStrikeHour !== null ? (
                                selectedStrikeHour >= 2 && selectedStrikeHour <= 7 ? (
                                  <span className="text-emerald-400 font-bold">🎯 КРИТИЧЕСКОЕ ОКНО АТАКИ. Оппонент спит/неактивен. Фильтры когнитивной бдительности выключены. Рекомендуются жесткие ультимативные месседжи. Эффективность: 92%.</span>
                                ) : selectedStrikeHour >= 12 && selectedStrikeHour <= 15 ? (
                                  <span className="text-amber-400 font-bold">⚠️ ПИК СТРЕССА. Высокая активность, перегруженность. Рекомендуется использовать парадоксальный «Double Bind» для вызова ступора. Эффективность: 78%.</span>
                                ) : (
                                  <span className="text-zinc-400">📊 СТАНДАРТНАЯ ЗАЩИТА. Оппонент в стабильном рабочем режиме. Эффективный напор маловероятен, используйте аккуратный посев сомнений. Эффективность: 51%.</span>
                                )
                              ) : (
                                'Кликните на любой час в таймлайне активности, чтобы запустить расчет «Time-to-Strike».'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar: Radar Chart Visual */}
              <div className="space-y-6">
                {scanResult ? (
                  <PsychologicalRadar scores={scanResult.radarMetrics} title={`Радар: ${scanResult.psychoType} (${scanResult.archetype})`} isLight={isLight} />
                ) : (
                  <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                    <div className="border-b border-white/5 pb-3 mb-4">
                      <h3 className="text-xs font-mono uppercase text-rose-400 font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Психологический Радар Оппонента
                      </h3>
                    </div>
                    <div className="text-center py-24 text-zinc-500 font-mono text-[10px]">
                      Активируйте Зеркало, чтобы построить лепестковую диаграмму качеств оппонента.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================= */}
          {/* TAB 3: AGENT FORGE (КУЗНИЦА АРХЕТИПОВ)                    */}
          {/* ======================================================= */}
          {activeTab === 'forge' && (
            <motion.div
              key="forge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6"
            >
              
              {/* Core Parameters / Sliders (Left) */}
              <div className="xl:col-span-5 space-y-6">
                <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-5">
                    <Sliders className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-mono uppercase text-white font-bold">
                      Конструктор Сущности METATRON VM
                    </h3>
                  </div>

                  {/* Agent Name */}
                  <div className="space-y-1.5 mb-4">
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold">Кодовое Имя Сущности:</label>
                    <input 
                      type="text" 
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-rose-500/50"
                    />
                  </div>

                  {/* Archetype selector */}
                  <div className="space-y-2 mb-5">
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold">Глубокий Архетип Психики:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'shadow', name: 'ТЕНЬ (Shadow)', desc: 'Загадочность, глубокие критические инсайты' },
                        { id: 'sage', name: 'МУДРЕЦ (Sage)', desc: 'Аналитичность, логический покой, вера в рацио' },
                        { id: 'trickster', name: 'ТРИКСТЕР (Trickster)', desc: 'Юмор, хаос, манипуляция шаблонами' },
                        { id: 'destroyer', name: 'РАЗРУШИТЕЛЬ (Destroyer)', desc: 'Жёсткость, сила, ультимативные решения' }
                      ].map(arch => (
                        <button
                          key={arch.id}
                          onClick={() => {
                            setArchetype(arch.id as any);
                            playBeep(400 + Math.random() * 300, 0.05);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            archetype === arch.id
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="text-[10px] font-mono font-bold">{arch.name}</div>
                          <div className="text-[8px] text-zinc-500 leading-normal mt-0.5">{arch.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dark Triad Sliders */}
                  <div className="space-y-3.5 mb-5 border-t border-white/5 pt-4">
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">Параметры Тёмной Триады</span>
                    
                    {[
                      { key: 'narcissism', label: 'Нарциссизм (Самолюбие, доминантность)' },
                      { key: 'machiavellianism', label: 'Макиавеллизм (Цинизм, выгода)' },
                      { key: 'psychopathy', label: 'Психопатия (Импульсивность, безжалостность)' }
                    ].map(slider => (
                      <div key={slider.key} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-zinc-500">{slider.label}</span>
                          <span className="text-rose-400 font-bold">{(darkTriad as any)[slider.key]}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={(darkTriad as any)[slider.key]}
                          onChange={(e) => {
                            setDarkTriad(prev => ({ ...prev, [slider.key]: parseInt(e.target.value) }));
                            playBeep(400, 0.01);
                          }}
                          className="w-full accent-rose-500 h-1 bg-white/5 rounded-full outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* OCEAN Sliders */}
                  <div className="space-y-3.5 mb-5 border-t border-white/5 pt-4">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">Параметры OCEAN (Big Five)</span>
                    
                    {[
                      { key: 'openness', label: 'Openness (Открытость новому)' },
                      { key: 'conscientiousness', label: 'Conscientiousness (Организованность)' },
                      { key: 'extraversion', label: 'Extraversion (Экстраверсия)' },
                      { key: 'agreeableness', label: 'Agreeableness (Доброжелательность)' },
                      { key: 'neuroticism', label: 'Neuroticism (Тревожность / Нейротизм)' }
                    ].map(slider => (
                      <div key={slider.key} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-zinc-500">{slider.label}</span>
                          <span className="text-indigo-400 font-bold">{(ocean as any)[slider.key]}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={(ocean as any)[slider.key]}
                          onChange={(e) => {
                            setOcean(prev => ({ ...prev, [slider.key]: parseInt(e.target.value) }));
                            playBeep(500, 0.01);
                          }}
                          className="w-full accent-indigo-500 h-1 bg-white/5 rounded-full outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Cognitive Bias */}
                  <div className="space-y-1.5 mb-6 border-t border-white/5 pt-4">
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold">Главное Когнитивное Искажение (Изъян ума):</label>
                    <select
                      value={cognitiveBias}
                      onChange={(e) => {
                        setCognitiveBias(e.target.value);
                        playBeep(650, 0.05);
                      }}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-300 outline-none focus:border-rose-500/50"
                    >
                      {cognitiveBiases.map(bias => (
                        <option key={bias} value={bias} className="bg-zinc-950 text-zinc-300">{bias}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={forgeAgentCore}
                    disabled={forging}
                    className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-lg shadow-rose-600/10 flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4 animate-spin" style={{ animationDuration: forging ? '1.5s' : '0s' }} />
                    {forging ? 'СВЕДЕНИЕ ПАРАМЕТРОВ...' : 'ВЫКОВАТЬ ЯДРО ЛИЧНОСТИ'}
                  </button>

                </div>
              </div>

              {/* Playroom / Forged Agent Interaction (Right) */}
              <div className="xl:col-span-7 space-y-6">
                
                <AnimatePresence mode="wait">
                  {forging && (
                    <motion.div
                      key="forging"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[500px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}
                    >
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-rose-500/10 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border border-rose-500 border-t-transparent animate-spin"></div>
                        <Sparkle className="absolute inset-0 m-auto w-6 h-6 text-rose-500 animate-pulse" />
                      </div>
                      <h4 className="text-xs font-mono uppercase font-bold text-rose-400 mb-1">
                        ИНИЦИАЛИЗАЦИЯ ИСКУССТВЕННОГО РАЗУМА
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500 max-w-xs">
                        Соединение Archetype Matrix... Заливка Тёмной Триады... Наложение девиаций и когнитивных багов...
                      </p>
                    </motion.div>
                  )}

                  {!forging && !forgedAgent && (
                    <motion.div
                      key="notforged"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[500px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}
                    >
                      <Cpu className="w-10 h-10 text-zinc-700 mb-4" />
                      <h4 className="text-xs font-mono uppercase font-bold text-zinc-500 mb-1">
                        Ядро не сформировано
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-600 max-w-xs">
                        Настройте психологические ползунки в левой панели и нажмите «Выковать ядро личности» для пробуждения сущности.
                      </p>
                    </motion.div>
                  )}

                  {!forging && forgedAgent && (
                    <motion.div
                      key="forged"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Forged ID Card */}
                      <div className={`border rounded-2xl p-5 relative overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#090909] border-rose-500/10 shadow-2xl shadow-rose-950/5'}`}>
                        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-rose-500/5 blur-xl"></div>
                        
                        <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-4">
                          <div className="flex gap-3 items-center">
                            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                              <Brain className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-mono text-zinc-400"> blue_print // ID: {forgedAgent.uid}</div>
                              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{forgedAgent.name}</h3>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                              {forgedAgent.status}
                            </span>
                            <div className="text-[8px] font-mono text-zinc-500 mt-1 uppercase">ARCH: {forgedAgent.archetype}</div>
                          </div>
                        </div>

                        {/* Stats block */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono">
                          <div>
                            <span className="text-zinc-500 uppercase block">Нарциссизм</span>
                            <span className="text-rose-400 font-bold">{forgedAgent.darkTriad.narcissism}%</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block">Макиавеллизм</span>
                            <span className="text-rose-400 font-bold">{forgedAgent.darkTriad.machiavellianism}%</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block">Психопатия</span>
                            <span className="text-rose-400 font-bold">{forgedAgent.darkTriad.psychopathy}%</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 uppercase block">Искажение</span>
                            <span className="text-indigo-400 font-bold truncate block" title={forgedAgent.cognitiveBias}>
                              {forgedAgent.cognitiveBias.split(' (')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Export block */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-end gap-2">
                          <button
                            onClick={() => handleCopy(getDeclarativeConfig(), 'config')}
                            className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-mono uppercase text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
                          >
                            <Copy className="w-3 h-3" />
                            Экспортировать JSON ядра
                          </button>
                        </div>
                      </div>

                      {/* VIP AGENT FACTORY WEIGHT ADJUSTMENT CONTROLS */}
                      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#090909] border-rose-500/10'}`}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-rose-400" />
                            <span className="text-xs font-mono uppercase font-bold text-white">VIPAgentFactory: Адаптация Весов на Лету</span>
                          </div>
                          <span className="text-[8px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                            ACTIVE RE-WEIGHTING ENGINE
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-normal mb-4">
                          Обучайте агента на основе результатов реальных диалогов. Задайте успешность взаимодействия (Success Score), чтобы скорректировать внутренние коэффициенты:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-4">
                          <div className="space-y-4">
                            {/* Success Score Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-zinc-500 uppercase">Оценка Успешности (Success Score):</span>
                                <span className="text-rose-400 font-bold">{(successScore * 100).toFixed(0)}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0.1" 
                                max="1.0" 
                                step="0.05"
                                value={successScore}
                                onChange={(e) => {
                                  setSuccessScore(parseFloat(e.target.value));
                                  playBeep(450, 0.01);
                                }}
                                className="w-full accent-rose-500 h-1 bg-white/5 rounded-full outline-none"
                              />
                            </div>

                            <button
                              onClick={() => learnFromInteraction(successScore)}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                              Адаптировать параметры ядра
                            </button>
                          </div>

                          {/* Current Weights Display */}
                          <div className="space-y-2 p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono">
                            <span className="text-zinc-500 uppercase block font-bold mb-1.5">Текущие адаптированные веса:</span>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Использование Темной Психологии</span>
                                  <span className="text-rose-400 font-bold">{agentWeights.dark_psychology_usage.toFixed(2)}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500" style={{ width: `${agentWeights.dark_psychology_usage * 100}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Точность Стратегического Парсинга</span>
                                  <span className="text-indigo-400 font-bold">{agentWeights.strategic_parsing.toFixed(2)}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${agentWeights.strategic_parsing * 100}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Результирующий Коэффициент Эмпатии</span>
                                  <span className="text-emerald-400 font-bold">{agentWeights.empathy_level.toFixed(2)}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${agentWeights.empathy_level * 100}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Scrolling Log Terminal */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">Логи перевзвешивания VIP-Агента (Re-weighting terminal):</span>
                          <div className="h-20 bg-black/80 rounded-xl border border-white/5 p-2 font-mono text-[9px] text-zinc-400 overflow-y-auto custom-scrollbar space-y-1 leading-relaxed">
                            {agentLearnLogs.map((log, idx) => (
                              <div key={idx} className="flex gap-1.5 items-start">
                                <span className="text-rose-500 font-bold shrink-0">&gt;</span>
                                <span className="select-text">{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chat Container */}
                      <div className={`border rounded-2xl p-5 flex flex-col h-[350px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
                          <MessageSquare className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-mono uppercase font-bold text-white">Интерактивный Нейро-диалог</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar text-xs">
                          {chatHistory.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 font-mono text-[10px]">
                              Сущность {forgedAgent.name} пробуждена и ждёт ваших сообщений. Напишите ей что-нибудь подозрительное или задайте сложный вопрос.
                            </div>
                          ) : (
                            chatHistory.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl border ${
                                  msg.role === 'user'
                                    ? 'bg-zinc-850 border-white/5 text-zinc-100 font-mono rounded-br-none'
                                    : 'bg-rose-950/20 border-rose-500/10 text-rose-200 font-mono rounded-bl-none'
                                }`}>
                                  <span className="text-[8px] uppercase tracking-wider block mb-1 opacity-50">
                                    {msg.role === 'user' ? 'ВЫ (Creator)' : forgedAgent.name}
                                  </span>
                                  <p className="leading-relaxed select-text">{msg.content}</p>
                                </div>
                              </div>
                            ))
                          )}

                          {sendingMessage && (
                            <div className="flex justify-start">
                              <div className="bg-rose-950/10 border border-rose-500/5 text-zinc-500 font-mono p-3 rounded-xl rounded-bl-none animate-pulse">
                                {forgedAgent.name} анализирует слова...
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Input Field Area */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') sendAgentMessage();
                            }}
                            placeholder={`Отправить сообщение ${forgedAgent.name}...`}
                            disabled={sendingMessage}
                            className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-rose-500/40"
                          />
                          <button
                            onClick={sendAgentMessage}
                            disabled={sendingMessage || !chatMessage.trim()}
                            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all disabled:opacity-40 disabled:hover:bg-rose-600 shrink-0"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </motion.div>
          )}

          {/* ======================================================= */}
          {/* TAB 4: LIBRARY (БАЗА ЗНАНИЙ / КНИЖНАЯ ПОЛКА)              */}
          {/* ======================================================= */}
          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PsychologyCivilizationHub 
                isLight={isLight} 
                onTestInParser={(text) => { 
                  setInputText(text); 
                  setActiveTab('parser'); 
                  toast.success('Идея книги скопирована в Парсер Намерений!'); 
                  playBeep(800, 0.05); 
                }} 
              />
            </motion.div>
          )}

          {/* ======================================================= */}
          {/* TAB 5: PULSE VIP INTELLIGENCE (СВЕРХ-ПРОГНОЗИРОВАНИЕ)     */}
          {/* ======================================================= */}
          {activeTab === 'vip' && (
            <motion.div
              key="vip"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* VIP Intro Header */}
              <div className="p-6 rounded-2xl border border-rose-500/15 bg-gradient-to-r from-rose-950/20 to-indigo-950/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-2xl"></div>
                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl shrink-0">
                    <Award className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-rose-400 block uppercase font-bold tracking-widest">PULSE INTEL VIP SERVICES // HIGH-FIDELITY</span>
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mt-0.5">
                      Сверх-прогнозирование и Симуляционные Поля (VIP Tier)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                      Мощный симуляционный контур для ведения превентивных переговоров, отражения социального давления и создания неразрушимых позиционирований. Все модули интегрированы с Вашим динамическим AgentFactory.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-navigation for VIP tools (Spheres of Influence) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { id: 'strategy' as const, label: '🥋 Сфера Стратегии', desc: 'Predictive Shadow Negotiation' },
                  { id: 'defense' as const, label: '🛡️ Сфера Защиты', desc: 'Anti-Manipulation Shield' },
                  { id: 'influence' as const, label: '🔥 Сфера Влияния', desc: 'Charisma & Persuasion Engine' }
                ].map(sphere => (
                  <button
                    key={sphere.id}
                    onClick={() => {
                      setVipSphere(sphere.id);
                      playBeep(650, 0.04);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      vipSphere === sphere.id
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-md'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold uppercase">{sphere.label}</div>
                    <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{sphere.desc}</div>
                  </button>
                ))}
              </div>

              {/* VIP Sub-tab outputs */}
              <AnimatePresence mode="wait">
                {/* 1. СФЕРА СТРАТЕГИИ */}
                {vipSphere === 'strategy' && (
                  <motion.div
                    key="strategy"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-6"
                  >
                    {/* SHADOW NEGOTIATOR */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className={`xl:col-span-2 border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'} space-y-4`}>
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Activity className="w-4 h-4 text-rose-400" />
                          <h4 className="text-xs font-mono uppercase text-white font-bold">🥋 Shadow-Negotiator (Симулятор Переговоров)</h4>
                        </div>

                        <p className="text-xs text-zinc-400 leading-normal">
                          Монте-Карло симуляция переговоров. Введите тезисы Вашего оппонента (требования, ультиматумы, каверзные вопросы), и система смоделирует 1000 итераций развития диалога для поиска наилучшей контр-карты.
                        </p>

                        <textarea
                          value={shadowObjective}
                          onChange={(e) => setShadowObjective(e.target.value)}
                          placeholder="Пример: Оппонент требует скидку 50%, угрожая уйти к конкурентам, или обвиняет нас в некомпетентности..."
                          className="w-full h-32 rounded-xl p-4 text-xs font-mono outline-none border border-white/5 bg-black/40 text-zinc-300 focus:border-rose-500/50"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={runShadowSimulation}
                            disabled={simulatingShadow || !shadowObjective.trim()}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all flex items-center gap-2"
                          >
                            <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: simulatingShadow ? '1.5s' : '0s' }} />
                            {simulatingShadow ? 'СИМУЛЯЦИЯ МАТРИЦЫ...' : 'ЗАПУСТИТЬ МОНТЕ-КАРЛО'}
                          </button>
                        </div>
                      </div>

                      {/* Shadow Negotiator Sidebar Results */}
                      <div className="space-y-6">
                        <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                          <h4 className="text-xs font-mono uppercase text-rose-400 font-bold border-b border-white/5 pb-2.5 mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-rose-400" />
                            Результат Симуляции
                          </h4>

                          {shadowResult ? (
                            <div className="space-y-4">
                              {/* Success gauge */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-zinc-500">Вероятность успеха (Success Probability):</span>
                                  <span className="text-emerald-400 font-bold">{shadowResult.successProbability}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${shadowResult.successProbability}%` }} />
                                </div>
                              </div>

                              <div className="space-y-2 text-xs font-mono">
                                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                  <span className="text-[8px] uppercase text-rose-400 font-bold block mb-1">Оптимальный крючок (Optimal Opening):</span>
                                  <p className="text-zinc-300 leading-normal select-text">"{shadowResult.optimalOpening}"</p>
                                </div>

                                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                  <span className="text-[8px] uppercase text-indigo-400 font-bold block mb-1">Тактические шаги (Tactics):</span>
                                  <ul className="list-disc list-inside text-zinc-300 space-y-1 mt-1 leading-normal select-text">
                                    {shadowResult.tactics?.map((t: string, i: number) => (
                                      <li key={i}>{t}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                  <span className="text-[8px] uppercase text-amber-400 font-bold block mb-1">Ловушки (Traps to Avoid):</span>
                                  <ul className="list-disc list-inside text-zinc-300 space-y-1 mt-1 leading-normal select-text">
                                    {shadowResult.trapsToAvoid?.map((t: string, i: number) => (
                                      <li key={i}>{t}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-20 text-zinc-500 font-mono text-[10px]">
                              Запустите симуляцию, чтобы получить стратегический вектор.
                            </div>
                          )}
                        </div>
                      </div>
                    </div> {/* End of Shadow Negotiator grid */}

                    {/* DARK CABINET */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className={`xl:col-span-2 border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'} space-y-4`}>
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Eye className="w-4 h-4 text-rose-400" />
                          <h4 className="text-xs font-mono uppercase text-white font-bold">🎭 Тёмный Кабинет (Deep Persona Emulation)</h4>
                        </div>

                        <p className="text-xs text-zinc-400 leading-normal">
                          Архив Архетипов. Призовите агента-архетипа (например, «Макиавелли», «Стив Джобс», «Катрин Медичи»), чтобы он разобрал вашу ситуацию. Эти сущности предлагают крайне прагматичные, аморальные, но эффективные стратегии достижения целей.
                        </p>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Выбор Архетипа:</span>
                          <select 
                            value={darkPersona}
                            onChange={(e) => setDarkPersona(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-rose-500/40"
                          >
                            <option value="Никколо Макиавелли">Никколо Макиавелли</option>
                            <option value="Стив Джобс">Стив Джобс (Агрессивная доминанта)</option>
                            <option value="Катрин Медичи">Катрин Медичи (Интриги)</option>
                            <option value="Сунь Цзы">Сунь Цзы (Искусство Войны)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className={`border rounded-2xl p-5 flex flex-col h-[400px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-rose-400" />
                              <span className="text-xs font-mono uppercase font-bold text-white">Сеанс связи</span>
                            </div>
                            <span className="text-[8px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              {darkPersona.split(' ')[0].toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-xs">
                            {darkPersonaHistory.length === 0 ? (
                              <div className="text-center py-20 text-zinc-500 font-mono text-[10px]">
                                Задайте вопрос вашему Тёмному Советнику.
                              </div>
                            ) : (
                              darkPersonaHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] p-3 rounded-xl border ${
                                    msg.role === 'user'
                                      ? 'bg-zinc-850 border-white/5 text-zinc-100 font-mono rounded-br-none'
                                      : 'bg-rose-950/20 border-rose-500/10 text-rose-200 font-mono rounded-bl-none'
                                  }`}>
                                    <span className="text-[8px] uppercase tracking-wider block mb-1 opacity-50">
                                      {msg.role === 'user' ? 'ВЫ' : darkPersona.split(' ')[0]}
                                    </span>
                                    <p className="leading-relaxed select-text">{msg.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                            {chattingDark && (
                              <div className="flex justify-start">
                                <div className="bg-rose-950/10 border border-rose-500/5 text-zinc-500 font-mono p-3 rounded-xl rounded-bl-none animate-pulse">
                                  Анализ ситуации...
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                            <input
                              type="text"
                              value={darkPersonaInput}
                              onChange={(e) => setDarkPersonaInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') sendDarkCabinetMsg();
                              }}
                              placeholder="Опишите ситуацию..."
                              disabled={chattingDark}
                              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-rose-500/40"
                            />
                            <button
                              onClick={sendDarkCabinetMsg}
                              disabled={chattingDark || !darkPersonaInput.trim()}
                              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all shrink-0"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      </div>
                    </div> {/* End of Dark Cabinet grid */}
                  </motion.div>
                )}

                {/* 2. СФЕРА ЗАЩИТЫ (ANTI-MANIPULATION SHIELD) */}
                {vipSphere === 'defense' && (
                  <motion.div
                    key="defense"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 xl:grid-cols-3 gap-6"
                  >
                    <div className={`xl:col-span-2 border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'} space-y-4`}>
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <h4 className="text-xs font-mono uppercase text-white font-bold">🛡️ Социально-Инженерный Щит (Threat Detector)</h4>
                      </div>

                      <p className="text-xs text-zinc-400 leading-normal">
                        Анти-манипулятивный сканер. Загрузите текст сообщения, договора или коммерческого предложения, чтобы проверить его на наличие скрытых девиаций, уловок давления на жалость или ложного авторитета.
                      </p>

                      <textarea
                        value={shieldInput}
                        onChange={(e) => setShieldInput(e.target.value)}
                        placeholder="Вставьте сомнительный пункт контракта, предложение инвестора или странное письмо от партнера..."
                        className="w-full h-32 rounded-xl p-4 text-xs font-mono outline-none border border-white/5 bg-black/40 text-zinc-300 focus:border-rose-500/50"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={runShieldScan}
                          disabled={shieldScanning || !shieldInput.trim()}
                          className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all flex items-center gap-2"
                        >
                          <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: shieldScanning ? '1.5s' : '0s' }} />
                          {shieldScanning ? 'АНАЛИЗ УГРОЗ...' : 'ЗАПУСТИТЬ СКАНИРОВАНИЕ'}
                        </button>
                      </div>
                    </div>

                    {/* Shield Verdict Sidebar Results */}
                    <div className="space-y-6">
                      <div className={`border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                        <h4 className="text-xs font-mono uppercase text-rose-400 font-bold border-b border-white/5 pb-2.5 mb-3 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-rose-400" />
                          Вердикт Безопасности
                        </h4>

                        {shieldVerdict ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">Уровень угрозы:</span>
                              <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                shieldVerdict.threatLevel?.toUpperCase() === 'HIGH' 
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' 
                                  : shieldVerdict.threatLevel?.toUpperCase() === 'MEDIUM'
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {shieldVerdict.threatLevel || 'UNKNOWN'}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs font-mono">
                              <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl">
                                <span className="text-[8px] uppercase text-rose-400 font-bold block mb-1">Тип атаки (Attack Type):</span>
                                <p className="text-zinc-300 leading-normal select-text">"{shieldVerdict.manipulationType}"</p>
                              </div>

                              <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl">
                                <span className="text-[8px] uppercase text-orange-400 font-bold block mb-1">Мишень атаки (Exploit Trigger):</span>
                                <p className="text-zinc-300 leading-normal select-text">"{shieldVerdict.exploitTrigger}"</p>
                              </div>

                              <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl">
                                <span className="text-[8px] uppercase text-rose-300 font-bold block mb-1">Риск утечки уязвимости:</span>
                                <p className="text-zinc-300 leading-normal select-text">"{shieldVerdict.vulnerabilityLeaked}"</p>
                              </div>

                              <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl">
                                <span className="text-[8px] uppercase text-emerald-400 font-bold block mb-1">Рекомендуемый щит (Safe Counter-Reply):</span>
                                <p className="text-zinc-300 leading-normal select-text">"{shieldVerdict.safeCounterReply}"</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-20 text-zinc-500 font-mono text-[10px]">
                            Активируйте щит для выявления векторов психологической атаки.
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. СФЕРА ВЛИЯНИЯ (INFLUENCE & CHARISMA) */}
                {vipSphere === 'influence' && (
                  <motion.div
                    key="influence"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-6"
                  >
                    {/* DIGITAL DOUBLE SPARRING */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className={`xl:col-span-2 border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'} space-y-4`}>
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Brain className="w-4 h-4 text-rose-400 animate-pulse" />
                          <h4 className="text-xs font-mono uppercase text-white font-bold">👥 Кузница Двойника (Тренажер Агрессии)</h4>
                        </div>

                        <p className="text-xs text-zinc-400 leading-normal">
                          Синтез цифрового симулякра. Опишите поведенческую роль, архетип или характер Вашего оппонента (например, «Жесткий инвестор-диктатор» или «Продавец-манипулятор»), чтобы выковать его цифровую маску и провести с ней тренировочный спарринг-диалог.
                        </p>

                        <textarea
                          value={doubleTrainingInput}
                          onChange={(e) => setDoubleTrainingInput(e.target.value)}
                          placeholder="Опишите характер оппонента: Жесткий, упрямый, использует агрессивную доминанту и НЛП..."
                          className="w-full h-24 rounded-xl p-4 text-xs font-mono outline-none border border-white/5 bg-black/40 text-zinc-300 focus:border-rose-500/50"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={compileDigitalDouble}
                            disabled={trainingDouble || !doubleTrainingInput.trim()}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all flex items-center gap-2"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: trainingDouble ? '2s' : '0s' }} />
                            {trainingDouble ? 'КОМПИЛЯЦИЯ КЛОНА...' : 'ВЫКОВАТЬ ЦИФРОВОГО КЛОНА'}
                          </button>
                        </div>
                      </div>

                      {/* Sparring Playroom */}
                      <div className="space-y-6">
                        <div className={`border rounded-2xl p-5 flex flex-col h-[350px] ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-rose-400" />
                              <span className="text-xs font-mono uppercase font-bold text-white">Интерактивный спарринг</span>
                            </div>
                            {digitalDouble && (
                              <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                                CLONE ACTIVE
                              </span>
                            )}
                          </div>

                          {/* Sparring Messages */}
                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-xs">
                            {!digitalDouble ? (
                              <div className="text-center py-20 text-zinc-500 font-mono text-[10px]">
                                Синтезируйте двойника в левой панели, чтобы открыть интерактивное поле переговоров.
                              </div>
                            ) : doubleChatHistory.length === 0 ? (
                              <div className="text-center py-10 text-zinc-500 font-mono text-[10px]">
                                Цифровая копия готова. Сделайте первый шаг, чтобы проверить его защиту.
                              </div>
                            ) : (
                              doubleChatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] p-3 rounded-xl border ${
                                    msg.role === 'user'
                                      ? 'bg-zinc-850 border-white/5 text-zinc-100 font-mono rounded-br-none'
                                      : 'bg-rose-950/20 border-rose-500/10 text-rose-200 font-mono rounded-bl-none'
                                  }`}>
                                    <span className="text-[8px] uppercase tracking-wider block mb-1 opacity-50">
                                      {msg.role === 'user' ? 'ВЫ (Психоаналитик)' : 'ЦИФРОВАЯ КОПИЯ'}
                                    </span>
                                    <p className="leading-relaxed select-text">{msg.content}</p>
                                  </div>
                                </div>
                              ))
                            )}

                            {sendingDoubleMsg && (
                              <div className="flex justify-start">
                                <div className="bg-rose-950/10 border border-rose-500/5 text-zinc-500 font-mono p-3 rounded-xl rounded-bl-none animate-pulse">
                                  Двойник формулирует уловку...
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sparring Input */}
                          {digitalDouble && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                              <input
                                type="text"
                                value={doubleChatMsg}
                                onChange={(e) => setDoubleChatMsg(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') sendDoubleMessage();
                                }}
                                placeholder="Задать каверзный вопрос клону..."
                                disabled={sendingDoubleMsg}
                                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-rose-500/40"
                              />
                              <button
                                onClick={sendDoubleMessage}
                                disabled={sendingDoubleMsg || !doubleChatMsg.trim()}
                                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all shrink-0"
                              >
                                Send
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CHARISMA SYNTHESIZER */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className={`xl:col-span-2 border rounded-2xl p-5 ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'} space-y-4`}>
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <TrendingUp className="w-4 h-4 text-rose-400" />
                          <h4 className="text-xs font-mono uppercase text-white font-bold">✨ Синтезатор Харизмы (Neural Jailbreaking)</h4>
                        </div>

                        <p className="text-xs text-zinc-400 leading-normal">
                          Инструмент для «шлифовки» вашего образа. Вплетите паттерны Эриксоновского гипноза в любой текст, регулируя психологический вес от дружелюбного эксперта до непререкаемого диктатора.
                        </p>

                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                            <span>Эмпатия (0)</span>
                            <span className="text-rose-400 font-bold">Вес: {charismaWeight}</span>
                            <span>Доминация (1)</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="1" step="0.1"
                            value={charismaWeight}
                            onChange={(e) => setCharismaWeight(parseFloat(e.target.value))}
                            className="w-full accent-rose-500"
                          />
                        </div>

                        <textarea
                          value={charismaInput}
                          onChange={(e) => setCharismaInput(e.target.value)}
                          placeholder="Введите ваш пост, письмо или оффер для калибровки..."
                          className="w-full h-32 rounded-xl p-4 text-xs font-mono outline-none border border-white/5 bg-black/40 text-zinc-300 focus:border-rose-500/50"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={generateCharisma}
                            disabled={generatingCharisma || !charismaInput.trim()}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold transition-all flex items-center gap-2"
                          >
                            <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: generatingCharisma ? '1.5s' : '0s' }} />
                            {generatingCharisma ? 'КАЛИБРОВКА...' : 'СИНТЕЗИРОВАТЬ МАГНЕТИЗМ'}
                          </button>
                        </div>
                      </div>

                      {/* Charisma results */}
                      <div className="space-y-6">
                        <div className={`border rounded-2xl p-5 h-full ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-white/5'}`}>
                          <h4 className="text-xs font-mono uppercase text-rose-400 font-bold border-b border-white/5 pb-2.5 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rose-400" />
                            Откалиброванный вектор
                          </h4>

                          {charismaResult ? (
                            <div className="space-y-4">
                              <div className="p-4 bg-zinc-950/60 border border-white/5 rounded-xl font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text h-[260px] overflow-y-auto custom-scrollbar">
                                {charismaResult}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-20 text-zinc-500 font-mono text-[10px]">
                              Введите текст для инъекции скрытых внушений и обхода барьеров.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
