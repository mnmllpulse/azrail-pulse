import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Brain, 
  Activity
} from 'lucide-react';

export interface OceanScores {
  openness: number;          // O - Openness
  conscientiousness: number;  // C - Conscientiousness
  extraversion: number;       // E - Extraversion
  agreeableness: number;      // A - Agreeableness
  neuroticism: number;        // N - Neuroticism
  [key: string]: number;      // Support extra dynamic metrics (e.g. aggressiveness, machiavellianism)
}

interface PsychologicalRadarProps {
  scores: OceanScores;
  title?: string;
  isLight?: boolean;
}

export function PsychologicalRadar({ 
  scores, 
  title = "Психологический Радар (OCEAN)", 
  isLight = false 
}: PsychologicalRadarProps) {
  
  // Define standard and dynamic trait metadata
  const traitsMetadata: { key: string; label: string; shortLabel: string; color: string }[] = [
    { key: 'openness', label: 'O - Открытость (Openness)', shortLabel: 'O - Открытость', color: 'bg-emerald-500' },
    { key: 'conscientiousness', label: 'C - Структура (Conscientiousness)', shortLabel: 'C - Структура', color: 'bg-indigo-500' },
    { key: 'extraversion', label: 'E - Экстраверсия (Extraversion)', shortLabel: 'E - Экстраверсия', color: 'bg-blue-500' },
    { key: 'agreeableness', label: 'A - Эмпатия (Agreeableness)', shortLabel: 'A - Эмпатия', color: 'bg-rose-500' },
    { key: 'neuroticism', label: 'N - Нейротизм (Neuroticism)', shortLabel: 'N - Нейротизм', color: 'bg-amber-500' },
  ];

  // Dynamically append any secondary metrics returned from deeper profiling/competitor scanning
  if (scores.aggressiveness !== undefined) {
    traitsMetadata.push({ key: 'aggressiveness', label: 'Агрессивность (Aggressiveness)', shortLabel: 'Агрессивность', color: 'bg-red-500' });
  }
  if (scores.machiavellianism !== undefined) {
    traitsMetadata.push({ key: 'machiavellianism', label: 'Макиавеллизм (Machiavellianism)', shortLabel: 'Макиавеллизм', color: 'bg-purple-500' });
  }
  if (scores.narcissism !== undefined) {
    traitsMetadata.push({ key: 'narcissism', label: 'Нарциссизм (Narcissism)', shortLabel: 'Нарциссизм', color: 'bg-pink-500' });
  }
  if (scores.psychopathy !== undefined) {
    traitsMetadata.push({ key: 'psychopathy', label: 'Психопатия (Psychopathy)', shortLabel: 'Психопатия', color: 'bg-zinc-500' });
  }

  // Format data for Recharts RadarChart
  const radarData = traitsMetadata.map(t => ({
    subject: t.shortLabel,
    value: scores[t.key] !== undefined ? Math.round(scores[t.key]) : 50,
    fullMark: 100
  }));

  // Helper to determine personality synthesis based on dominant scores
  const getPersonalitySynthesis = () => {
    const { openness = 50, conscientiousness = 50, extraversion = 50, agreeableness = 50, neuroticism = 50, aggressiveness = 0, machiavellianism = 0 } = scores;
    
    if (machiavellianism > 60 || aggressiveness > 60) {
      return {
        title: "Стратегический Эксплуататор (Strategic Controller)",
        desc: "Доминирует высокая прагматичность и ориентация на результат любой ценой. Текст содержит скрытые рычаги влияния, давление авторитетом или ультиматумы.",
        tag: "Тёмный Архитектор"
      };
    }
    if (openness > 70 && conscientiousness > 75) {
      return {
        title: "Систематический Инноватор (Systematic Innovator)",
        desc: "Высокая креативность сочетается со строгой внутренней самодисциплиной. Способен генерировать масштабные концепции и скрупулезно воплощать их в реальность.",
        tag: "Визионер-Конструктор"
      };
    }
    if (neuroticism > 70 && agreeableness < 40) {
      return {
        title: "Импульсивный Скептик (Impulsive Skeptic)",
        desc: "Подозрителен к чужим мотивам, быстро реагирует на скрытые угрозы. Текст наполнен оборонительными паттернами и стремлением удержать контроль.",
        tag: "Оборонительное ядро"
      };
    }
    if (extraversion > 70 && agreeableness > 70) {
      return {
        title: "Харизматичный Эмпат (Charismatic Advocate)",
        desc: "Открытый, общительный стиль повествования. Доминирует фокус на людях, партнерстве и создании атмосферы максимальной психологической безопасности.",
        tag: "Социальный катализатор"
      };
    }
    if (conscientiousness < 40 && openness > 70) {
      return {
        title: "Свободный Творец (Chaotic Creative)",
        desc: "Игнорирует традиционные шаблоны и формальные ограничения. Предпочитает интуитивный, свободный поток мыслей жесткой структуре.",
        tag: "Хаос-Визионер"
      };
    }
    
    return {
      title: "Прагматичный Реалист (Pragmatic Strategist)",
      desc: "Взвешенный и реалистичный тон коммуникации. Равномерный баланс между логической структурой и адаптивностью под контекст ситуации.",
      tag: "Адаптивное ядро"
    };
  };

  const synthesis = getPersonalitySynthesis();

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isLight 
        ? 'bg-white border-gray-100 shadow-sm' 
        : 'bg-[#050505]/40 border-white/5 backdrop-blur-xl shadow-2xl'
    }`}>
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-rose-400 animate-pulse" />
          <h4 className={`text-xs font-mono uppercase font-bold tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h4>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
          Big Five Profile
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Radar Chart Visual */}
        <div className="lg:col-span-3 flex justify-center items-center h-[260px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid 
                stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"} 
              />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ 
                  fill: isLight ? "#4b5563" : "#a1a1aa", 
                  fontSize: 10, 
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 500
                }} 
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ 
                  fill: isLight ? "#9ca3af" : "#52525b", 
                  fontSize: 8 
                }} 
                axisLine={false}
              />
              <Radar
                name="Psychological Radar"
                dataKey="value"
                stroke={isLight ? "#4f46e5" : "#f43f5e"}
                fill={isLight ? "#4f46e5" : "#f43f5e"}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic Descriptive Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-mono uppercase font-bold">
                {synthesis.tag}
              </span>
              <span className="text-zinc-500 text-[8px] font-mono uppercase">SYNTHESIS_OK</span>
            </div>
            <h5 className={`text-xs font-bold font-mono tracking-tight mb-1.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {synthesis.title}
            </h5>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {synthesis.desc}
            </p>
          </div>

          {/* Traits Progress List */}
          <div className="space-y-2">
            {traitsMetadata.map(trait => {
              const val = scores[trait.key] !== undefined ? Math.round(scores[trait.key]) : 50;
              return (
                <div key={trait.key} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-zinc-500 uppercase">{trait.label}</span>
                    <span className={`${isLight ? 'text-gray-900' : 'text-white'} font-bold`}>{val}%</span>
                  </div>
                  <div className={`w-full h-1 rounded-full ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
                    <div 
                      className={`h-full rounded-full ${trait.color}`} 
                      style={{ width: `${val}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
