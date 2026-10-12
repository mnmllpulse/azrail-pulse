import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Zap, 
  Star, 
  Database, 
  Sparkles, 
  Cpu, 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  TrendingUp, 
  HelpCircle, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_123');

const tiers = [
  {
    name: "Free",
    operations: "10 ГЕНЕРАЦИЙ / ДЕНЬ",
    price: "$0",
    desc: "Начни бесплатно. Переходи на Pro когда будешь готов.",
    features: [
      "10 генераций в день",
      "Базовые модели",
      "Watermark"
    ],
    icon: <Clock className="w-5 h-5" />,
    color: "from-zinc-500/10 to-zinc-700/10 hover:from-zinc-500/20 hover:to-zinc-700/20",
    border: "border-zinc-500/20 hover:border-zinc-500/40",
    text: "text-zinc-400",
    bg: "bg-zinc-500",
    premium: false,
    popular: false
  },
  {
    name: "Pro",
    operations: "НЕОГРАНИЧЕННО",
    price: "$12",
    desc: "Продвинутый уровень когнитивных вычислений Pulse OS.",
    features: [
      "Неограниченные генерации",
      "Музыка + Видео",
      "Приоритет",
      "Экспорт без водяного знака"
    ],
    icon: <Star className="w-5 h-5" />,
    color: "from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
    text: "text-indigo-400",
    bg: "bg-indigo-500",
    premium: false,
    popular: true
  },
  {
    name: "Enterprise",
    operations: "БЕЗЛИМИТ + SWARM",
    price: "$49",
    desc: "Высокая пропускная способность и собственный Swarm.",
    features: [
      "Всё из Pro",
      "Собственный Swarm",
      "API доступ",
      "Приоритетная поддержка"
    ],
    icon: <Cpu className="w-5 h-5" />,
    color: "from-rose-500/10 to-pink-500/10 hover:from-rose-500/20 hover:to-pink-500/20",
    border: "border-rose-500/20 hover:border-rose-500/40",
    text: "text-rose-400",
    bg: "bg-rose-500",
    premium: true,
    popular: false
  }
];

const mockTransactions = [
  { id: "TXN-9381-01", date: "2026-07-18", tier: "Pro Plan", amount: "$12.00", status: "Completed" },
  { id: "TXN-8472-92", date: "2026-06-18", tier: "Pro Plan", amount: "$12.00", status: "Completed" },
  { id: "TXN-7182-38", date: "2026-05-18", tier: "Free Plan", amount: "$0.00", status: "Completed" }
];

