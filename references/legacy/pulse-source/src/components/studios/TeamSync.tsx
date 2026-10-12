import React from 'react';
import { Users, Wifi, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

interface TeamSyncProps {
  t: (en: string, ru?: string) => string;
}

export function TeamSync({ t }: TeamSyncProps) {
  const members = [
    { name: 'Alex', role: 'Architect', status: 'online', color: 'bg-emerald-500' },
    { name: 'Sarah', role: 'Designer', status: 'online', color: 'bg-blue-500' },
    { name: 'Metatron', role: 'AI Kernel', status: 'active', color: 'bg-purple-500' },
    { name: 'David', role: 'DevOps', status: 'offline', color: 'bg-zinc-600' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          {t('Elite Team Sync', 'Командная Синхронизация')}
        </h5>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-mono text-emerald-400 font-bold">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="grid grid-cols-1 gap-2">
          {members.map((member, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-[10px] font-bold text-white shadow-lg`}>
                  {member.name[0]}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-300 uppercase">{member.name}</div>
                  <div className="text-[8px] font-mono text-zinc-500 uppercase">{member.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-mono uppercase font-bold ${member.status === 'online' || member.status === 'active' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {member.status}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'online' || member.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-500">
            <span>Collaborative Buffer</span>
            <span className="text-indigo-400">Locked</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center px-3 text-[10px] text-zinc-500 italic">
              {t('Typing message...', 'Печатает сообщение...')}
            </div>
            <button className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase">RBAC Active</span>
            <span className="text-[8px] text-zinc-500 leading-tight">Zero-trust permissions enforced.</span>
          </div>
          <div className="p-3 rounded-xl bg-white/3 border border-white/5 flex flex-col gap-1">
            <Zap className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase">Conflict Res</span>
            <span className="text-[8px] text-zinc-500 leading-tight">CRDT-based automatic merging.</span>
          </div>
        </div>
      </div>

      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
        <Wifi className="w-3.5 h-3.5" /> {t('Broadcast State', 'Транслировать Стейт')}
      </button>
    </div>
  );
}
