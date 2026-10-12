import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PromptGenome {
  subject: string;
  style: string;
  lighting: string;
  mood: string;
  lens: string;
  composition: string;
  artist: string;
  negativePrompt: string;
  seed: number;
  cfg: number;
  aspectRatio: string;
}

export interface Project {
  id: string;
  name: string;
  folders: string[];
  assets: string[];
  history: { id: string; prompt: string; imageUrl: string; timestamp: string }[];
}

export interface ImageStudioContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  promptGenome: PromptGenome;
  setPromptGenome: React.Dispatch<React.SetStateAction<PromptGenome>>;
  activeModel: string;
  setActiveModel: (m: string) => void;
  timeline: { id: string; frame: number; previewUrl: string; duration: number }[];
  setTimeline: React.Dispatch<React.SetStateAction<any[]>>;
  queue: { id: string; label: string; progress: number; status: 'queued' | 'rendering' | 'completed' }[];
  setQueue: React.Dispatch<React.SetStateAction<any[]>>;
  consoleLogs: { text: string; timestamp: string; level: 'info' | 'warn' | 'success' }[];
  addLog: (text: string, level?: 'info' | 'warn' | 'success') => void;
  activeBottomTab: 'timeline' | 'queue' | 'versions' | 'console' | 'ai';
  setActiveBottomTab: (tab: 'timeline' | 'queue' | 'versions' | 'console' | 'ai') => void;
  aiMessages: { sender: 'user' | 'azrail'; text: string; timestamp: string }[];
  sendAiMessage: (text: string) => void;
  isGenerating: boolean;
  generateActiveImage: () => Promise<void>;
  activeImageResult: string | null;
  setActiveImageResult: (url: string | null) => void;
  triggerAIAction: (action: string) => void;
}

const ImageStudioContext = createContext<ImageStudioContextType | undefined>(undefined);

