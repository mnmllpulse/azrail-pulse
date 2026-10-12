import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Grid, List, Filter, Download, Share2, Heart, 
  Video, Music, Image as ImageIcon, Layout, Cpu, 
  ArrowLeft, ArrowRight, MoreVertical, Folder, Star,
  Clock, Hash, Plus, ChevronDown, Check, Globe, HardDrive, ChevronRight
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Tooltip from '../components/Tooltip';

type GalleryCategory = 'all' | 'video' | 'music' | 'image' | 'web' | 'agent' | 'user' | 'prompt' | 'social' | 'template' | 'screenshot';

interface GalleryItem {
  id: string;
  type: GalleryCategory;
  title: string;
  author: string;
  image: string;
  stats: string;
  tags: string[];
  isUser?: boolean;
  isFeatured?: boolean;
}

const GALLERY_DATA: GalleryItem[] = [
  // Featured Items (Circular Carousel)
  { id: 'f1', type: 'video', title: 'Cyberpunk Drift', author: '@visualizer', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800&auto=format&fit=crop', stats: '1.1M Views', tags: ['Neon', 'Cinematic'], isFeatured: true },
  { id: 'f2', type: 'music', title: 'Neon Nights Synth', author: '@synth_master', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop', stats: '2.4M Plays', tags: ['80s', 'Retro'], isFeatured: true },
  { id: 'f3', type: 'template', title: 'SaaS Dashboard Pro', author: '@ui_forge', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop', stats: '12K Installs', tags: ['SaaS', 'Admin'], isFeatured: true },
  { id: 'f4', type: 'social', title: 'Neo-Social Interface', author: '@web_studio', image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800&auto=format&fit=crop', stats: 'Live Demo', tags: ['Social', 'Glassmorphism'], isFeatured: true },
  
  // Standard Items
  { id: '1', type: 'video', title: 'Deep Space Orbit', author: '@cosmo_render', image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=400&auto=format&fit=crop', stats: '800K Views', tags: ['Space', '4K'] },
  { id: '2', type: 'music', title: 'Lofi Study Beats', author: '@chill_labs', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=400&auto=format&fit=crop', stats: '5M Plays', tags: ['Lofi', 'Study'] },
  { id: '3', type: 'image', title: 'Abstract Fluid 4K', author: '@visuals_hq', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop', stats: '45K Downloads', tags: ['Abstract', '4K'] },
  { id: '4', type: 'template', title: 'E-Commerce Minimal', author: '@web_studio', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop', stats: '8.5K Installs', tags: ['Store', 'Clean'] },
  { id: '5', type: 'agent', title: 'Code Assistant v2', author: '@ai_forge', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=400&auto=format&fit=crop', stats: '500K Users', tags: ['Dev', 'AI'] },
  { id: '6', type: 'prompt', title: 'Hyper-Realistic Portrait', author: '@prompt_master', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop', stats: 'Used 2K times', tags: ['V6', 'Portrait'] },
  { id: '7', type: 'screenshot', title: 'Project Zenith Preview', author: 'System', image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=400&auto=format&fit=crop', stats: 'Last Session', tags: ['Preview'] },
  { id: 'u1', type: 'web', title: 'My Portfolio Draft', author: 'Me', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop', stats: 'Draft', tags: ['Personal'], isUser: true },
  { id: 'u2', type: 'music', title: 'Summer Lo-Fi Loop', author: 'Me', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=400&auto=format&fit=crop', stats: 'Saved', tags: ['Chill'], isUser: true },
];

export default function MainGallery() {
  const navigate = useNavigate();
  const { isLight } = useOutletContext<{ isLight: boolean }>();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featuredItems = GALLERY_DATA.filter(item => item.isFeatured);
  
  const filteredItems = GALLERY_DATA.filter(item => {
    const matchesCategory = activeCategory === 'all' || 
                           (activeCategory === 'user' ? item.isUser : item.type === activeCategory);
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories: { id: GalleryCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Assets', icon: <Globe className="w-4 h-4" /> },
    { id: 'user', label: 'User Projects', icon: <Folder className="w-4 h-4" /> },
    { id: 'template', label: 'Site Templates', icon: <Layout className="w-4 h-4" /> },
    { id: 'social', label: 'Social UI', icon: <Share2 className="w-4 h-4" /> },
    { id: 'music', label: 'Audio Tracks', icon: <Music className="w-4 h-4" /> },
    { id: 'video', label: 'Video Clips', icon: <Video className="w-4 h-4" /> },
    { id: 'image', label: 'Pictures', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'prompt', label: 'Prompts', icon: <Cpu className="w-4 h-4" /> },
    { id: 'screenshot', label: 'Screenshots', icon: <HardDrive className="w-4 h-4" /> },
  ];

  const nextFeatured = () => setFeaturedIndex((prev) => (prev + 1) % featuredItems.length);
  const prevFeatured = () => setFeaturedIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Header & Featured Section */}
      <div className={`flex flex-col gap-8 p-8 rounded-[2rem] border transition-all ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-zinc-950 border-white/5 shadow-2xl'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`p-3 rounded-2xl transition-all border ${isLight ? 'hover:bg-gray-100 border-gray-200' : 'hover:bg-white/10 border-white/10'}`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>Asset Universe</h1>
              <p className={`text-xs font-mono uppercase tracking-[0.2em] ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>Omni-Channel Gallery & Storage</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isLight ? 'text-gray-400 group-focus-within:text-indigo-600' : 'text-white/40 group-focus-within:text-indigo-400'}`} />
              <input 
                type="text" 
                placeholder="Find anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 pr-6 py-3 text-sm rounded-2xl border outline-none transition-all w-80 ${
                  isLight ? 'bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5' : 'bg-white/5 border-white/10 focus:bg-white/10 focus:border-indigo-500/50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Circular / 3D Featured Showcase */}
        <div className="relative h-[650px] w-full flex items-center justify-center perspective-2000 overflow-hidden py-12">
          <div className="relative w-full h-full flex items-center justify-center max-w-[1400px]">
            {featuredItems.map((item, idx) => {
              const total = featuredItems.length;
              const diff = (idx - featuredIndex + total) % total;
              
              let x = 0;
              let scale = 0.4;
              let opacity = 0;
              let zIndex = 0;
              let rotateY = 0;
              let brightness = 50;

              if (diff === 0) { // Center
                x = 0; scale = 1.15; opacity = 1; zIndex = 100; rotateY = 0; brightness = 100;
              } else if (diff === 1) { // Right 1
                x = 450; scale = 0.85; opacity = 0.7; zIndex = 80; rotateY = -35; brightness = 70;
              } else if (diff === total - 1) { // Left 1
                x = -450; scale = 0.85; opacity = 0.7; zIndex = 80; rotateY = 35; brightness = 70;
              } else if (diff === 2) { // Right 2
                x = 800; scale = 0.65; opacity = 0.4; zIndex = 60; rotateY = -50; brightness = 50;
              } else if (diff === total - 2) { // Left 2
                x = -800; scale = 0.65; opacity = 0.4; zIndex = 60; rotateY = 50; brightness = 50;
              } else {
                opacity = 0;
                x = diff < total / 2 ? 1200 : -1200;
              }

              return (
                <motion.div
                  key={item.id}
                  initial={false}
                  animate={{
                    x,
                    scale,
                    opacity,
                    zIndex,
                    rotateY,
                    filter: `brightness(${brightness}%)`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 24
                  }}
                  className="absolute w-[700px] h-[500px] cursor-pointer"
                  onClick={() => setFeaturedIndex(idx)}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`relative w-full h-full rounded-[3rem] overflow-hidden border-4 transition-all duration-500 group ${
                    diff === 0 
                      ? (isLight ? 'border-indigo-500 shadow-[0_40px_80px_-15px_rgba(79,70,229,0.3)] scale-100' : 'border-indigo-500 shadow-[0_40px_100px_-20px_rgba(99,102,241,0.5)] scale-100')
                      : (isLight ? 'border-gray-200' : 'border-white/10')
                  }`}>
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-12 transition-all duration-700 ${diff === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-4 py-1.5 bg-indigo-600 text-white text-[11px] font-mono rounded-full uppercase tracking-[0.2em] font-bold shadow-lg shadow-indigo-500/30">Prime Tier</span>
                        <span className="px-4 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[11px] font-mono rounded-full uppercase tracking-[0.2em] border border-white/10">Collection Elite</span>
                      </div>
                      <h2 className="text-5xl font-extrabold text-white mb-3 tracking-tighter leading-none">{item.title}</h2>
                      <div className="flex items-center gap-6 text-white/70 text-sm mb-8 font-mono uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Star className="w-4 h-4 text-indigo-400 fill-indigo-400" /> Platinum</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>Designer: {item.author}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button className="px-10 py-4 bg-white text-black text-xs font-black rounded-[1.5rem] hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/40 flex items-center gap-2">
                          Access Metadata
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button className="p-4 bg-white/10 backdrop-blur-2xl text-white rounded-[1.5rem] hover:bg-white/20 transition-all border border-white/10 group-hover:rotate-12">
                          <Share2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Nav Buttons */}
          <button 
            onClick={prevFeatured} 
            className="absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-black/60 transition-all z-40 flex items-center justify-center border border-white/10 hover:scale-110 active:scale-90 shadow-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextFeatured} 
            className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-black/60 transition-all z-40 flex items-center justify-center border border-white/10 hover:scale-110 active:scale-90 shadow-2xl"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? (isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/5')
                  : (isLight ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-300' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20')
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-12">
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={viewMode === 'grid' 
                  ? `group flex flex-col rounded-2xl border overflow-hidden transition-all relative ${isLight ? 'bg-white border-gray-200 hover:border-indigo-400 shadow-sm hover:shadow-xl' : 'bg-zinc-900 border-white/5 hover:border-indigo-500/40 shadow-black/40 hover:shadow-indigo-500/10'}`
                  : `group flex items-center gap-4 p-3 rounded-2xl border transition-all ${isLight ? 'bg-white border-gray-200 hover:border-indigo-400 shadow-sm' : 'bg-zinc-900 border-white/5 hover:border-indigo-500/40'}`
                }
              >
                {/* Thumbnail */}
                <div className={viewMode === 'grid' ? "aspect-video w-full relative overflow-hidden" : "w-24 h-16 rounded-lg overflow-hidden shrink-0"}>
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-mono uppercase tracking-widest text-white border border-white/10">
                      {item.type}
                    </span>
                    {item.isUser && (
                      <span className="px-2 py-0.5 bg-emerald-500/80 backdrop-blur-md rounded-md text-[8px] font-mono uppercase tracking-widest text-white">
                        Project
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className={viewMode === 'grid' ? "p-4 flex flex-col gap-2" : "flex-1 flex flex-col gap-1 min-w-0"}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{item.title}</h3>
                    <button className={`p-1 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-white/10 text-white/20'}`}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${isLight ? 'text-gray-400' : 'text-white/40'}`}>{item.author}</span>
                    <span className={`w-1 h-1 rounded-full ${isLight ? 'bg-gray-300' : 'bg-white/10'}`} />
                    <span className={`text-[10px] font-mono font-bold uppercase ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{item.stats}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.map(tag => (
                      <span key={tag} className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-white/30'}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Grid */}
                {viewMode === 'grid' && (
                  <div className={`mt-auto flex items-center p-2 gap-1 border-t ${isLight ? 'border-gray-100 bg-gray-50/50' : 'border-white/5 bg-black/20'}`}>
                    <button className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase font-bold transition-colors ${
                      isLight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}>
                      Open in Studio
                    </button>
                    <button className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-white/60'}`}>
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Search className="w-12 h-12" />
            <p className="text-sm font-mono uppercase tracking-widest">No assets found in this sector</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors z-50"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
