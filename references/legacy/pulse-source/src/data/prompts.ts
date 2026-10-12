export interface EngineeringPrompt {
  id: string;
  category: 'architecture' | 'optimization' | 'security' | 'ux' | 'ai';
  label: string;
  prompt: string;
}

export const ENGINEERING_PROMPTS: EngineeringPrompt[] = [
  {
    id: 'bft-consensus',
    category: 'architecture',
    label: 'Byzantine Fault Tolerance Optimizer',
    prompt: 'Analyze the current distributed state management system. Identify potential Byzantine failure points where inconsistent nodes could corrupt global consensus. Propose a multi-signature validation layer and a dynamic trust-score mechanism to mitigate sybil attacks.'
  },
  {
    id: 'latency-speculation',
    category: 'optimization',
    label: 'Predictive Latency Hider',
    prompt: 'Implement a speculative execution model for UI interactions. For every user action, predict the most likely success outcome and transition the visual state immediately (optimistic UI), while maintaining a rollback buffer in case of server-side conflict.'
  },
  {
    id: 'zero-trust-audit',
    category: 'security',
    label: 'Zero-Trust Security Auditor',
    prompt: 'Perform a comprehensive audit of the internal micro-segmentation. Verify that no service assumes implicit trust based on network location. Enforce JWT-based identity propagation at every internal hop and suggest mTLS configurations for all inter-service traffic.'
  },
  {
    id: 'metatron-layout',
    category: 'ux',
    label: 'METATRON Layout Engine',
    prompt: 'Design a fluid, spring-based layout system that reacts to cursor proximity. UI elements should exhibit gravitational pull and repulsion. Use Framer Motion/React Motion to implement realistic physics-based transitions that feel organic and high-end.'
  },
  {
    id: 'speculative-rag',
    category: 'ai',
    label: 'Speculative RAG Prefetcher',
    prompt: 'Build a background task that analyzes the current chat context and speculatively fetches embedding-matched documents from the vector store before the user even finishes typing their next query. Focus on maximizing cache hit rate for predicted intent.'
  },
  {
    id: 'token-velocity',
    category: 'optimization',
    label: 'Token Velocity Enhancer',
    prompt: 'Optimize the LLM streaming pipeline. Implement a character-level buffer that prioritizes rendering complete words to avoid visual jitter. Suggest a multiplexing strategy for concurrent model calls to maintain high global token-per-second throughput.'
  },
  {
    id: 'dark-mnmll-pulse',
    category: 'architecture',
    label: 'Dark MnMll Core Logic',
    prompt: 'Refactor the system core to follow the "Dark MnMll" philosophy: Extreme minimalism in visual presentation, extreme complexity and robustness in hidden logic. All UI should be high-contrast, data-dense, yet surgically clean.'
  },
  {
    id: 'image-studio-x',
    category: 'ai',
    label: 'Image Studio X Core Engine',
    prompt: 'Configure a Multi-Engine Generative Workspace with Infinite Neural Canvas, Style DNA Database, AI Critic, and Prompt Genome Studio. Enable version control and asynchronous generation pipelines to manage raw base64 and SVG vectors.'
  },
  {
    id: 'prompt-genome-parser',
    category: 'optimization',
    label: 'Prompt Genome Analyzer',
    prompt: 'Implement a structured parser that decomposes chaotic natural language prompts into normalized parameters: Subject, Style, Lighting, Lens, Composition, Negative space, Seed, and CFG weights for deterministic generation.'
  }
];
