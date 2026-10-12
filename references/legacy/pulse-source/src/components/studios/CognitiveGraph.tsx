import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pulsePsychologyCore } from '../../modules/PsychologyCivilization/store';
import { Network, Brain, Link as LinkIcon, Crosshair } from 'lucide-react';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  type: 'archetype' | 'trigger' | 'category';
}

interface Link {
  source: string;
  target: string;
  distance: number;
}

export function CognitiveGraph({ isLight }: { isLight?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  useEffect(() => {
    // Initialize graph data from pulsePsychologyCore
    const archetypes = pulsePsychologyCore.getArchetypes();
    const triggers = pulsePsychologyCore.getTriggers();
    const bookshelf = pulsePsychologyCore.getBookshelf();

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // Central Node
    newNodes.push({
      id: 'core', x: 0, y: 0, vx: 0, vy: 0, radius: 24, color: isLight ? '#4f46e5' : '#6366f1', label: 'COGNITIVE CORE', type: 'category'
    });

    // Categories
    const categories = ['Manipulation', 'Defense', 'Influence', 'Strategy'];
    categories.forEach((cat, i) => {
      newNodes.push({
        id: `cat_${cat}`, x: Math.cos(i) * 100, y: Math.sin(i) * 100, vx: 0, vy: 0, radius: 16, color: '#f43f5e', label: cat.toUpperCase(), type: 'category'
      });
      newLinks.push({ source: 'core', target: `cat_${cat}`, distance: 150 });
    });

    // Archetypes
    archetypes.forEach((a, i) => {
      newNodes.push({
        id: a.id, x: Math.cos(i) * 200, y: Math.sin(i) * 200, vx: 0, vy: 0, radius: 12, color: '#10b981', label: a.name, type: 'archetype'
      });
      newLinks.push({ source: 'core', target: a.id, distance: 200 });
      
      // Link to categories based on techniques
      if (a.techniques.includes('Deception') || a.techniques.includes('Coercion')) {
        newLinks.push({ source: a.id, target: 'cat_Manipulation', distance: 100 });
      }
      if (a.techniques.includes('Charm') || a.techniques.includes('Reality Distortion')) {
        newLinks.push({ source: a.id, target: 'cat_Influence', distance: 100 });
      }
    });

    // Triggers
    triggers.forEach((t, i) => {
      newNodes.push({
        id: t.id, x: Math.cos(i) * 250, y: Math.sin(i) * 250, vx: 0, vy: 0, radius: 8, color: '#eab308', label: t.name, type: 'trigger'
      });
      newLinks.push({ source: `cat_${t.category.charAt(0).toUpperCase() + t.category.slice(1)}`, target: t.id, distance: 120 });
    });

    setNodes(newNodes);
    setLinks(newLinks);
  }, [isLight]);

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width;
    let height = canvas.height;

    // Simulation params
    const damping = 0.85;
    const repulsion = 1500;
    const springLen = 150;
    const springForce = 0.02;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2); // Center

      // Calculate forces
      for (let i = 0; i < nodes.length; i++) {
        let fx = 0, fy = 0;
        
        // Center gravity
        fx -= nodes[i].x * 0.01;
        fy -= nodes[i].y * 0.01;

        // Repulsion
        for (let j = 0; j < nodes.length; j++) {
          if (i !== j) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 0 && distSq < 40000) {
              const dist = Math.sqrt(distSq);
              const force = repulsion / distSq;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          }
        }

        // Springs
        links.forEach(link => {
          if (link.source === nodes[i].id || link.target === nodes[i].id) {
            const otherId = link.source === nodes[i].id ? link.target : link.source;
            const other = nodes.find(n => n.id === otherId);
            if (other) {
              const dx = other.x - nodes[i].x;
              const dy = other.y - nodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const force = (dist - link.distance) * springForce;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
              }
            }
          }
        });

        // Apply forces
        nodes[i].vx = (nodes[i].vx + fx) * damping;
        nodes[i].vy = (nodes[i].vy + fy) * damping;
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
      }

      // Draw Links
      ctx.lineWidth = 1;
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Node Border
        ctx.lineWidth = 2;
        ctx.strokeStyle = isLight ? '#ffffff' : '#050505';
        ctx.stroke();
        
        // Label
        if (node.radius >= 12 || hoveredNode?.id === node.id) {
          ctx.fillStyle = isLight ? '#4b5563' : '#a1a1aa';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + node.radius + 12);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Resize handler
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        width = canvas.width;
        height = canvas.height;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      
      const hovered = nodes.find(n => {
        const dx = n.x - x;
        const dy = n.y - y;
        return Math.sqrt(dx*dx + dy*dy) < n.radius + 5;
      });
      setHoveredNode(hovered || null);
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [nodes, links, isLight]);

  return (
    <div className={`relative w-full h-[500px] border rounded-2xl overflow-hidden ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#0a0a0a] border-white/5'}`}>
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
        <Network className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
          Cognitive Ontology Map
        </h3>
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-4 text-[9px] font-mono uppercase text-zinc-500 pointer-events-none">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Categories</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Archetypes</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Triggers</span>
      </div>
      
      <canvas ref={canvasRef} className="w-full h-full" />
      
      <AnimatePresence>
        {hoveredNode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute bottom-4 left-4 p-3 rounded-xl border max-w-xs ${isLight ? 'bg-white border-gray-200 shadow-xl' : 'bg-[#050505] border-white/10 shadow-2xl'}`}
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">{hoveredNode.type}</span>
              <span className={`text-xs font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{hoveredNode.label}</span>
              <span className="text-[10px] font-mono text-zinc-500">ID: {hoveredNode.id}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
