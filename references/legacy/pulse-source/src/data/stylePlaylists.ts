export interface StyleItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface StylePlaylist {
  id: string;
  category: 'Expensive Sites' | 'Platforms' | 'Web Applications' | 'Design';
  items: StyleItem[];
}

export const STYLE_PLAYLISTS: StylePlaylist[] = [
  {
    id: 'premium-luxury',
    category: 'Expensive Sites',
    items: [
      { id: 'luxe-01', name: 'Golden Ratio Minimal', description: 'Ultra-thin borders and serif elegance', tags: ['Luxury', 'Minimalist'] },
      { id: 'luxe-02', name: 'Ebony & Ivory', description: 'Deep contrast with high-end typography', tags: ['Classic', 'Premium'] },
      { id: 'luxe-03', name: 'Swiss Precision', description: 'Grid-based layout with perfect spacing', tags: ['Swiss', 'Clean'] },
      { id: 'luxe-04', name: 'Royal Glass', description: 'Soft frosted glass with gold accents', tags: ['Glassmorphism', 'Elegant'] },
      { id: 'luxe-05', name: 'The Monolith', description: 'Heavy, centered typography and dark theme', tags: ['Brutalist', 'Premium'] },
      { id: 'luxe-06', name: 'Velvet Flow', description: 'Smooth transitions and deep purple shadows', tags: ['Cinematic', 'Luxury'] },
      { id: 'luxe-07', name: 'Diamond Grid', description: 'Isometric grid with crystalline effects', tags: ['Geometric', 'High-end'] },
      { id: 'luxe-08', name: 'Silk Micro-copy', description: 'Focus on tiny, perfectly legible details', tags: ['Minimalist', 'Detailed'] },
      { id: 'luxe-09', name: 'Marble Interactive', description: 'Subtle grain and liquid scroll effects', tags: ['Experimental', 'Natural'] },
      { id: 'luxe-10', name: 'Titanium Framework', description: 'Sharp edges and industrial metallic palette', tags: ['Industrial', 'Sleek'] },
      { id: 'luxe-11', name: 'Onyx Depth', description: 'Layered shadows creating infinite black', tags: ['Dark', 'Modern'] },
      { id: 'luxe-12', name: 'Platinum Curve', description: 'Bezier-driven layouts and fluid containers', tags: ['Organic', 'Sleek'] },
      { id: 'luxe-13', name: 'Sartorial Web', description: 'Editorial layout with oversized images', tags: ['Fashion', 'Editorial'] },
      { id: 'luxe-14', name: 'Grand Entrance', description: 'Focus on cinematic entry animations', tags: ['Motion', 'Cinematic'] },
      { id: 'luxe-15', name: 'Bespoke Logic', description: 'Fully custom components, no frameworks', tags: ['Unique', 'Premium'] }
    ]
  },
  {
    id: 'saas-platforms',
    category: 'Platforms',
    items: [
      { id: 'plat-01', name: 'Hyper-Dashboard', description: 'Dense information display for power users', tags: ['SaaS', 'Functional'] },
      { id: 'plat-02', name: 'Cloud Native', description: 'Blue-accented clean enterprise look', tags: ['Corporate', 'Blue'] },
      { id: 'plat-03', name: 'Neo-Admin', description: 'Glassmorphism tabs and sidebars', tags: ['Modern', 'Admin'] },
      { id: 'plat-04', name: 'Dark Ops', description: 'Terminal-inspired productivity theme', tags: ['Developer', 'Dark'] },
      { id: 'plat-05', name: 'Seamless Sync', description: 'Real-time indicators and micro-states', tags: ['Interactive', 'SaaS'] },
      { id: 'plat-06', name: 'Bento Master', description: 'Perfectly sized grid cards for data', tags: ['Grid', 'Bento'] },
      { id: 'plat-07', name: 'Atomic Flow', description: 'Strict component-based design system', tags: ['System', 'Clean'] },
      { id: 'plat-08', name: 'Scalable Serif', description: 'Using serifs for readability in SaaS', tags: ['Editorial', 'Product'] },
      { id: 'plat-09', name: 'Focus Frame', description: 'Minimal distraction, workspace oriented', tags: ['Minimal', 'Productivity'] },
      { id: 'plat-10', name: 'Data Crystal', description: 'Light-themed translucent data charts', tags: ['Visualization', 'Light'] },
      { id: 'plat-11', name: 'Velocity UI', description: 'Built for speed with instant feedback', tags: ['Fast', 'Modern'] },
      { id: 'plat-12', name: 'Enterprise Core', description: 'Reliable, high-contrast accessible UI', tags: ['Accessibility', 'Corporate'] },
      { id: 'plat-13', name: 'Module Stack', description: 'Collapsible sections for deep workflows', tags: ['UX', 'Functional'] },
      { id: 'plat-14', name: 'Integrator Pro', description: 'Focus on multi-service connectivity', tags: ['API', 'Network'] },
      { id: 'plat-15', name: 'Blueprint Dark', description: 'Schematic lines and blueprint aesthetics', tags: ['Tech', 'Design'] }
    ]
  },
  {
    id: 'web-apps',
    category: 'Web Applications',
    items: [
      { id: 'app-01', name: 'Interactive Canvas', description: 'Drawing-based navigation and UI', tags: ['Creative', 'Canvas'] },
      { id: 'app-02', name: 'Motion First', description: 'Every state change is a transition', tags: ['Animation', 'UX'] },
      { id: 'app-03', name: 'Social Pulse', description: 'Vibrant colors and activity feeds', tags: ['Social', 'Vibrant'] },
      { id: 'app-04', name: 'Gamified Core', description: 'Progress bars and reward indicators', tags: ['Game', 'Interaction'] },
      { id: 'app-05', name: 'Mobile Hybrid', description: 'Optimized for touch and gesture', tags: ['Mobile', 'PWA'] },
      { id: 'app-06', name: 'Voice Interface', description: 'Sound-reactive wave animations', tags: ['AI', 'Voice'] },
      { id: 'app-07', name: 'Collaborative Space', description: 'Multi-cursor and shared state UI', tags: ['Real-time', 'Shared'] },
      { id: 'app-08', name: 'Infinite Scroll Hub', description: 'Seamless content consumption flow', tags: ['Media', 'Modern'] },
      { id: 'app-09', name: 'Utility Belt', description: 'Toolbar-driven power application', tags: ['Tools', 'Efficient'] },
      { id: 'app-10', name: 'Widget World', description: 'Highly customizable dashboard layout', tags: ['Personalization', 'Grid'] },
      { id: 'app-11', name: 'Neo-Skeuomorphic', description: 'Soft 3D buttons and real textures', tags: ['Design', '3D'] },
      { id: 'app-12', name: 'Minimal Marketplace', description: 'Focus on product imagery and cart', tags: ['E-commerce', 'Minimalist'] },
      { id: 'app-13', name: 'Reader View', description: 'Optimized for long-form reading', tags: ['Content', 'Typography'] },
      { id: 'app-14', name: 'Search Engine UI', description: 'Fast, input-first minimalist portal', tags: ['Search', 'Speed'] },
      { id: 'app-15', name: 'Neural Playground', description: 'AI-driven dynamic layout shifts', tags: ['AI', 'Experimental'] }
    ]
  },
  {
    id: 'design-creative',
    category: 'Design',
    items: [
      { id: 'des-01', name: 'Retro-Futurism', description: 'CRT scanlines and neon gradients', tags: ['Retro', 'Neon'] },
      { id: 'des-02', name: 'Abstract Geometry', description: 'Shapes defining the UI structure', tags: ['Art', 'Geometric'] },
      { id: 'des-03', name: 'Cyberpunk Redux', description: 'Glitch effects and high-tech noise', tags: ['Cyberpunk', 'Digital'] },
      { id: 'des-04', name: 'Organic Fluidity', description: 'Blob shapes and liquid animations', tags: ['Nature', 'Fluid'] },
      { id: 'des-05', name: 'Acid Design', description: 'Bold typography and hallucinogenic colors', tags: ['Acid', 'Creative'] },
      { id: 'des-06', name: 'Brutalist Echo', description: 'Raw code and unstyled defaults', tags: ['Brutalism', 'Raw'] },
      { id: 'des-07', name: 'Experimental Type', description: 'Font-first layout with massive text', tags: ['Type', 'Bold'] },
      { id: 'des-08', name: 'Glass Lab', description: 'Prismatic refraction and transparency', tags: ['Glass', 'Light'] },
      { id: 'des-09', name: 'Monochrome Void', description: 'Strict black and white aesthetic', tags: ['Minimal', 'Mono'] },
      { id: 'des-10', name: 'Collage Core', description: 'Mixed textures and overlapping layers', tags: ['Texture', 'Analog'] },
      { id: 'des-11', name: 'Bauhaus Modern', description: 'Primary colors and basic shapes', tags: ['History', 'Design'] },
      { id: 'des-12', name: 'Distorted Reality', description: 'Perspective shifts and skewing', tags: ['Experimental', 'Visual'] },
      { id: 'des-13', name: 'Minimalist Zen', description: 'Ultimate whitespace and calm', tags: ['Zen', 'Minimalist'] },
      { id: 'des-14', name: 'Gradient Pulse', description: 'Slow-moving blurred color backgrounds', tags: ['Color', 'Ambient'] },
      { id: 'des-15', name: 'Algorithm Art', description: 'Generative patterns defining the UI', tags: ['Generative', 'Math'] }
    ]
  }
];
