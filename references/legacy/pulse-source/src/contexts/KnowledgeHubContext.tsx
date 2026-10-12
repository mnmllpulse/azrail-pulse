import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ProductionPattern } from '../types';

export interface KnowledgeDocument {
  id: string;
  name: string;
  content: string;
  source: string;
  size: number; // in bytes
  uploadDate: Date;
  category: string;
  hasEmbeddings: boolean;
  chunksCount: number;
}

interface KnowledgeHubContextType {
  documents: KnowledgeDocument[];
  addDocument: (name: string, content: string, category?: string) => Promise<string>;
  deleteDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<KnowledgeDocument>) => void;
  searchDocuments: (query: string) => { document: KnowledgeDocument; score: number; preview: string }[];
  generateEmbeddings: (id: string) => Promise<void>;
  isGeneratingEmbeddings: boolean;
  d1: {
    prepare: (query: string) => {
      bind: (...args: any[]) => {
        all: <T = any>() => Promise<{ results: T[] }>;
        first: <T = any>() => Promise<T | null>;
        run: () => Promise<{ success: boolean }>;
      };
    };
  };
}

const KnowledgeHubContext = createContext<KnowledgeHubContextType | undefined>(undefined);

export const useKnowledgeHub = () => {
  const context = useContext(KnowledgeHubContext);
  if (!context) {
    throw new Error('useKnowledgeHub must be used within a KnowledgeHubProvider');
  }
  return context;
};

const DEFAULT_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'system-spec-1',
    name: 'Pulse OS Kernel Specification.md',
    content: 'The core execution loop of Pulse OS orchestrates decentralized AI cognitive networks. Running under high performance constraints, it establishes a GOST 2026/2027 auto-scaling matrix. Memory registers are persisted using local index structures and cloud-synced databases, utilizing low latency vector queries for real-time memory retrieval.',
    source: 'Core System',
    size: 512,
    uploadDate: new Date('2026-07-16'),
    category: 'System',
    hasEmbeddings: true,
    chunksCount: 3,
  },
  {
    id: 'rag-guide',
    name: 'Cognitive Vector Embedding Strategy.pdf',
    content: 'Retrieval-Augmented Generation (RAG) within Pulse OS utilizes deep neural architectures. Texts are tokenized and processed through multi-dimensional dense embeddings. Chunks of size 512 with overlap of 64 are vectorized to allow cosine-similarity matching in our high-density memory vector pools, guaranteeing context-enriched prompts to LLM routers.',
    source: 'RAG Module',
    size: 1024,
    uploadDate: new Date('2026-07-17'),
    category: 'RAG Architecture',
    hasEmbeddings: true,
    chunksCount: 6,
  },
  {
    id: 'api-guide',
    name: 'Nexus API Handshake and Webhook Protocol.json',
    content: 'API communication across Swarm Commander units utilizes encrypted WebSocket handshakes. Real-time telemetry is broadcast using the Azrail Soul Phase 1 payload format. This ensures sub-millisecond reaction latency for edge execution nodes and central orchestration servers.',
    source: 'API Registry',
    size: 2048,
    uploadDate: new Date('2026-07-18'),
    category: 'Network',
    hasEmbeddings: false,
    chunksCount: 12,
  }
];

const INITIAL_PATTERNS: ProductionPattern[] = [
  {
    id: 1,
    genre: 'melodic_house_techno',
    intensity: 0.5,
    pattern_type: 'groove',
    description: 'Classic 4/4 with ghost hi-hats and 12% swing on percussion',
    parameters: JSON.stringify({ swing: 0.12, velocity_range: [80, 110], ghost_notes: true })
  },
  {
    id: 2,
    genre: 'melodic_house_techno',
    intensity: 0.8,
    pattern_type: 'harmony',
    description: 'Tension-building Dorian modality with automated filter resonance',
    parameters: JSON.stringify({ scale: 'Dorian', tension_factor: 0.8, resonance_lfo: true })
  },
  {
    id: 3,
    genre: 'melodic_house_techno',
    intensity: 0.3,
    pattern_type: 'structure',
    description: 'Standard 7-minute club arrangement with 32-bar intro',
    parameters: JSON.stringify({ intro_length: 32, breakdown_pos: 128, outro_length: 32 })
  }
];

