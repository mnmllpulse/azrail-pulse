import React from 'react';
import { Database, SearchCode, GitBranch, RefreshCw, Layers } from 'lucide-react';

interface DataForgeProps {
  t: (en: string, ru?: string) => string;
}

export function DataForge({ t }: DataForgeProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          {t('Data Schema Forge', 'Кузница Схем Данных')}
        </h5>
        <div className="text-[8px] font-mono text-blue-400 uppercase">PRISMA / DRIZZLE READY</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        <div className="bg-black/60 rounded-xl border border-white/5 p-4 font-mono text-[9px] text-zinc-400 space-y-2">
          <div className="text-blue-400 font-bold uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Current Schema</div>
          <div className="text-zinc-500">model <span className="text-white">User</span> &#123;</div>
          <div className="pl-4">id String @id @default(cuid())</div>
          <div className="pl-4">email String @unique</div>
          <div className="pl-4">posts Post[]</div>
          <div className="text-zinc-500">&#125;</div>
          <div className="text-zinc-500 mt-2">model <span className="text-white">Post</span> &#123;</div>
          <div className="pl-4">id String @id @default(cuid())</div>
          <div className="pl-4">title String</div>
          <div className="pl-4">author User @relation(fields: [authorId], references: [id])</div>
          <div className="text-zinc-500">&#125;</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-blue-500/30 transition-all flex flex-col gap-1 text-left">
            <SearchCode className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase">Inspect API</span>
          </button>
          <button className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-blue-500/30 transition-all flex flex-col gap-1 text-left">
            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase">Sync DB</span>
          </button>
        </div>
      </div>

      <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
        <RefreshCw className="w-3.5 h-3.5" /> {t('Regenerate Schema', 'Пересоздать Схему')}
      </button>
    </div>
  );
}
