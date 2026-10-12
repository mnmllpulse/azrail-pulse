import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Cloud, 
  Globe, 
  Cpu, 
  Shield, 
  Activity, 
  Settings, 
  Zap, 
  Server,
  LayoutGrid,
  List,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Database,
  Network,
  Lock,
  RefreshCw,
  MoreVertical,
  Plus,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { AI_MODELS, MODEL_CATEGORIES } from '../data/models';
import PulseTooltip from '../components/Tooltip';
import { CloudflareService } from '../services/cloudflareService';
import { CFDomain, CFWorker } from '../types/cloudflare';
import { useLanguage } from '../contexts/LanguageContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { toast } from 'sonner';

const InfrastructureHub = () => {
  const { t, language } = useLanguage();
  const isRu = language === 'ru';
  const { activeAIModelId, setActiveAIModelId } = useSystemState();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [inputAccountId, setInputAccountId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleToggleModel = (model: any) => {
    if (activeAIModelId === model.id) {
      setActiveAIModelId(null);
      toast.info(`Disconnected from ${model.name}`);
    } else {
      setActiveAIModelId(model.id);
      toast.success(`Connected to ${model.name} neural core`);
    }
  };
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'models' | 'deployment'>('cloudflare');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [domains, setDomains] = useState<CFDomain[]>([]);
  const [workers, setWorkers] = useState<CFWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInfrastructure();
  }, []);

  const [cfStatus, setCfStatus] = useState<{ 
    hasToken: boolean; 
    hasAccountId: boolean; 
    tokenPrefix?: string | null; 
    accountIdPrefix?: string | null; 
  } | null>(null);

  const checkStatus = async () => {
    try {
      const response = await axios.get('/api/cloudflare/status');
      setCfStatus(response.data);
    } catch (e) {
      console.error('Failed to check CF status', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenVal = inputToken.trim();
    const accountIdVal = inputAccountId.trim();

    if (!tokenVal && !accountIdVal) {
      toast.error(isRu ? 'Пожалуйста, введите хотя бы одно значение для обновления' : 'Please provide at least one value to update');
      return;
    }
    setIsSaving(true);
    try {
      const response = await axios.post('/api/cloudflare/config', {
        apiToken: tokenVal || undefined,
        accountId: accountIdVal || undefined
      });
      toast.success(response.data.message || (isRu ? 'Настройки успешно сохранены!' : 'Settings successfully saved!'));
      await checkStatus();
      setIsConfigOpen(false);
      setInputToken('');
      setInputAccountId('');
      fetchInfrastructure();
    } catch (err: any) {
      console.error('Failed to save Cloudflare config:', err);
      toast.error(err.response?.data?.error || (isRu ? 'Не удалось сохранить настройки' : 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  };

  const fetchInfrastructure = async () => {
    setIsLoading(true);
    setError(null);
    await checkStatus();
    try {
      const [domainData, workerData] = await Promise.all([
        CloudflareService.fetchDomains(),
        CloudflareService.fetchWorkers()
      ]);
      
      setDomains((domainData || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        type: d.type || 'Full',
        plan: d.plan?.name || 'Pro'
      })));

      setWorkers((workerData || []).map((w: any) => ({
        id: w.id,
        name: w.name || w.id,
        status: w.status || 'enabled',
        lastDeployed: w.modified_on || 'Recently',
        routes: w.routes || []
      })));
    } catch (err: any) {
      console.error('Failed to sync with Cloudflare:', err);
      let errorMessage = '';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object' && data.error.message) {
          errorMessage = String(data.error.message);
        } else if (Array.isArray(data.errors) && data.errors[0]?.message) {
          errorMessage = String(data.errors[0].message);
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else {
        errorMessage = err.message || t('syncError');
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchInfrastructure();
    setTimeout(() => setIsSyncing(false), 800);
  };

  const filteredModels = AI_MODELS.filter(model => {
    const name = model?.name || '';
    const provider = model?.provider || '';
    const q = searchQuery || '';
    const matchesSearch = name.toLowerCase().includes(q.toLowerCase()) || 
                         provider.toLowerCase().includes(q.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || model.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-black text-zinc-300 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Cloud className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-white">{t('infrastructureHub')}</h1>
            <p className="text-sm text-zinc-500">{t('infrastructureSub')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
          {[
            { id: 'cloudflare', label: 'Cloudflare', icon: Globe },
            { id: 'models', label: t('neuralModels'), icon: Cpu },
            { id: 'deployment', label: t('deployment'), icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${
                activeTab === tab.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'cloudflare' && (
            <motion.div
              key="cloudflare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Cloudflare Stats */}
              {error && (
                <div className="flex flex-col gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {cfStatus && (
                    <div className="mt-2 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] space-y-1">
                      <div className="text-zinc-500 uppercase font-bold mb-1">Infrastructure Sync Diagnostics:</div>
                      <div className="flex justify-between">
                        <span>CLOUDFLARE_API_TOKEN:</span>
                        <span className={cfStatus.hasToken ? "text-emerald-400" : "text-red-400"}>{cfStatus.hasToken ? "Present" : "Missing"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CLOUDFLARE_ACCOUNT_ID:</span>
                        <span className={cfStatus.hasAccountId ? "text-emerald-400" : "text-red-400"}>{cfStatus.hasAccountId ? "Present" : "Missing"}</span>
                      </div>
                      
                      {error && typeof error === 'string' && (
                        error.toLowerCase().includes('auth') || 
                        error.toLowerCase().includes('token') || 
                        error.toLowerCase().includes('10000') || 
                        error.toLowerCase().includes('401') || 
                        error.toLowerCase().includes('403') || 
                        error.toLowerCase().includes('unauthorized') || 
                        error.toLowerCase().includes('forbidden')
                      ) && (
                        <div className="mt-3 pt-3 border-t border-white/5 text-zinc-400 font-sans space-y-2">
                          <p className="leading-relaxed">
                            {isRu 
                              ? "⚠️ Ошибка авторизации (Authentication / Forbidden). Проверьте правильность токена и ID аккаунта. Убедитесь, что токен имеет разрешения Zone (Read) и Workers (Edit)." 
                              : "⚠️ Cloudflare Authentication/Forbidden Error. Please verify your credentials and ensure the token has Zone (Read) and Workers (Edit) permissions."}
                          </p>
                          <button
                            onClick={() => {
                              setIsConfigOpen(true);
                              setInputToken('');
                              setInputAccountId('');
                            }}
                            className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px] font-semibold rounded-lg transition-all border border-blue-500/10"
                          >
                            {isRu ? 'Обновить ключи Cloudflare' : 'Update Cloudflare Keys'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: t('totalRequests'), value: '1.2M', trend: '+12%', icon: Activity, color: 'text-emerald-400' },
                  { label: t('threatsBlocked'), value: '45.2K', trend: '-5%', icon: Shield, color: 'text-red-400' },
                  { label: t('edgeLatency'), value: '12ms', trend: 'Stable', icon: Zap, color: 'text-amber-400' },
                  { label: t('activeDomains'), value: domains.length, trend: 'Normal', icon: Globe, color: 'text-blue-400' },
                ].map((stat, i) => (
                  <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="text-xs font-mono text-zinc-500">{stat.trend}</span>
                    </div>
                    <p className="text-2xl font-semibold text-white tracking-tight">{stat.value}</p>
                    <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Domains Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">{t('activeDomains')}</h2>
                  <button className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <Plus className="w-4 h-4" /> {t('addDomain')}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {domains.map((domain) => (
                    <div key={domain.id} className="group relative bg-zinc-900/30 border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-zinc-800 border border-white/5 group-hover:border-blue-500/20 transition-all">
                            <Globe className="w-6 h-6 text-zinc-400 group-hover:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-medium text-white">{domain.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-emerald-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {domain.status === 'active' ? t('active') : domain.status}
                              </span>
                              <span className="text-[10px] text-zinc-500 border border-white/10 px-1.5 rounded uppercase">{domain.type}</span>
                              <span className="text-[10px] text-zinc-500 border border-white/10 px-1.5 rounded uppercase">{domain.plan}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-6 flex items-center gap-4 border-t border-white/5 pt-4">
                        <div className="flex-1">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{t('securityLevel')}</p>
                          <p className="text-sm text-zinc-300">{t('wafActive')}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <button className="text-xs text-blue-400 hover:underline">{t('manageDns')}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && domains.length === 0 && (
                    Array(2).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-zinc-900/20 animate-pulse rounded-2xl border border-white/5" />
                    ))
                  )}
                </div>
              </section>

              {/* Workers Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">{t('edgeWorkers')}</h2>
                  <button className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
                    {t('viewLogs')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {workers.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <Server className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-white">{worker.name}</h3>
                          <p className="text-xs text-zinc-500 font-mono">
                            {worker.routes && worker.routes.length > 0 ? worker.routes[0] : t('noRoutesAssigned')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 uppercase">{t('lastDeployed')}</p>
                          <p className="text-xs text-zinc-300">{worker.lastDeployed}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                            {worker.status === 'enabled' ? t('active') : t('disabled')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Models Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder={t('searchModelsPlaceholder').replace('{count}', AI_MODELS.length.toString())}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all border ${
                      selectedCategory === 'All' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/20'
                    }`}
                  >
                    {t('allCategories')}
                  </button>
                  {MODEL_CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all border ${
                        selectedCategory === category ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/20'
                      }`}
                    >
                      {t(category)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Models Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredModels.map((model) => (
                  <motion.div
                    layout
                    key={model.id}
                    className="group flex flex-col bg-zinc-900/30 border border-white/5 rounded-2xl p-4 hover:border-white/20 hover:bg-zinc-900/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{model.provider}</span>
                        <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{model.name}</h3>
                      </div>
                      <div className={`p-1.5 rounded-lg ${model.category.includes('Text') ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                        <Cpu className={`w-4 h-4 ${model.category.includes('Text') ? 'text-blue-400' : 'text-purple-400'}`} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {model.capabilities.map((cap, i) => (
                        <span key={i} className="text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-full border border-white/5">
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 italic">{t(model.category)}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleModel(model)}
                          className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-all ${
                            activeAIModelId === model.id 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20'
                          }`}
                        >
                          {activeAIModelId === model.id ? t('connected') : t('connectModel')}
                        </button>
                        <button className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                          {t('details')} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {filteredModels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
                  <p>{t('noModelsFound')}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'deployment' && (
            <motion.div
              key="deployment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <h2 className="text-2xl font-semibold text-white mb-2">{t('appTitle')} Deployment</h2>
                  <p className="text-zinc-500 text-sm">{t('orchestratingEdge')}</p>
                </div>
                
                <div className="p-8 space-y-8">
                  {/* Deployment Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> {t('productionDomains')}
                      </h3>
                      <div className="space-y-3">
                        {['mnmllpulse.com', 'pulse-labs.org'].map((domain) => (
                          <div key={domain} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-white">{domain}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[10px] text-emerald-400 uppercase font-bold">Routed</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" /> {t('deploymentManifest')}
                      </h3>
                      <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">{t('currentVersion')}</span>
                          <span className="text-white font-mono">v1.2.4-stable</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">{t('edgeProvider')}</span>
                          <span className="text-white">Cloudflare Global Edge</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">{t('lastBroadcast')}</span>
                          <span className="text-white">12 mins ago</span>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2 }}
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 text-center">{t('systemSyncComplete')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        {t('liveOnEdge')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        {t('dnsSecured')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button className="flex-1 md:flex-none px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium border border-white/10 transition-all">
                        {t('rollbackTo').replace('{version}', 'v1.2.3')}
                      </button>
                      <button className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                        <Zap className="w-3.5 h-3.5 fill-current" /> {t('deployToCustom')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'SSL/TLS Mode', value: 'Full (Strict)', icon: Lock },
                  { title: 'WAF Security', value: 'Aggressive', icon: Shield },
                  { title: 'Purge Cache', value: 'Instant', icon: RefreshCw },
                ].map((item, i) => (
                  <button key={i} className="flex items-center gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-2xl hover:border-white/20 transition-all text-left">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{item.title}</p>
                      <p className="text-sm text-zinc-300">{item.value}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Configuration Footer */}
      <footer className="p-4 bg-zinc-950/80 border-t border-white/5 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">API Token</span>
              <div className="flex items-center gap-2">
                <Lock className={`w-3 h-3 ${cfStatus?.hasToken ? 'text-emerald-500' : 'text-zinc-600'}`} />
                <span className="text-xs font-mono text-zinc-400">
                  {cfStatus?.hasToken ? (cfStatus.tokenPrefix ? `${cfStatus.tokenPrefix}••••••••` : '••••••••••••••••') : (isRu ? 'Не задан' : 'Not configured')}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Account ID</span>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                {cfStatus?.hasAccountId ? (cfStatus.accountIdPrefix ? `${cfStatus.accountIdPrefix}••••••••` : '••••••••••••••••') : (isRu ? 'Не задан' : 'Not configured')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsConfigOpen(true);
                setInputToken('');
                setInputAccountId('');
              }}
              className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-xs font-medium hover:bg-zinc-700 hover:border-white/20 transition-all active:scale-95"
            >
              {t('configureKeys')}
            </button>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors shadow-lg shadow-blue-900/20 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> 
              {isSyncing ? t('syncing') : t('syncCloudflare')}
            </button>
          </div>
        </div>
      </footer>

      {/* Cloudflare Keys Setup Modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-blue-500 animate-pulse" />
                  <h3 className="text-sm font-semibold text-white tracking-wide font-mono uppercase">
                    {isRu ? 'Настройка интеграции Cloudflare' : 'Cloudflare Key Configuration'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold mb-2">
                    {isRu ? 'Cloudflare API Token' : 'Cloudflare API Token'}
                  </label>
                  <div className="relative">
                    <input
                      type={showTokenInput ? 'text' : 'password'}
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      placeholder={cfStatus?.hasToken ? (isRu ? '•••••••••••••••• (Оставьте пустым для сохранения текущего)' : '•••••••••••••••• (Leave blank to keep current)') : 'cl_token_...'}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokenInput(!showTokenInput)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showTokenInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500 font-sans">
                    {isRu 
                      ? 'Токен с разрешениями: Account.Cloudflare Workers (Edit), Zone.Zone (Read).' 
                      : 'Create at My Profile -> API Tokens with Zone.Zone (Read) and Account.Workers (Edit) permissions.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold mb-2">
                    {isRu ? 'Cloudflare Account ID' : 'Cloudflare Account ID'}
                  </label>
                  <input
                    type="text"
                    value={inputAccountId}
                    onChange={(e) => setInputAccountId(e.target.value)}
                    placeholder={cfStatus?.hasAccountId ? (isRu ? '•••••••••••••••• (Оставьте пустым для сохранения текущего)' : '•••••••••••••••• (Leave blank to keep current)') : 'cf_acc_id_...'}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500 font-sans">
                    {isRu 
                      ? 'Ваш Account ID (отображается в адресной строке или в правой панели дашборда Cloudflare).' 
                      : 'Your Cloudflare Account ID (found on your dashboard sidebar or inside URLs).'}
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    {isRu ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold tracking-wide hover:shadow-lg hover:shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? (isRu ? 'Сохранение...' : 'Saving...') : (isRu ? 'Сохранить ключи' : 'Save Keys')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfrastructureHub;