export const KnowledgeHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(() => {
    const saved = localStorage.getItem('pulse_knowledge_docs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((doc: any) => ({
          ...doc,
          uploadDate: new Date(doc.uploadDate)
        }));
      } catch (e) {
        return DEFAULT_DOCUMENTS;
      }
    }
    return DEFAULT_DOCUMENTS;
  });

  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false);

  useEffect(() => {
    localStorage.setItem('pulse_knowledge_docs', JSON.stringify(documents));
  }, [documents]);

  const addDocument = async (name: string, content: string, category: string = 'General'): Promise<string> => {
    const id = Math.random().toString(36).substring(7);
    const newDoc: KnowledgeDocument = {
      id,
      name,
      content,
      source: 'User Upload',
      size: new Blob([content]).size,
      uploadDate: new Date(),
      category,
      hasEmbeddings: false,
      chunksCount: Math.max(1, Math.ceil(content.length / 200)),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    toast.success(`Document "${name}" added to Knowledge Hub successfully.`);
    return id;
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    toast.success('Document deleted from Knowledge Hub.');
  };

  const updateDocument = (id: string, updates: Partial<KnowledgeDocument>) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              ...updates,
              size: updates.content ? new Blob([updates.content]).size : doc.size,
              chunksCount: updates.content ? Math.max(1, Math.ceil(updates.content.length / 200)) : doc.chunksCount,
            }
          : doc
      )
    );
  };

  const generateEmbeddings = async (id: string) => {
    setIsGeneratingEmbeddings(true);
    // Simulate API delay for generating embeddings
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, hasEmbeddings: true } : doc
      )
    );
    setIsGeneratingEmbeddings(false);
    toast.success('Vector embeddings successfully generated and indexed.');
  };

  const searchDocuments = (query: string) => {
    if (!query.trim()) return [];
    
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    const results = documents.map((doc) => {
      let score = 0;
      const text = `${doc.name} ${doc.content} ${doc.category}`.toLowerCase();
      
      terms.forEach((term) => {
        if (text.includes(term)) {
          // Boost score if keyword is in title or category
          if (doc.name.toLowerCase().includes(term)) score += 5;
          if (doc.category.toLowerCase().includes(term)) score += 3;
          
          // Count occurrences in content
          const matches = text.split(term).length - 1;
          score += matches;
        }
      });

      // Simple RAG relevance scoring formula
      if (doc.hasEmbeddings) {
        score = score * 1.5; // vector matching boost
      }

      // Extract a preview snippet containing a keyword
      let preview = doc.content.substring(0, 150) + '...';
      const firstMatchIndex = doc.content.toLowerCase().indexOf(terms[0]);
      if (firstMatchIndex !== -1) {
        const start = Math.max(0, firstMatchIndex - 40);
        const end = Math.min(doc.content.length, firstMatchIndex + 110);
        preview = (start > 0 ? '...' : '') + doc.content.substring(start, end) + (end < doc.content.length ? '...' : '');
      }

      return {
        document: doc,
        score,
        preview,
      };
    });

    return results
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  const [patterns, setPatterns] = useState<ProductionPattern[]>(() => {
    const saved = localStorage.getItem('pulse_production_patterns');
    return saved ? JSON.parse(saved) : INITIAL_PATTERNS;
  });

  useEffect(() => {
    localStorage.setItem('pulse_production_patterns', JSON.stringify(patterns));
  }, [patterns]);

  const d1: KnowledgeHubContextType['d1'] = {
    prepare: (query: string) => {
      return {
        bind: (...args: any[]) => {
          return {
            all: async <T = any>() => {
              // Very basic mock SQL parser for "SELECT * FROM patterns WHERE genre = ?"
              let results = [...patterns] as any[];
              if (query.toLowerCase().includes('where genre = ?')) {
                results = results.filter(p => p.genre === args[0]);
              }
              if (query.toLowerCase().includes('order by intensity')) {
                results.sort((a, b) => Math.abs(a.intensity - args[0]) - Math.abs(b.intensity - args[0]));
              }
              return { results: results as T[] };
            },
            first: async <T = any>() => {
              const res = await d1.prepare(query).bind(...args).all<T>();
              return res.results[0] || null;
            },
            run: async () => {
              // Mock insert/update
              return { success: true };
            }
          };
        }
      };
    }
  };

  return (
    <KnowledgeHubContext.Provider
      value={{
        documents,
        addDocument,
        deleteDocument,
        updateDocument,
        searchDocuments,
        generateEmbeddings,
        isGeneratingEmbeddings,
        d1,
      }}
    >
      {children}
    </KnowledgeHubContext.Provider>
  );
};