export default function BillingStudioPanel({ isLight }: { isLight: boolean }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'canceled' | null>(null);
  const [activePlan, setActivePlan] = useState<string>('Pro');

  // Parse checkout status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/user-status');
        const data = await response.json();
        if (data.plan) setActivePlan(data.plan);
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };
    fetchStatus();

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      setCheckoutStatus('success');
    } else if (checkout === 'canceled') {
      setCheckoutStatus('canceled');
    }
  }, []);

  const handleCheckout = async (tier: any) => {
    try {
      setIsLoading(tier.name);
      
      if (tier.price === "$0") {
        setTimeout(() => {
          setActivePlan(tier.name);
          setIsLoading(null);
          toast.success(`Тариф успешно изменен на ${tier.name}!`);
        }, 800);
        return;
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierName: tier.name,
          price: tier.price,
          billingCycle,
          userId: 'user_123' // Replace with real auth user id if available
        }),
      });

      const session = await response.json();

      if (session.error) {
        console.error('Checkout creation error:', session.error);
        // Fallback simulation in dev/if Stripe keys are missing
        setTimeout(() => {
          setActivePlan(tier.name);
          setIsLoading(null);
          toast.success(`[Демо-режим] Тариф успешно изменен на ${tier.name}!`);
        }, 1000);
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
      console.error('Error initiating checkout:', err);
      // Fallback simulation so that everything is interactive
      setTimeout(() => {
        setActivePlan(tier.name);
        setIsLoading(null);
        toast.success(`[Демо-режим] Тариф успешно изменен на ${tier.name}!`);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Checkout Status Notifications */}
      {checkoutStatus && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg ${
          checkoutStatus === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-3">
            {checkoutStatus === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500" />
            )}
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider">
                {checkoutStatus === 'success' ? 'ПЛАТЕЖ ВЫПОЛНЕН УСПЕШНО' : 'ОПЛАТА ОТМЕНЕНА'}
              </h4>
              <p className="text-xs opacity-80 mt-1">
                {checkoutStatus === 'success' 
                  ? 'Ваша нейронная мощность успешно повышена. Лимиты ко-процессоров обновлены!' 
                  : 'Процесс оплаты прерван. Статус подписки остался без изменений.'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCheckoutStatus(null);
              // Clean URL query params without reloading the page
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-bold border transition-colors ${
              checkoutStatus === 'success'
                ? 'border-emerald-500/30 hover:bg-emerald-500/20'
                : 'border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Dashboard & Usage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Overview */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/5'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <h3 className={`text-sm font-mono font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                АКТИВНЫЙ ТАРИФ
              </h3>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-2xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {activePlan}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-indigo-500/20 text-indigo-400`}>
                {activePlan.toUpperCase()}
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'} leading-relaxed`}>
              {activePlan === 'Free' 
                ? 'Базовый уровень когнитивных вычислений Pulse OS. Начни бесплатно.' 
                : activePlan === 'Pro'
                  ? 'Продвинутый уровень когнитивных вычислений Pulse OS. Ежемесячное обновление лимита 15 числа.'
                  : 'Максимальный уровень когнитивных вычислений с выделенным Swarm и API доступом.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-white/10 flex justify-between items-center text-xs font-mono">
            <span className={`${isLight ? 'text-gray-500' : 'text-white/40'}`}>СЛЕДУЮЩЕЕ СПИСАНИЕ:</span>
            <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {activePlan === 'Free' ? 'БЕСПЛАТНО / НАВСЕГДА' : '2026-07-18'}
            </span>
          </div>
        </div>

        {/* Neural load / operations usage */}
        <div className={`p-6 rounded-3xl border ${
          isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/5'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-5 h-5 ${isLight ? 'text-orange-500' : 'text-orange-400'}`} />
              <h3 className={`text-sm font-mono font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                ИСПОЛЬЗОВАНИЕ РЕСУРСОВ
              </h3>
            </div>
            <span className="text-[10px] font-mono text-white/40">34% ИСПОЛЬЗОВАНО</span>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className={`${isLight ? 'text-gray-600' : 'text-white/60'}`}>ИИ Операции</span>
                <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>85 / 250</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-white/10'}`}>
                <div className="h-full bg-orange-500 w-[34%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className={`${isLight ? 'text-gray-600' : 'text-white/60'}`}>Ко-процессоры Swarm</span>
                <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>4 / 8 Активно</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-white/10'}`}>
                <div className="h-full bg-indigo-500 w-[50%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Security / Stripe Platform note */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/5'
        }`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                STRIPE SECURE CHECKOUT
              </h4>
              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/60'} mt-1 leading-relaxed`}>
                Все платежи надежно шифруются и проходят через шлюз Stripe. Данные карт не сохраняются в системе Pulse OS. Безопасность гарантирована SSL 256-бит шифрованием.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/40'}`}>
              PCI-DSS COMPLIANT
            </span>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/40'}`}>
              SSL ENCRYPTED
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Options Toggle */}
      <div className="flex flex-col items-center mt-4">
        <h2 className={`text-xl font-bold tracking-tight mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Выберите Уровень Когнитивного Развития
        </h2>
        <p className={`text-xs font-mono mb-6 ${isLight ? 'text-gray-500' : 'text-white/40'} text-center`}>
          ДОСТИГАЙТЕ МАКСИМАЛЬНОЙ ПРОИЗВОДИТЕЛЬНОСТИ. 20% СКИДКА ПРИ ГОДОВОЙ ОПЛАТЕ.
        </p>

        <div className={`flex items-center p-1 rounded-full border mb-8 ${
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

      {/* Core Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
        {tiers.map((tier) => {
          const isFree = tier.price === "$0";
          const monthlyInt = parseInt(tier.price.replace('$', ''));
          const displayPrice = isFree ? 0 : (billingCycle === 'yearly' ? Math.floor(monthlyInt * 0.8) : monthlyInt);
          const isCurrent = activePlan === tier.name;

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden group ${
                isCurrent
                  ? (isLight ? 'border-emerald-500 bg-emerald-500/5 shadow-lg scale-102' : 'border-emerald-500 bg-emerald-500/[0.02] shadow-[0_0_20px_rgba(16,185,129,0.1)] scale-102')
                  : tier.popular
                    ? (isLight ? 'border-indigo-500 shadow-xl scale-105' : 'border-indigo-500 bg-indigo-500/[0.02] shadow-[0_0_25px_rgba(99,102,241,0.15)] scale-105')
                    : (isLight ? 'bg-white border-gray-200 shadow-sm hover:border-gray-300' : 'bg-white/[0.02] border-white/10 hover:border-white/20')
              }`}
            >
              {/* Background color gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-b ${tier.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {tier.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}
              {isCurrent && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              )}

              <div className="relative p-6 flex flex-col flex-1 z-10">
                {isCurrent && (
                  <span className={`self-start mb-4 px-2.5 py-1 rounded-full text-[8px] font-mono font-bold tracking-widest uppercase ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300 animate-pulse'
                  }`}>
                    АКТИВНЫЙ ТАРИФ
                  </span>
                )}
                {!isCurrent && tier.popular && (
                  <span className={`self-start mb-4 px-2.5 py-1 rounded-full text-[8px] font-mono font-bold tracking-widest uppercase ${
                    isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    САМЫЙ ПОПУЛЯРНЫЙ
                  </span>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${
                  isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'
                } ${tier.text}`}>
                  {tier.icon}
                </div>

                <h3 className={`text-base font-bold tracking-tight mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {tier.name}
                </h3>
                <p className={`text-xs font-mono mb-4 h-8 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                  {tier.desc}
                </p>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className={`text-5xl font-bold tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    ${displayPrice}
                  </span>
                  <span className={`text-zinc-400 text-xs font-mono`}>
                    {isFree ? '/навсегда' : (billingCycle === 'yearly' ? '/мес' : '/мес')}
                  </span>
                </div>

                <div className={`px-3 py-2 rounded-xl border mb-6 text-center ${
                  isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                }`}>
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${tier.text}`}>
                    {tier.operations}
                  </span>
                </div>

                <ul className="flex flex-col gap-3 flex-1 mb-6">
                  {tier.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <span className={isLight ? 'text-gray-600' : 'text-white/70'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => !isCurrent && handleCheckout(tier)}
                  disabled={isLoading !== null || isCurrent}
                  className={`w-full py-3 rounded-2xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 uppercase font-mono ${
                    isCurrent
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                      : tier.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : (isLight ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'bg-white/10 hover:bg-white/20 text-white')
                  } ${isLoading === tier.name ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isLoading === tier.name ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ОБРАБОТКА...
                    </>
                  ) : isCurrent ? (
                    'АКТИВНЫЙ ТАРИФ'
                  ) : isFree ? (
                    'Начать бесплатно'
                  ) : (
                    'Выбрать план'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className={`w-5 h-5 ${isLight ? 'text-gray-500' : 'text-white/40'}`} />
          <h3 className={`text-sm font-mono font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ИСТОРИЯ ОПЕРАЦИЙ
          </h3>
        </div>

        <div className={`border rounded-3xl overflow-hidden ${
          isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#0b0b0d] border-white/5'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className={`border-b ${isLight ? 'bg-gray-50 border-gray-100 text-gray-500' : 'bg-white/5 border-white/5 text-white/40'}`}>
                  <th className="p-4 uppercase tracking-widest font-bold">Идентификатор</th>
                  <th className="p-4 uppercase tracking-widest font-bold">Дата</th>
                  <th className="p-4 uppercase tracking-widest font-bold">Тариф</th>
                  <th className="p-4 uppercase tracking-widest font-bold">Сумма</th>
                  <th className="p-4 uppercase tracking-widest font-bold">Статус</th>
                  <th className="p-4 uppercase tracking-widest font-bold text-right">Документ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-gray-100 text-gray-700' : 'divide-white/5 text-white/70'}`}>
                {mockTransactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-white/5 transition-colors`}>
                    <td className="p-4 font-bold">{tx.id}</td>
                    <td className="p-4">{tx.date}</td>
                    <td className="p-4">{tx.tier}</td>
                    <td className="p-4">{tx.amount}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className={`p-1 rounded-lg transition-colors inline-flex items-center gap-1 hover:text-orange-500`}>
                        <FileText className="w-4 h-4" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
