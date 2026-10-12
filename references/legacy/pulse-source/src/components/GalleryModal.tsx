import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, Search, HardDrive, File, Folder, Image as ImageIcon, Video, Music, MoreVertical, Trash2, Cloud, Grid, List } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GalleryModal({ isOpen, onClose, isLight }: { isOpen: boolean, onClose: () => void, isLight: boolean }) {
  const { t } = useLanguage();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${isLight ? 'bg-white/80 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'}`}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-5xl h-[80vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-[#0A0A0A] border-white/10'}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
                 <Folder className="w-4 h-4" />
               </div>
               <h2 className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Gallery & Storage</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center p-1 rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                 <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? (isLight ? 'bg-white shadow-sm' : 'bg-white/10 text-white') : 'text-gray-400'}`}>
                   <Grid className="w-4 h-4" />
                 </button>
                 <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? (isLight ? 'bg-white shadow-sm' : 'bg-white/10 text-white') : 'text-gray-400'}`}>
                   <List className="w-4 h-4" />
                 </button>
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className={`w-48 shrink-0 flex flex-col border-r overflow-y-auto ${isLight ? 'border-gray-200 bg-gray-50/50' : 'border-white/10 bg-white/5'}`}>
               <div className="p-4 space-y-1">
                 <div className={`text-[10px] font-mono uppercase tracking-widest px-3 py-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Locations</div>
                 <SidebarItem icon={<HardDrive />} label="Local Drive" active isLight={isLight} />
                 <SidebarItem icon={<Cloud />} label="Cloud Sync" isLight={isLight} />
                 
                 <div className={`text-[10px] font-mono uppercase tracking-widest px-3 py-2 mt-4 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Filters</div>
                 <SidebarItem icon={<ImageIcon />} label="Images" isLight={isLight} />
                 <SidebarItem icon={<Video />} label="Videos" isLight={isLight} />
                 <SidebarItem icon={<Music />} label="Audio" isLight={isLight} />
                 <SidebarItem icon={<File />} label="Documents" isLight={isLight} />
                 
                 <div className={`text-[10px] font-mono uppercase tracking-widest px-3 py-2 mt-4 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Manage</div>
                 <SidebarItem icon={<Trash2 />} label="Trash" isLight={isLight} />
               </div>
               
               {/* Storage indicator */}
               <div className={`mt-auto p-4 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                 <div className={`flex justify-between items-center mb-2 text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
                   <span>Storage</span>
                   <span>45%</span>
                 </div>
                 <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-black'}`}>
                   <div className="h-full bg-indigo-500 w-[45%]" />
                 </div>
                 <div className={`mt-2 text-[10px] text-center ${isLight ? 'text-gray-400' : 'text-white/30'}`}>4.5 GB / 10 GB</div>
               </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
               {/* Toolbar */}
               <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                  <div className="relative w-64">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
                    <input 
                      type="text" 
                      placeholder="Search files, AI tags..." 
                      className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border outline-none transition-colors ${isLight ? 'bg-white border-gray-200 focus:border-indigo-400 text-gray-800' : 'bg-black border-white/10 focus:border-indigo-500/50 text-[#E0E0E0]'}`}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' : 'bg-black border-white/10 hover:bg-white/5 text-gray-300'}`}>
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors bg-indigo-600 text-white hover:bg-indigo-500`}>
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                  </div>
               </div>
               
               {/* Files Grid */}
               <div className="flex-1 overflow-y-auto p-6">
                 {view === 'grid' ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     <FileCard type="image" name="Cyberpunk_City.png" size="2.4 MB" date="Today" isLight={isLight} />
                     <FileCard type="video" name="Hero_Sequence.mp4" size="45 MB" date="Yesterday" isLight={isLight} />
                     <FileCard type="music" name="Synth_Loop_01.wav" size="12 MB" date="2 days ago" isLight={isLight} />
                     <FileCard type="file" name="System_Prompt.txt" size="14 KB" date="1 week ago" isLight={isLight} />
                   </div>
                 ) : (
                   <div className="flex flex-col gap-2">
                     <FileRow type="image" name="Cyberpunk_City.png" size="2.4 MB" date="Today" isLight={isLight} />
                     <FileRow type="video" name="Hero_Sequence.mp4" size="45 MB" date="Yesterday" isLight={isLight} />
                     <FileRow type="music" name="Synth_Loop_01.wav" size="12 MB" date="2 days ago" isLight={isLight} />
                     <FileRow type="file" name="System_Prompt.txt" size="14 KB" date="1 week ago" isLight={isLight} />
                   </div>
                 )}
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SidebarItem({ icon, label, active, isLight }: any) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? (isLight ? 'bg-indigo-50 text-indigo-600 font-medium' : 'bg-indigo-500/20 text-indigo-400 font-medium') : (isLight ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-[#E0E0E0]/60 hover:bg-white/5 hover:text-white')}`}>
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      {label}
    </button>
  );
}

function FileCard({ type, name, size, date, isLight }: any) {
  const Icon = type === 'image' ? ImageIcon : type === 'video' ? Video : type === 'music' ? Music : File;
  
  return (
    <div className={`group rounded-xl border flex flex-col overflow-hidden cursor-pointer transition-all ${isLight ? 'bg-white border-gray-200 hover:border-indigo-400 shadow-sm' : 'bg-[#050505] border-white/10 hover:border-indigo-500/50'}`}>
      <div className={`aspect-square flex items-center justify-center border-b ${isLight ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-black/50 border-white/10 text-white/20'} relative`}>
        <Icon className="w-10 h-10" />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className={`p-1.5 rounded-lg ${isLight ? 'bg-white text-gray-500 hover:text-gray-900 shadow-sm' : 'bg-black text-white/60 hover:text-white'}`}>
             <MoreVertical className="w-4 h-4" />
           </button>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1">
        <span className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{name}</span>
        <div className={`flex items-center justify-between text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
          <span>{size}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

function FileRow({ type, name, size, date, isLight }: any) {
  const Icon = type === 'image' ? ImageIcon : type === 'video' ? Video : type === 'music' ? Music : File;
  
  return (
    <div className={`group flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${isLight ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-[#050505] border-white/10 hover:bg-white/5'}`}>
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg ${isLight ? 'bg-gray-100 text-gray-500' : 'bg-black text-white/40'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{name}</div>
        <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{date}</div>
      </div>
      <div className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{size}</div>
      <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
}
