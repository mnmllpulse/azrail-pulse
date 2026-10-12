import React from 'react';
import { Shield, Key, ShieldCheck, Lock, Fingerprint, RefreshCw } from 'lucide-react';

interface AuthGuardProps {
  t: (en: string, ru?: string) => string;
}

export function AuthGuard({ t }: AuthGuardProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          {t('Auth Guard Pro', 'Защита и Авторизация')}
        </h5>
        <div className="text-[8px] font-mono text-emerald-400 uppercase">SECURITY: LEVEL 5</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-1 gap-2">
          {[
            { id: 'jwt', label: 'JWT / Session', status: 'Active', icon: <Key className="w-3.5 h-3.5" /> },
            { id: 'oauth', label: 'Multi-Provider OAuth', status: 'Ready', icon: <Fingerprint className="w-3.5 h-3.5" /> },
            { id: 'rbac', label: 'RBAC (Role Based)', status: 'Active', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'mfa', label: 'Two-Factor (2FA)', status: 'Optional', icon: <Lock className="w-3.5 h-3.5" /> },
          ].map(module => (
            <div key={module.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-emerald-500/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  {module.icon}
                </div>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight">{module.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-mono uppercase font-bold ${module.status === 'Active' ? 'text-emerald-400' : 'text-zinc-600'}`}>{module.status}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${module.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Threat Detection</span>
            <span className="text-emerald-400">Stable</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/40 w-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
        <ShieldCheck className="w-3.5 h-3.5" /> {t('Apply Auth Protocol', 'Применить Протокол')}
      </button>
    </div>
  );
}
