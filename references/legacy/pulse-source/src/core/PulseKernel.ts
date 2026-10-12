export interface Task {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}

type Listener = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Listener[]> = new Map();

  publish(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  subscribe(event: string, listener: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        this.listeners.set(event, eventListeners.filter(l => l !== listener));
      }
    };
  }
}

// 1. NEURAL MEMORY ENGINE - Hierarchical State Storage
export type MemoryScope = 'Global' | 'Project' | 'Studio' | 'Session';

class NeuralMemory {
  private memory: Map<MemoryScope, Map<string, any>> = new Map();

  constructor() {
    this.memory.set('Global', new Map());
    this.memory.set('Project', new Map());
    this.memory.set('Studio', new Map());
    this.memory.set('Session', new Map());

    // Hydrate non-transient memory from localStorage
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    try {
      const scopes: ('Global' | 'Project' | 'Studio')[] = ['Global', 'Project', 'Studio'];
      scopes.forEach(scope => {
        const saved = localStorage.getItem(`pulse_neural_memory_${scope}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([key, val]) => {
            this.memory.get(scope)!.set(key, val);
          });
        }
      });
    } catch (e) {
      console.warn('[NeuralMemory] Hydration failed:', e);
    }
  }

  private persistScope(scope: MemoryScope) {
    if (scope === 'Session') return; // Do not persist in-memory session scope
    try {
      const scopeMap = this.memory.get(scope)!;
      const obj = Object.fromEntries(scopeMap.entries());
      localStorage.setItem(`pulse_neural_memory_${scope}`, JSON.stringify(obj));
    } catch (e) {
      console.warn(`[NeuralMemory] Save failed for ${scope}:`, e);
    }
  }

  set(scope: MemoryScope, key: string, value: any) {
    const scopeMap = this.memory.get(scope);
    if (scopeMap) {
      scopeMap.set(key, value);
      this.persistScope(scope);
    }
  }

  get(scope: MemoryScope, key: string): any {
    return this.memory.get(scope)?.get(key);
  }

  delete(scope: MemoryScope, key: string) {
    const scopeMap = this.memory.get(scope);
    if (scopeMap && scopeMap.has(key)) {
      scopeMap.delete(key);
      this.persistScope(scope);
    }
  }

  clearScope(scope: MemoryScope) {
    this.memory.get(scope)?.clear();
    this.persistScope(scope);
  }

  getAll(scope: MemoryScope): Record<string, any> {
    return Object.fromEntries(this.memory.get(scope)!.entries());
  }
}

// 2. PROMPT DNA UTILITY - Input Transformation Pipeline
export interface PromptDNAOptions {
  optimize?: boolean;
  expand?: boolean;
  style?: 'cinematic' | 'cyberpunk' | 'minimalist' | 'monochrome' | 'classic' | 'none';
  quality?: 'draft' | 'production' | 'masterpiece';
  negativePrompt?: string;
  resolution?: string;
}

class PromptDNA {
  transform(prompt: string, options: PromptDNAOptions): { transformedPrompt: string; dnaMetadata: any } {
    let transformed = prompt.trim();
    const metadata: any = {
      originalLength: prompt.length,
      modifications: [] as string[],
    };

    if (options.optimize) {
      transformed = `${transformed}, highly optimized, sharp focus, stunning composition`;
      metadata.modifications.push('syntactic optimization');
    }

    if (options.expand) {
      transformed = `${transformed}, intricate patterns, volumetric lighting, rich color grading, depth of field, Raytraced reflections`;
      metadata.modifications.push('semantic expansion');
    }

    if (options.style && options.style !== 'none') {
      const styleMappings = {
        cinematic: 'anamorphic lens, dramatic backlight, Hollywood blockbuster look',
        cyberpunk: 'neon glow, futuristic cityscape, rainy streets, high-tech industrial tech',
        minimalist: 'pure negative space, ultra-clean design, basic geometric structures',
        monochrome: 'vintage black & white photography, sharp dark shadows, high-contrast silver halide',
        classic: 'oil on canvas painting style, traditional renaissance values, soft texture',
      };
      const styleSuffix = styleMappings[options.style];
      if (styleSuffix) {
        transformed = `${transformed}, styled in [${options.style.toUpperCase()}] mood (${styleSuffix})`;
        metadata.modifications.push(`style encapsulation: ${options.style}`);
      }
    }

    if (options.quality && options.quality !== 'draft') {
      const qualitySuffix = options.quality === 'masterpiece' 
        ? 'award-winning masterpieces, 8k resolution, photorealistic DSLR rendering' 
        : 'production-grade visual clarity, 4k detail standard';
      transformed = `${transformed}, ${qualitySuffix}`;
      metadata.modifications.push(`quality booster: ${options.quality}`);
    }

    if (options.resolution) {
      transformed = `${transformed}, aspect-ratio: ${options.resolution}`;
      metadata.modifications.push(`resolution constraint: ${options.resolution}`);
    }

    metadata.transformedLength = transformed.length;
    metadata.timestamp = new Date();

    return {
      transformedPrompt: transformed,
      dnaMetadata: metadata,
    };
  }
}

// 3. QUALITY ENGINE - Post-Generation Verification
export interface QualityReport {
  score: number; // 0 to 100
  aestheticScore: number; // 0 to 100
  compositionScore: number; // 0 to 100
  brandMatchScore: number; // 0 to 100
  issues: string[];
  recommendations: string[];
}

class QualityEngine {
  analyze(content: string, type: string): QualityReport {
    // Perform simulated evaluation based on length, prompt diversity, structure
    const len = content.length;
    
    // Deterministic pseudo-metrics
    const aestheticScore = Math.min(100, Math.max(45, 60 + (len % 37)));
    const compositionScore = Math.min(100, Math.max(50, 65 + (len % 31)));
    const brandMatchScore = Math.min(100, Math.max(40, 70 + (len % 29)));
    
    const score = Math.round((aestheticScore + compositionScore + brandMatchScore) / 3);
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (aestheticScore < 75) {
      issues.push('Contrast balance in workspace elements could be heightened.');
      recommendations.push('Inject dynamic dark highlights and negative spaces (4px padding rules).');
    }
    if (compositionScore < 75) {
      issues.push('Layout aligns density symmetrically without focal points.');
      recommendations.push('Employ bento-grid structure with 3:1 sizing ratios on wide layouts.');
    }
    if (brandMatchScore < 80) {
      issues.push('Color schemes drift outside standard GOST 2026 guidelines.');
      recommendations.push('Apply the unified indigo glow gradient border standard across card items.');
    }

    if (issues.length === 0) {
      recommendations.push('Composition is fully aligned to high-end industry production values.');
    }

    return {
      score,
      aestheticScore,
      compositionScore,
      brandMatchScore,
      issues,
      recommendations,
    };
  }
}

// 4. CREATIVE DNA ENGINE - User Psycho-Design Profile
export type StyleBias = 
  | 'cinematic' | 'cyberpunk' | 'minimalist' | 'monochrome' | 'classic' 
  | 'brutalist' | 'neo-glass' | 'organic' | 'industrial' | 'luxury'
  | 'vaporwave' | 'swiss' | 'experimental' | 'corporate' | 'retro-future';

export interface DNAProfile {
  styleBias: StyleBias;
  complexityScore: number; // 0-100
  favoriteColors: string[];
  generationTendencies: string[];
  signatureElements: string[];
  lastSequenced: Date;
  activePlaylist?: string;
  traits: {
    analytical: number;
    creative: number;
    empathy: number;
    adaptive: number;
  };
}

class CreativeDNAEngine {
  private profile: DNAProfile | null = null;

  constructor() {
    this.hydrateProfile();
  }

  private hydrateProfile() {
    try {
      const saved = localStorage.getItem('pulse_creative_dna');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.profile = {
          ...parsed,
          lastSequenced: new Date(parsed.lastSequenced)
        };
      } else {
        this.generateInitialProfile();
      }
    } catch (e) {
      this.generateInitialProfile();
    }
  }

  private generateInitialProfile() {
    this.profile = {
      styleBias: 'minimalist',
      complexityScore: 45,
      favoriteColors: ['#7B4BFF', '#00D1FF'],
      generationTendencies: ['clean-interfaces', 'geometric-abstraction', 'fast-response'],
      signatureElements: ['glow-borders', 'frosted-glass', 'subtle-noise'],
      lastSequenced: new Date(),
      traits: {
        analytical: 75,
        creative: 60,
        empathy: 50,
        adaptive: 65
      }
    };
    this.saveProfile();
  }

  private saveProfile() {
    if (this.profile) {
      localStorage.setItem('pulse_creative_dna', JSON.stringify(this.profile));
    }
  }

  public getProfile(): DNAProfile {
    if (!this.profile) this.generateInitialProfile();
    return this.profile!;
  }

  public sequence(history: any[] = []): DNAProfile {
    // Simulated deep analysis of user interaction patterns
    const p = this.getProfile();
    
    // Shift traits slightly based on "history" (simulated)
    p.traits.analytical = Math.min(100, Math.max(0, p.traits.analytical + (Math.random() * 10 - 5)));
    p.traits.creative = Math.min(100, Math.max(0, p.traits.creative + (Math.random() * 10 - 5)));
    p.traits.adaptive = Math.min(100, Math.max(0, p.traits.adaptive + (Math.random() * 10 - 5)));
    
    p.complexityScore = Math.round((p.traits.analytical + p.traits.creative) / 2);
    p.lastSequenced = new Date();
    
    // Randomly evolve style bias if not locked (simulated)
    const styles: StyleBias[] = [
      'cinematic', 'cyberpunk', 'minimalist', 'monochrome', 'classic', 
      'brutalist', 'neo-glass', 'organic', 'industrial', 'luxury',
      'vaporwave', 'swiss', 'experimental', 'corporate', 'retro-future'
    ];
    if (Math.random() > 0.8) {
      p.styleBias = styles[Math.floor(Math.random() * styles.length)];
    }

    this.saveProfile();
    return p;
  }

  public setStyle(style: StyleBias) {
    const p = this.getProfile();
    p.styleBias = style;
    this.saveProfile();
    return p;
  }

  public setPlaylist(playlistId: string) {
    const p = this.getProfile();
    p.activePlaylist = playlistId;
    this.saveProfile();
    return p;
  }

  public getPromptModifier(): string {
    const p = this.getProfile();
    const playlistInfo = p.activePlaylist ? ` Playlist=${p.activePlaylist}` : '';
    return `[CREATIVE DNA: Style=${p.styleBias}, Complexity=${p.complexityScore}%${playlistInfo}, Traits=${Object.entries(p.traits).map(([k, v]) => `${k}:${Math.round(v)}`).join(',')}]`;
  }
}

// Legacy Compatibility for simple Map storage
class MemoryEngine {
  private memory: Map<string, any> = new Map();

  set(key: string, value: any) {
    this.memory.set(key, value);
  }

  get(key: string) {
    return this.memory.get(key);
  }

  delete(key: string) {
    this.memory.delete(key);
  }

  getAll() {
    return Object.fromEntries(this.memory.entries());
  }
}

class AIRouter {
  private dna: PromptDNA;
  private creativeDNA: CreativeDNAEngine;

  constructor(dna: PromptDNA, creativeDNA: CreativeDNAEngine) {
    this.dna = dna;
    this.creativeDNA = creativeDNA;
  }

  async route(prompt: string, type: 'text' | 'image' | 'video' | 'music' | 'code') {
    console.log(`[AIRouter] Routing ${type} task: ${prompt}`);
    
    // Utilize Prompt DNA standard transformation
    const transformed = this.dna.transform(prompt, {
      optimize: true,
      expand: true,
      quality: 'production',
    });

    // Influence by Creative DNA
    const dnaModifier = this.creativeDNA.getPromptModifier();
    const finalPrompt = `${transformed.transformedPrompt} | ${dnaModifier}`;
    
    return `Optimized payload: "${finalPrompt}" routed to central AI cluster.`;
  }
}

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  createTask(name: string): string {
    const id = Math.random().toString(36).substring(7);
    const task: Task = { id, name, status: 'pending', progress: 0 };
    this.tasks.set(id, task);
    this.eventBus.publish('task:created', task);
    return id;
  }

  updateProgress(id: string, progress: number) {
    const task = this.tasks.get(id);
    if (task) {
      task.progress = progress;
      if (progress >= 100) {
        task.status = 'completed';
      } else if (task.status === 'pending') {
        task.status = 'running';
      }
      this.tasks.set(id, task);
      this.eventBus.publish('task:updated', task);
    }
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}

export class PulseKernel {
  private static instance: PulseKernel;
  
  public events: EventBus;
  public memory: MemoryEngine; // Legacy support
  public neuralMemory: NeuralMemory; // Hierarchical store
  public dna: PromptDNA; // Transformer pipeline
  public creativeDNA: CreativeDNAEngine; // User profile engine
  public quality: QualityEngine; // Checker
  public ai: AIRouter;
  public tasks: TaskManager;

  private constructor() {
    this.events = new EventBus();
    this.memory = new MemoryEngine();
    this.neuralMemory = new NeuralMemory();
    this.dna = new PromptDNA();
    this.creativeDNA = new CreativeDNAEngine();
    this.quality = new QualityEngine();
    this.ai = new AIRouter(this.dna, this.creativeDNA);
    this.tasks = new TaskManager(this.events);
    console.log('[PulseKernel] Orchestration Layer Core v2.1 Initialized with Creative DNA Engine.');
  }

  public static getInstance(): PulseKernel {
    if (!PulseKernel.instance) {
      PulseKernel.instance = new PulseKernel();
    }
    return PulseKernel.instance;
  }
}

export const kernel = PulseKernel.getInstance();
