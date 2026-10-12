import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Star, Shield, Database, Sparkles, Cpu, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_123');

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

const tiers = [
  {
    name: "Интеллект+",
    operations: "50 ОПЕРАЦИЙ",
    price: "$9",
    desc: "Базовые нейронные протоколы.",
    features: [
      "Доступ к базовым ИИ моделям",
      "Стандартная скорость",
      "Web Studio (базовый доступ)",
      "Email поддержка"
    ],
    icon: <Zap className="w-6 h-6" />,
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    text: "text-amber-500",
    bg: "bg-amber-500"
  },
  {
    name: "Intelligence Pro",
    operations: "250 ОПЕРАЦИЙ",
    price: "$29",
    desc: "Продвинутые когнитивные пути.",
    features: [
      "Продвинутые модели (Claude 3, GPT-4)",
      "Приоритетная скорость",
      "Music & Video Studio",
      "24/7 Приоритетная поддержка"
    ],
    icon: <Star className="w-6 h-6" />,
    color: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/30",
    text: "text-orange-500",
    bg: "bg-orange-500",
    popular: true
  },
  {
    name: "Intelligence Pro+",
    operations: "1000 ОПЕРАЦИЙ",
    price: "$89",
    desc: "Высокая пропускная способность.",
    features: [
      "Все функции Pro",
      "Обработка с нулевой задержкой",
      "Кастомные ИИ-Агенты (Swarm)",
      "Персональный менеджер"
    ],
    icon: <Database className="w-6 h-6" />,
    color: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/30",
    text: "text-red-500",
    bg: "bg-red-500"
  },
  {
    name: "Intelligence Super",
    operations: "3000 ОПЕРАЦИЙ",
    price: "$249",
    desc: "Мощность суперкомпьютера.",
    features: [
      "Все функции Pro+",
      "Выделенный серверный узел",
      "Безлимитная Web-генерация",
      "API доступ и вебхуки"
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
    text: "text-rose-500",
    bg: "bg-rose-500"
  },
  {
    name: "Enterprise Intelligence Lab",
    operations: "БЕЗЛИМИТ",
    price: "$999/yr",
    desc: "Абсолютная истина. Нет ограничений.",
    features: [
      "Безлимитные операции",
      "White-label кастомизация OS",
      "On-premise развертывание",
      "Прямой канал с инженерами"
    ],
    icon: <Cpu className="w-6 h-6" />,
    color: "from-yellow-500/30 to-amber-600/30",
    border: "border-yellow-500/50",
    text: "text-yellow-500",
    bg: "bg-yellow-500",
    premium: true
  }
];

export default function PricingModal({ isOpen, onClose, isLight }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleCheckout = async (tier: any) => {
    try {
      setIsLoading(tier.name);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierName: tier.name,
          price: tier.price,
          billingCycle,
          userId: 'user_123' // Get this from Auth in a real app
        }),
      });

      const session = await response.json();

      if (session.error) {
        console.error('Checkout error:', session.error);
        alert('Ошибка при оплате: ' + session.error);
        setIsLoading(null);
        return;
      }

      if (session.url) {
        window.location.href = session.url;
      } else {
        const stripe = await stripePromise;
        if (stripe) {
          await (stripe as any).redirectToCheckout({
            sessionId: session.id,
          });
        }
      }
    } catch (err) {
      console.error('Error in checkout:', err);
      setIsLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-black to-zinc-950 opacity-60"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 backdrop-blur-[2px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-0"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl sm:rounded-3xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden ${
            isLight ? 'bg-white/90 sm:border-gray-200' : 'bg-[#0A0A0C]/80 sm:border-white/10'
          } backdrop-blur-xl`}
        >
          {/* Header */}
          <div className={`sticky top-0 z-20 flex items-center justify-between p-6 border-b backdrop-blur-md ${
            isLight ? 'bg-white/80 border-gray-100' : 'bg-[#0A0A0C]/80 border-white/5'
          }`}>
            <div className="flex flex-col">
              <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Улучшение Нейронной Мощности
              </h2>
              <p className={`text-sm font-mono mt-1 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                РАСШИРЯЙТЕ СИНАПТИЧЕСКИЕ ПУТИ. ОПТИМИЗИРОВАНО ПРОТИВ ЭКОНОМИЧЕСКОГО КОЛЛАПСА.
              </p>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cards Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-center mt-8 mb-4 relative z-10 px-6">
            <div className={`flex items-center p-1 rounded-full border ${
              isLight ? 'bg-gray-100/50 border-gray-200' : 'bg-white/5 border-white/10'
            }`}>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                  billingCycle === 'monthly'
                    ? (isLight ? 'bg-white text-orange-600 shadow-sm' : 'bg-orange-500 text-white shadow-lg')
                    : (isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white/80')
                }`}
              >
                Месяц
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? (isLight ? 'bg-white text-orange-600 shadow-sm' : 'bg-orange-500 text-white shadow-lg')
                    : (isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white/80')
                }`}
              >
                Год
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                  billingCycle === 'yearly' 
                    ? (isLight ? 'bg-orange-100 text-orange-700' : 'bg-white/20 text-white')
                    : (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400')
                }`}>
                  СКИДКА 20%
                </span>
              </button>
            </div>
            </div>

            {/* Cards Grid / Mobile Scroll */}
            <div className="px-6 pb-12 pt-4 flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:overflow-visible hide-scrollbar">
              {tiers.map((tier, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={tier.name}
                  className={`shrink-0 w-[85vw] sm:w-[350px] md:w-auto snap-center relative flex flex-col rounded-2xl border transition-all overflow-hidden group ${
                  tier.premium 
                    ? (isLight ? 'bg-yellow-50/50 border-yellow-200 shadow-xl' : 'bg-[#1a1205] border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]') 
                    : (isLight ? 'bg-white border-gray-200 shadow-sm hover:border-orange-300' : 'bg-white/[0.02] border-white/10 hover:border-white/20')
                }`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-b ${tier.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {tier.popular && (
                  <div className={`absolute top-0 inset-x-0 h-1 ${tier.bg}`} />
                )}
                
                <div className="relative p-5 flex flex-col flex-1">
                  {tier.popular && (
                    <span className={`self-start mb-3 px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest uppercase ${
                      isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-300'
                    }`}>
                      САМЫЙ ПОПУЛЯРНЫЙ
                    </span>
                  )}
                  {tier.premium && (
                    <span className={`self-start mb-3 px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest uppercase bg-yellow-500 text-white animate-pulse`}>
                      УЛЬТИМАТИВНАЯ ПАРАДИГМА
                    </span>
                  )}
                  
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${
                    isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'
                  } ${tier.text}`}>
                    {tier.icon}
                  </div>
                  
                  <h3 className={`text-lg font-bold tracking-tight mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {tier.name}
                  </h3>
                  <p className={`text-xs font-mono mb-4 h-8 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    {tier.desc}
                  </p>
                  
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className={`text-3xl font-bold tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {tier.price === "$999/yr" ? "$999" : (billingCycle === 'yearly' ? `$${Math.floor(parseInt(tier.price.replace('$','')) * 0.8)}` : tier.price)}
                    </span>
                    <span className={`text-sm font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                      {tier.price === "$999/yr" ? "/год" : "/мес"}
                    </span>
                  </div>
                  
                  <div className={`px-3 py-2 rounded-lg border mb-6 text-center ${
                    isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                  }`}>
                    <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${tier.text}`}>
                      {tier.operations}
                    </span>
                  </div>
                  
                  <ul className="flex flex-col gap-3 flex-1 mb-6">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.text}`} />
                        <span className={`text-sm leading-tight ${isLight ? 'text-gray-600' : 'text-white/70'}`}>
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    onClick={() => handleCheckout(tier)}
                    disabled={isLoading === tier.name}
                    className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                    tier.premium 
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                      : (isLight ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'bg-white hover:bg-gray-200 text-black')
                  } ${isLoading === tier.name ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isLoading === tier.name ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        ОБРАБОТКА...
                      </>
                    ) : (
                      tier.premium ? 'ИНИЦИАЛИЗИРОВАТЬ LAB' : 'УЛУЧШИТЬ УРОВЕНЬ'
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
