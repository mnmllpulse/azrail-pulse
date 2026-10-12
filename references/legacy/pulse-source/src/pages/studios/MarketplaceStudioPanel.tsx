import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Search, 
  Download, 
  Star, 
  Sparkles, 
  Music, 
  Code, 
  Sliders, 
  Layers, 
  Check, 
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketItem {
  id: string;
  name: string;
  type: 'workflow' | 'style' | 'midi' | 'component';
  author: string;
  rating: number;
  downloads: number;
  price: string;
  description: string;
  icon: any;
}

export default function MarketplaceStudioPanel({ isLight }: { isLight: boolean }) {
  const [filter, setFilter] = useState<'all' | 'workflow' | 'style' | 'midi' | 'component'>('all');
  const [search, setSearch] = useState('');
  const [imported, setImported] = useState<Record<string, boolean>>({});

  const items: MarketItem[] = [
    { id: '1', name: 'Cyberpunk Red Neon LoRA', type: 'style', author: 'andrik494', rating: 4.9, downloads: 412, price: 'Free', description: 'Cinematic saturated crimson neon lighting with brutalist framing.', icon: <Sparkles className="text-red-400 w-4 h-4" /> },
    { id: '2', name: 'Ambient Lo-Fi MIDI Generator', type: 'midi', author: 'Sandalphon', rating: 4.8, downloads: 182, price: '$5.00', description: 'Generates progressive, warm chord progressions in key of D Minor.', icon: <Music className="text-amber-400 w-4 h-4" /> },
    { id: '3', name: 'Telegram-to-Discord Sentiment Router', type: 'workflow', author: 'Uriel', rating: 4.7, downloads: 98, price: 'Free', description: 'Automated cognitive sentiment sorting pipeline workflow.', icon: <Sliders className="text-indigo-400 w-4 h-4" /> },
    { id: '4', name: 'Fluid Glassmorphism UI Kit', type: 'component', author: 'Gabriel', rating: 5.0, downloads: 541, price: '$12.00', description: 'Interactive tailwind components utilizing backdrop filters and deep shadows.', icon: <Code className="text-emerald-400 w-4 h-4" /> }
  ];

  const handleImport = (id: string, name: string) => {
    setImported(prev => ({ ...prev, [id]: true }));
    toast.success(`Successfully integrated asset: ${name}`);
  };

  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6 font-mono">
      {/* Search and category filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets, LoRAs, presets..."
            className="w-full bg-black/60 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'workflow', label: 'Pipelines' },
            { id: 'style', label: 'Style DNA' },
            { id: 'midi', label: 'MIDI' },
            { id: 'component', label: 'Components' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all border ${
                filter === cat.id
                  ? (isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-900 font-bold' : 'bg-white/10 border-white/10 text-white font-bold')
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`p-5 border rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden ${
            isLight ? 'bg-white border-zinc-200' : 'bg-zinc-950/40 border-white/5'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-zinc-900 border border-white/5 rounded-xl">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300">{item.name}</h4>
                    <span className="text-[9px] text-indigo-400 uppercase font-mono">By {item.author}</span>
                  </div>
                </div>

                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                  {item.price}
                </span>
              </div>

              <p className="text-[10px] text-zinc-500 leading-normal mt-2">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.03] pt-3 text-[9px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {item.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {item.downloads} downloads
                </span>
              </div>

              <button
                onClick={() => handleImport(item.id, item.name)}
                disabled={imported[item.id]}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 border ${
                  imported[item.id]
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white'
                }`}
              >
                {imported[item.id] ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Imported</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3" />
                    <span>Purchase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