export const useImageStudio = () => {
  const context = useContext(ImageStudioContext);
  if (!context) {
    throw new Error('useImageStudio must be used within an ImageStudioProvider');
  }
  return context;
};

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'aether-garden',
    name: 'AETHER_GARDEN',
    folders: ['Raw Prompts', 'Style DNA', 'Upscaled'],
    assets: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80',
    ],
    history: [
      { id: 'h1', prompt: 'Ethereal glowing glass plants in biomechanical garden', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', timestamp: '10 mins ago' },
      { id: 'h2', prompt: 'Prismatic crystal structure emerging from volcanic obsidian sand', imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80', timestamp: '1 hour ago' }
    ]
  },
  {
    id: 'neon-vanguard',
    name: 'NEON_VANGUARD',
    folders: ['Scribbles', 'Style Transfer', 'Final Exports'],
    assets: [
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    ],
    history: [
      { id: 'h3', prompt: 'Cyberpunk pilot on motorcycle looking at hologram skyline', imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', timestamp: '2 hours ago' }
    ]
  }
];

export const ImageStudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>('aether-garden');
  const [activeModel, setActiveModel] = useState<string>('@cf/black-forest-labs/flux-1-schnell');
  const [activeBottomTab, setActiveBottomTab] = useState<'timeline' | 'queue' | 'versions' | 'console' | 'ai'>('timeline');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeImageResult, setActiveImageResult] = useState<string | null>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'
  );

  const [promptGenome, setPromptGenome] = useState<PromptGenome>({
    subject: 'Ethereal glowing glass plants in biomechanical garden',
    style: 'Surrealist Oil Painting',
    lighting: 'Volumetric God-Rays',
    mood: 'Contemplative and serene',
    lens: 'Anamorphic lens flare',
    composition: 'Golden Ratio, centered close-up',
    artist: 'H.R. Giger & Moebius',
    negativePrompt: 'ugly, deformed, blurry, low resolution, bad hands, mutated',
    seed: 420912,
    cfg: 7.5,
    aspectRatio: '1:1'
  });

  const [timeline, setTimeline] = useState<any[]>([
    { id: 't1', frame: 1, previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80', duration: 1.5 },
    { id: 't2', frame: 2, previewUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&auto=format&fit=crop&q=80', duration: 2.0 },
    { id: 't3', frame: 3, previewUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80', duration: 1.2 }
  ]);

  const [queue, setQueue] = useState<any[]>([
    { id: 'q1', label: 'DNA Style Transfer: Renaissance Blend', progress: 100, status: 'completed' },
    { id: 'q2', label: 'AI Super-Resolution 4X Upscale', progress: 100, status: 'completed' }
  ]);

  const [consoleLogs, setConsoleLogs] = useState<any[]>([
    { text: 'Neural Image Studio X initialized.', timestamp: '14:20:01', level: 'info' },
    { text: 'Style DNA index mapped: Renaissance (45%), Brutalist (30%), Cyberpunk (25%)', timestamp: '14:20:03', level: 'success' },
    { text: 'AZRAIL Autonomous memory loaded.', timestamp: '14:20:05', level: 'info' }
  ]);

  const [aiMessages, setAiMessages] = useState<any[]>([
    { sender: 'azrail', text: 'Greeting Creator. I am AZRAIL, the AI Creative Assistant of this Studio. Specify prompt genetics, adjust Style DNA, or command me to evaluate and fix compositions.', timestamp: '14:20:00' }
  ]);

  const addLog = (text: string, level: 'info' | 'warn' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [{ text, timestamp, level }, ...prev]);
  };

  const sendAiMessage = async (text: string) => {
    const userMsg = { sender: 'user' as const, text, timestamp: new Date().toLocaleTimeString() };
    setAiMessages(prev => [...prev, userMsg]);
    
    addLog(`AI assistant command received: "${text}"`, 'info');

    // Simulate Azrail typing
    setTimeout(() => {
      let azrailText = "Processing creative synthesis...";
      const query = text.toLowerCase();
      
      if (query.includes('enhance') || query.includes('improve') || query.includes('composition')) {
        azrailText = "I have scanned the active canvas. The composition is strong (94% adherence). I suggest shifting the camera node to an 'Anamorphic Wide-Angle' lens and increasing the CFG scale to 8.5 to bring out extra details in the biomechanical elements.";
        setPromptGenome(prev => ({
          ...prev,
          composition: 'Cinematic wide-angle shot, golden ratio grid alignment',
          cfg: 8.5
        }));
        addLog('AI optimized prompt genome: composition changed to wide-angle, CFG boosted to 8.5', 'success');
      } else if (query.includes('brutalist') || query.includes('style')) {
        azrailText = "Understood. Re-aligning Style DNA with architectural brutalism. Setting style to 'Brutalist Matte Painting' with concrete textures and extreme scale, inspired by Tadao Ando.";
        setPromptGenome(prev => ({
          ...prev,
          style: 'Brutalist Matte Painting with raw concrete, monumental forms',
          artist: 'Tadao Ando & Syd Mead'
        }));
        addLog('Style DNA recalibrated: Brutalist matte painting.', 'success');
      } else if (query.includes('giger') || query.includes('biomechanical')) {
        azrailText = "Activating H.R. Giger style module. Adjusting prompt genome: incorporating skeletal shadows, organic conduits, and obsidian highlights.";
        setPromptGenome(prev => ({
          ...prev,
          subject: 'Gothic biomechanical entity intertwined with structural obsidian cables',
          artist: 'H.R. Giger'
        }));
        addLog('DNA profile matched: H.R. Giger skeletal engine', 'success');
      } else {
        azrailText = `Creative suggestion matched. Let's evolve the genome. For "${text}", I suggest blending Renaissance Oil painting colors with high-exposure cosmic lighting. Shall I trigger the generation?`;
      }

      setAiMessages(prev => [...prev, {
        sender: 'azrail',
        text: azrailText,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }, 1200);
  };

  const triggerAIAction = (action: string) => {
    addLog(`AI Action triggered: ${action}`, 'info');
    if (action === 'REPAIR') {
      setIsGenerating(true);
      addLog('Scanning image genome for noise artifacts...', 'warn');
      setTimeout(() => {
        setIsGenerating(false);
        addLog('AI Repair complete: Noise reduced by 24%, color balance equalized.', 'success');
      }, 1500);
    } else if (action === 'UPSCALER') {
      const jobId = 'q-' + Math.random().toString(36).substring(2, 6);
      setQueue(prev => [
        { id: jobId, label: 'Super-Resolution 4X Upscaler running', progress: 0, status: 'rendering' },
        ...prev
      ]);
      addLog('Enqueuing 4X upscaling job...', 'info');
      setActiveBottomTab('queue');
      
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        setQueue(prev => prev.map(q => q.id === jobId ? { ...q, progress: p } : q));
        if (p >= 100) {
          clearInterval(interval);
          setQueue(prev => prev.map(q => q.id === jobId ? { ...q, status: 'completed' } : q));
          addLog('4X Upscale completed. PNG exported at 4096 x 4096.', 'success');
        }
      }, 300);
    } else if (action === 'CRITIQUE') {
      addLog('Running AI Quality Inspector on active frame...', 'info');
    }
  };

  const generateActiveImage = async () => {
    setIsGenerating(true);
    addLog('Synthesizing prompt genome into a single latent request...', 'info');
    
    const fullPrompt = `${promptGenome.subject}, in ${promptGenome.style} style, lighting: ${promptGenome.lighting}, mood: ${promptGenome.mood}, lens: ${promptGenome.lens}, composition: ${promptGenome.composition}, inspired by ${promptGenome.artist}`;
    
    // Add job to queue
    const jobId = 'g-' + Math.random().toString(36).substring(2, 6);
    setQueue(prev => [
      { id: jobId, label: `Render: ${promptGenome.subject.substring(0, 30)}...`, progress: 0, status: 'rendering' },
      ...prev
    ]);
    setActiveBottomTab('queue');

    // Simulate progress in queue
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      if (progress < 95) {
        setQueue(prev => prev.map(q => q.id === jobId ? { ...q, progress } : q));
      }
    }, 200);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setQueue(prev => prev.map(q => q.id === jobId ? { ...q, progress: 100, status: 'completed' } : q));
      setActiveImageResult(data.imageUrl);
      
      // Add to project history
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            history: [
              {
                id: 'gen-' + Date.now(),
                prompt: promptGenome.subject,
                imageUrl: data.imageUrl,
                timestamp: 'Just now'
              },
              ...p.history
            ]
          };
        }
        return p;
      }));

      // Add to timeline
      setTimeline(prev => [
        {
          id: 't-' + Date.now(),
          frame: prev.length + 1,
          previewUrl: data.imageUrl,
          duration: 1.5
        },
        ...prev
      ]);

      addLog('Synthesized image successfully imported into active canvas.', 'success');

    } catch (err: any) {
      clearInterval(progressInterval);
      setQueue(prev => prev.map(q => q.id === jobId ? { ...q, status: 'completed', label: `FAILED: ${err.message}` } : q));
      addLog(`Generation failure: ${err.message}. Reverting to speculative backup...`, 'warn');
      
      // Fallback: use a beautiful Unsplash art placeholder
      const randomId = Math.floor(Math.random() * 1000);
      const fallbackUrl = `https://picsum.photos/seed/${randomId}/800/800`;
      setActiveImageResult(fallbackUrl);
      
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            history: [
              {
                id: 'gen-' + Date.now(),
                prompt: promptGenome.subject,
                imageUrl: fallbackUrl,
                timestamp: 'Fallback generated'
              },
              ...p.history
            ]
          };
        }
        return p;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ImageStudioContext.Provider value={{
      projects,
      setProjects,
      activeProjectId,
      setActiveProjectId,
      promptGenome,
      setPromptGenome,
      activeModel,
      setActiveModel,
      timeline,
      setTimeline,
      queue,
      setQueue,
      consoleLogs,
      addLog,
      activeBottomTab,
      setActiveBottomTab,
      aiMessages,
      sendAiMessage,
      isGenerating,
      generateActiveImage,
      activeImageResult,
      setActiveImageResult,
      triggerAIAction
    }}>
      {children}
    </ImageStudioContext.Provider>
  );
};
