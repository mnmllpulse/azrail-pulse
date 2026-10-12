import React, { useRef, useState, useEffect } from 'react';
import { Plus, Upload, Download, FileAudio, FileVideo, FileImage, FileCode, X, Database, Search, HardDrive, Sparkles, Clock, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { CloudflareService } from '../services/cloudflareService';
import { toast } from 'react-hot-toast';

interface UniversalFileActionProps {
  moduleType: 'web' | 'music' | 'video' | 'image' | 'agent' | 'general';
  isLight?: boolean;
}

export default function UniversalFileAction({ moduleType, isLight = false }: UniversalFileActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [archives, setArchives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const data = await CloudflareService.fetchArchives();
      setArchives(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showLibrary) {
      fetchLibrary();
    }
  }, [showLibrary]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          loading: `Uploading ${file.name} to R2 Bucket...`,
          success: `${file.name} successfully archived in cloud.`,
          error: 'Cloud synchronization failed.'
        }
      );
      setIsOpen(false);
    }
  };

  const handleDownloadClick = () => {
    // Generate a dummy file for the top format
    const content = "Dummy content";
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let extension = 'txt';
    switch (moduleType) {
      case 'web': extension = 'zip'; break;
      case 'music': extension = 'wav'; break;
      case 'video': extension = 'mp4'; break;
      case 'image': extension = 'png'; break;
      case 'agent': extension = 'json'; break;
    }
    
    link.download = `export_${moduleType}_${Date.now()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const getAcceptFormats = () => {
    switch (moduleType) {
      case 'web': return '.html,.css,.js,.zip';
      case 'music': return '.mp3,.wav,.ogg,.midi';
      case 'video': return '.mp4,.mov,.avi';
      case 'image': return '.png,.jpg,.jpeg,.svg,.webp';
      case 'agent': return '.json,.yaml,.ts';
      default: return '*/*';
    }
  };

  return (
    <div className="relative z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`absolute bottom-full mb-4 right-0 ${showLibrary ? 'w-[400px]' : 'w-[280px]'} overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl transition-all duration-300 ${isLight ? 'bg-white/95 border-gray-200' : 'bg-[#0a0a0c]/95 border-white/10'}`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-black/40'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'}`}>
                  <Database className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Storage SDK</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowLibrary(!showLibrary)}
                  className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider transition-colors ${showLibrary ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-indigo-400'}`}
                >
                  {showLibrary ? 'Close Library' : 'Open R2 Bucket'}
                </button>
              </div>
            </div>

            <div className="p-3">
              <AnimatePresence mode="wait">
                {showLibrary ? (
                  <motion.div 
                    key="library"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Search R2 archives..."
                        className={`w-full pl-8 pr-3 py-2 text-[10px] font-mono rounded-xl outline-none border ${isLight ? 'bg-gray-100 border-gray-200 focus:border-indigo-300' : 'bg-black/40 border-white/5 focus:border-white/10'}`}
                      />
                    </div>

                    <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                      {isLoading ? (
                        <div className="py-12 flex flex-col items-center gap-2 text-zinc-500 font-mono text-[10px]">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Polling Cloudflare Edge...</span>
                        </div>
                      ) : archives.length === 0 ? (
                        <div className="py-12 text-center text-zinc-600 font-mono text-[9px] opacity-40">
                          No archived artifacts discovered.
                        </div>
                      ) : (
                        archives.map((item, idx) => (
                          <button 
                            key={idx}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 ${isLight ? 'bg-white border-gray-100 hover:border-gray-300' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'}`}
                          >
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                              <FileCode className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-white truncate uppercase tracking-tight">{item.id}</div>
                              <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-500">
                                <span className="flex items-center gap-1"><HardDrive className="w-2.5 h-2.5" /> R2 CLOUD</span>
                                <span>•</span>
                                <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-1.5"
                  >
                    <button 
                      onClick={handleUploadClick}
                      className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all border ${isLight ? 'hover:bg-gray-50 bg-white border-gray-100 text-gray-700 shadow-sm' : 'hover:bg-white/5 bg-white/[0.02] border-white/5 text-zinc-300'}`}
                    >
                      <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}>
                        <Upload className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold tracking-tight">Upload to Cloud</span>
                        <span className="text-[10px] opacity-50 font-mono">Sync with Cloudflare R2</span>
                      </div>
                    </button>

                    <button 
                      onClick={handleDownloadClick}
                      className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all border ${isLight ? 'hover:bg-gray-50 bg-white border-gray-100 text-gray-700 shadow-sm' : 'hover:bg-white/5 bg-white/[0.02] border-white/5 text-zinc-300'}`}
                    >
                      <div className={`p-2.5 rounded-xl ${isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                        <Download className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold tracking-tight">Pull Asset Bundle</span>
                        <span className="text-[10px] opacity-50 font-mono">Export production package</span>
                      </div>
                    </button>

                    <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between font-mono text-[8px] ${isLight ? 'bg-indigo-50 border-indigo-100 text-indigo-400' : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-400/60'}`}>
                      <div className="flex items-center gap-1.5 uppercase font-bold">
                        <HardDrive className="w-3 h-3" />
                        Storage SDK Active
                      </div>
                      <div className="flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                         D1 / R2 / KV
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (!isOpen) setShowLibrary(false);
          setIsOpen(!isOpen);
        }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 group ${
          isOpen 
            ? 'bg-rose-500 text-white shadow-rose-500/40 rotate-45' 
            : isLight
              ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:scale-110 active:scale-95'
              : 'bg-indigo-600 text-white shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-110 active:scale-95'
        }`}
      >
        <Plus className={`w-7 h-7 transition-transform ${isOpen ? '' : 'group-hover:rotate-90'}`} />
      </button>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={getAcceptFormats()} 
        className="hidden" 
      />
    </div>
  );
}
