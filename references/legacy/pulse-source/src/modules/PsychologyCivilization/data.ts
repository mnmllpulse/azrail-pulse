import { Brain, ShieldCheck, Eye, UserCheck, Skull, Lock, TrendingUp, Sparkles } from 'lucide-react';
import { ArchetypeData, CognitiveTrigger, LibrarySection } from './types';

export const archetypesLibrary: ArchetypeData[] = [
  {
    id: 'machiavelli',
    name: 'Niccolò Machiavelli',
    description: 'Focuses entirely on ends justifying the means. Highly calculated, utilizing deception and emotional detachment to maintain absolute control.',
    ocean: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.4, agreeableness: 0.1, neuroticism: 0.2 },
    techniques: ['Pragmatism', 'Deception', 'Coercion', 'Gaslighting']
  },
  {
    id: 'steve_jobs',
    name: 'Steve Jobs (Aggressive Dominance)',
    description: 'Combines intense charisma with abrasive standards, bending the perception of others to match his vision (Reality Distortion Field).',
    ocean: { openness: 0.9, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 0.2, neuroticism: 0.6 },
    techniques: ['Reality Distortion', 'Charm', 'Intimidation', 'Vision Casting']
  },
  {
    id: 'catherine_medici',
    name: 'Catherine de\' Medici',
    description: 'Operates behind the scenes, playing factions against each other while maintaining a facade of neutrality. The Web Weaver.',
    ocean: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.4 },
    techniques: ['Intrigue', 'Patience', 'Triangulation', 'Plausible Deniability']
  },
  {
    id: 'sun_tzu',
    name: 'Sun Tzu',
    description: 'Master of strategic timing and terrain. Never fights a battle that is not already won in the mind.',
    ocean: { openness: 0.9, conscientiousness: 0.9, extraversion: 0.2, agreeableness: 0.4, neuroticism: 0.1 },
    techniques: ['Deception', 'Timing', 'Resource Exhaustion', 'Psychological Warfare']
  }
];

export const bookshelfData: LibrarySection[] = [
  {
    category: 'Dark Psychology & Manipulation',
    books: [
      {
        title: '«48 законов власти» и «Законы человеческой природы»',
        author: 'Роберт Грин',
        desc: 'Библия реализма. Грин безжалостно препарирует исторические примеры манипуляций, сокрытия намерений и удержания контроля.',
        accent: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
        icon: Skull
      },
      {
        title: '«Темная психология»',
        author: 'Дэниел Дрейк',
        desc: 'Анализ скрытого манипулирования, НЛП-техник и того, как хищные психотипы используют чужие слабости для достижения эгоистичных целей.',
        accent: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
        icon: Lock
      }
    ]
  },
  {
    category: 'Психология маркетинга и Внушение доверия',
    books: [
      {
        title: '«Психология влияния» и «Психология согласия» (Pre-suasion)',
        author: 'Роберт Чалдини',
        desc: 'Мировая классика. 6 главных принципов (взаимный обмен, дефицит, авторитет, социальное доказательство и т.д.), на которых строится маркетинг и социальная инженерия.',
        accent: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
        icon: TrendingUp
      },
      {
        title: '«Взлом маркетинга»',
        author: 'Фил Барден',
        desc: 'Научный подход к покупкам. Детальный разбор поведения потребителей на основе когнитивной психологии и нейробиологии без манипулятивного шлака.',
        accent: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
        icon: Sparkles
      }
    ]
  },
  {
    category: 'Искусство лжи и Распознавание манипуляций',
    books: [
      {
        title: '«Психология лжи» (Telling Lies)',
        author: 'Пол Экман',
        desc: 'Самый авторитетный труд по микромимике, жестам и вегетативным реакциям человека, выдающим обман.',
        accent: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
        icon: Eye
      },
      {
        title: '«Включаем обаяние по методике спецслужб»',
        author: 'Джек Шафер',
        desc: 'Как бывший агент ФБР вербовал людей и мгновенно вызывал доверие без давления. Идеально для изучения «искусства чистого внушения».',
        accent: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
        icon: UserCheck
      }
    ]
  },
  {
    category: 'Когнитивные искажения и Критическое мышление',
    books: [
      {
        title: '«Думай медленно... Решай быстро»',
        author: 'Даниэль Канеман',
        desc: 'База когнитивистики. Система 1 (быстрое, интуитивное, но полное ошибок мышление) и Система 2 (медленное, логическое). Все когнитивные баги берут начало здесь.',
        accent: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
        icon: Brain
      },
      {
        title: '«Анатомия заблуждений. Введение в критическое мышление»',
        author: 'Никита Непряхин',
        desc: 'Практический разбор того, как проверять информацию, строить аргументацию и не попадаться на удочку фейков.',
        accent: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
        icon: ShieldCheck
      }
    ]
  }
];

export const cognitiveTriggers: CognitiveTrigger[] = [
  {
    id: 'scarcity',
    name: 'Scarcity Bias (Иллюзия редкости)',
    description: 'The perception that products or opportunities are more valuable when they are limited.',
    category: 'manipulation'
  },
  {
    id: 'confirmation_bias',
    name: 'Confirmation Bias (Ошибка подтверждения)',
    description: 'The tendency to search for, interpret, favor, and recall information in a way that confirms one\'s preexisting beliefs.',
    category: 'influence'
  },
  {
    id: 'halo_effect',
    name: 'Halo Effect (Эффект ореола)',
    description: 'The tendency for positive impressions of a person, company, brand or product in one area to positively influence one\'s opinion or feelings in other areas.',
    category: 'influence'
  },
  {
    id: 'gaslighting',
    name: 'Gaslighting (Газлайтинг)',
    description: 'A form of psychological manipulation in which a person seeks to sow seeds of doubt in a targeted individual, making them question their own memory, perception, or sanity.',
    category: 'manipulation'
  },
  {
    id: 'sunk_cost',
    name: 'Sunk Cost Fallacy (Ловушка невозвратных затрат)',
    description: 'The phenomenon whereby a person is reluctant to abandon a strategy or course of action because they have invested heavily in it, even when it is clear that abandonment would be more beneficial.',
    category: 'strategy'
  }
];
