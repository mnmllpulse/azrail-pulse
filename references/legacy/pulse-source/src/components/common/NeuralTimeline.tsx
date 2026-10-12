import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, Plus, Trash2, ArrowLeft, Check, Zap, AlertTriangle, Layers } from 'lucide-react';
import { toast } from 'sonner';

export interface TimelineCommit {
  hash: string;
  message: string;
  timestamp: Date;
  branch: string;
  author: string;
  parentHashes: string[];
  gridX: number; // For rendering non-linear grid
  gridY: number; // Grid lane based on branch
  status: 'active' | 'stable' | 'checkpoint';
}

export interface TimelineBranch {
  name: string;
  color: string;
  head: string;
}

const DEFAULT_BRANCHES: TimelineBranch[] = [
  { name: 'main', color: '#6366f1', head: 'c-3' },
  { name: 'dev/cognitive', color: '#10b981', head: 'c-5' },
  { name: 'experimental/quantum', color: '#f59e0b', head: 'c-6' }
];

const DEFAULT_COMMITS: TimelineCommit[] = [
  {
    hash: 'c-1',
    message: 'System initialization and core module bootstrap',
    timestamp: new Date('2026-07-13T10:00:00'),
    branch: 'main',
    author: 'SYSTEM',
    parentHashes: [],
    gridX: 0,
    gridY: 0,
    status: 'stable',
  },
  {
    hash: 'c-2',
    message: 'Optimized multi-threaded prompt-DNA pipelines',
    timestamp: new Date('2026-07-14T14:30:00'),
    branch: 'main',
    author: 'AZRAIL CORE',
    parentHashes: ['c-1'],
    gridX: 1,
    gridY: 0,
    status: 'stable',
  },
  {
    hash: 'c-3',
    message: 'Integrated RAG Cognitive Sync inside central database',
    timestamp: new Date('2026-07-15T09:15:00'),
    branch: 'main',
    author: 'KNOWLEDGE ENG',
    parentHashes: ['c-2'],
    gridX: 2,
    gridY: 0,
    status: 'active',
  },
  {
    hash: 'c-4',
    message: 'Fork dev/cognitive: Cognitive neural layer setup',
    timestamp: new Date('2026-07-16T11:00:00'),
    branch: 'dev/cognitive',
    author: 'AZRAIL CORE',
    parentHashes: ['c-2'],
    gridX: 2,
    gridY: 1,
    status: 'checkpoint',
  },
  {
    hash: 'c-5',
    message: 'Added automatic aesthetic quality checker heuristics',
    timestamp: new Date('2026-07-17T16:45:00'),
    branch: 'dev/cognitive',
    author: 'QUALITY ENG',
    parentHashes: ['c-4'],
    gridX: 3,
    gridY: 1,
    status: 'stable',
  },
  {
    hash: 'c-6',
    message: 'Fork experimental/quantum: Quantum coherence experiments',
    timestamp: new Date('2026-07-18T18:20:00'),
    branch: 'experimental/quantum',
    author: 'QUANTUM MIND',
    parentHashes: ['c-3'],
    gridX: 3,
    gridY: 2,
    status: 'checkpoint',
  },
];

export default function NeuralTimeline({ 
  isLight, 
  onClose 
}: { 
  isLight: boolean; 
  onClose?: () => void; 
}) {
  const [branches, setBranches] = useState<TimelineBranch[]>(() => {
    const saved = localStorage.getItem('pulse_timeline_branches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_BRANCHES; }
    }
    return DEFAULT_BRANCHES;
  });

  const [commits, setCommits] = useState<TimelineCommit[]>(() => {
    const saved = localStorage.getItem('pulse_timeline_commits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) }));
      } catch (e) { return DEFAULT_COMMITS; }
    }
    return DEFAULT_COMMITS;
  });

  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [selectedCommit, setSelectedCommit] = useState<string>('c-3');
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [newSnapshotMsg, setNewSnapshotMsg] = useState('');
  const [newSnapshotStatus, setNewSnapshotStatus] = useState<'active' | 'stable' | 'checkpoint'>('checkpoint');
  
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchColor, setNewBranchColor] = useState('#a855f7');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('pulse_timeline_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('pulse_timeline_commits', JSON.stringify(commits));
  }, [commits]);

  // Draw git tree canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display density
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid config
    const cellWidth = 90;
    const cellHeight = 45;
    const paddingX = 35;
    const paddingY = 25;

    // Draw branch connector curves
    ctx.lineWidth = 2.5;
    
    commits.forEach((commit) => {
      const parentHash = commit.parentHashes[0];
      if (parentHash) {
        const parent = commits.find(c => c.hash === parentHash);
        if (parent) {
          const parentX = paddingX + parent.gridX * cellWidth;
          const parentY = paddingY + parent.gridY * cellHeight;
          const currentX = paddingX + commit.gridX * cellWidth;
          const currentY = paddingY + commit.gridY * cellHeight;

          const branchColor = branches.find(b => b.name === commit.branch)?.color || '#6366f1';
          ctx.strokeStyle = branchColor + 'aa'; // alpha transparency for nice subtle lines

          ctx.beginPath();
          ctx.moveTo(parentX, parentY);

          if (parent.gridY === commit.gridY) {
            // Straight horizontal line
            ctx.lineTo(currentX, currentY);
          } else {
            // Smooth S-curve for fork
            const cp1X = parentX + (currentX - parentX) * 0.5;
            const cp1Y = parentY;
            const cp2X = parentX + (currentX - parentX) * 0.5;
            const cp2Y = currentY;
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, currentX, currentY);
          }
          ctx.stroke();
        }
      }
    });

    // Draw commit nodes
    commits.forEach((commit) => {
      const cx = paddingX + commit.gridX * cellWidth;
      const cy = paddingY + commit.gridY * cellHeight;
      const branchColor = branches.find(b => b.name === commit.branch)?.color || '#6366f1';
      const isSelected = selectedCommit === commit.hash;

      // Outer glow rings for selected
      if (isSelected) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = branchColor;
        ctx.strokeStyle = branchColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // Main circle node
      ctx.fillStyle = isSelected 
        ? '#ffffff' 
        : (isLight ? '#f4f4f5' : '#090514');
      ctx.strokeStyle = branchColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mini core center
      ctx.fillStyle = branchColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [commits, branches, selectedCommit, isLight]);

  // Handle Snapshot Rollback
  const handleRollback = (hash: string) => {
    const commit = commits.find(c => c.hash === hash);
    if (!commit) return;
    
    setSelectedCommit(hash);
    setSelectedBranch(commit.branch);
    toast.success(`Rolled back system configuration to state [${hash.toUpperCase()}]: "${commit.message}"`);
  };

  // Add Snapshot / Commit
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotMsg.trim()) {
      toast.error('Please input a commit message for your snapshot.');
      return;
    }

    const currentBranchInfo = branches.find(b => b.name === selectedBranch);
    if (!currentBranchInfo) return;

    const parentCommit = commits.find(c => c.hash === selectedCommit) || commits[commits.length - 1];
    
    // Determine new grid slot
    // Grid X must be parent grid X + 1
    // Grid Y should be the lane of the branch
    const branchIndex = branches.findIndex(b => b.name === selectedBranch);
    const gridY = branchIndex !== -1 ? branchIndex : 0;
    
    const sameBranchCommits = commits.filter(c => c.branch === selectedBranch);
    const maxBranchGridX = sameBranchCommits.length > 0 
      ? Math.max(...sameBranchCommits.map(c => c.gridX)) 
      : parentCommit.gridX;
    
    const gridX = Math.max(parentCommit.gridX + 1, maxBranchGridX + 1);

    const newHash = 'c-' + Math.random().toString(36).substring(3, 7);
    const newCommit: TimelineCommit = {
      hash: newHash,
      message: newSnapshotMsg,
      timestamp: new Date(),
      branch: selectedBranch,
      author: 'OPERATOR',
      parentHashes: [parentCommit.hash],
      gridX,
      gridY,
      status: newSnapshotStatus,
    };

    // Update commits
    const updatedCommits = [...commits, newCommit].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setCommits(updatedCommits);

    // Update branch head
    setBranches(prev => prev.map(b => b.name === selectedBranch ? { ...b, head: newHash } : b));
    
    setSelectedCommit(newHash);
    setNewSnapshotMsg('');
    setIsSnapshotModalOpen(false);
    toast.success(`Snapshot state ${newHash.toUpperCase()} committed on ${selectedBranch}.`);
  };

  // Add Branch
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      toast.error('Please specify a branch handle.');
      return;
    }

    const formattedName = newBranchName.toLowerCase().replace(/\s+/g, '-');
    if (branches.some(b => b.name === formattedName)) {
      toast.error('Branch handle already exists.');
      return;
    }

    const parentCommit = commits.find(c => c.hash === selectedCommit) || commits[commits.length - 1];

    const newBranch: TimelineBranch = {
      name: formattedName,
      color: newBranchColor,
      head: parentCommit.hash,
    };

    setBranches(prev => [...prev, newBranch]);
    setSelectedBranch(formattedName);
    setIsBranchModalOpen(false);
    setNewBranchName('');
    toast.success(`Created new branching node "${formattedName}" split from ${parentCommit.hash.toUpperCase()}`);
  };

  return (
    <div 
      id="neural-timeline-panel"
      className={`flex flex-col h-full w-full rounded-2xl overflow-hidden border p-5 gap-5 ${
        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#050505] border-white/5 text-gray-300'
      }`}
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
            <GitBranch className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className={`text-sm font-bold font-mono uppercase tracking-widest ${isLight ? 'text-gray-900' : 'text-white'}`}>Neural Timeline</h2>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-wider">Non-linear Git-like branching & rollback state engine</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsSnapshotModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-500/15"
          >
            <GitCommit className="w-3.5 h-3.5" /> Snapshot State
          </button>
          
          <button
            onClick={() => setIsBranchModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-mono rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' : 'bg-black border-white/10 hover:bg-white/5 text-gray-300'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" /> Create Branch
          </button>
        </div>
      </div>

      {/* Non-linear Branching Map & Canvas */}
      <div className={`relative rounded-xl border flex-1 min-h-[220px] overflow-auto ${
        isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-black/40 border-white/5'
      }`}>
        {/* Canvas for rendering git branches */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none w-[600px] h-[180px]"
          style={{ width: '600px', height: '180px' }}
        />

        {/* Buttons overlays corresponding to grid positions of commits */}
        <div className="relative w-[600px] h-[180px]">
          {commits.map((commit) => {
            const cx = 35 + commit.gridX * 90;
            const cy = 25 + commit.gridY * 45;
            const branchColor = branches.find(b => b.name === commit.branch)?.color || '#6366f1';
            const isSelected = selectedCommit === commit.hash;

            return (
              <button
                key={commit.hash}
                onClick={() => setSelectedCommit(commit.hash)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer group"
                style={{ left: cx, top: cy }}
              >
                {/* Custom tooltip details */}
                <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 p-2 rounded-lg border text-[9px] font-mono opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl z-50 ${
                  isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#090514] border-white/10 text-white'
                }`}>
                  <div className="flex justify-between font-bold mb-1">
                    <span style={{ color: branchColor }}>{commit.branch.toUpperCase()}</span>
                    <span className="opacity-40">{commit.hash.toUpperCase()}</span>
                  </div>
                  <div className="line-clamp-2 mb-1 text-left">{commit.message}</div>
                  <div className="flex justify-between opacity-50 border-t border-white/5 pt-1 mt-1 text-[8px]">
                    <span>BY: {commit.author}</span>
                    <span>{commit.timestamp.toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Box and list of active logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Selected Commit details */}
        <div className={`p-4 rounded-xl border md:col-span-1 flex flex-col gap-2.5 relative overflow-hidden ${
          isLight ? 'bg-indigo-50/40 border-indigo-100' : 'bg-indigo-950/5 border-indigo-500/10'
        }`}>
          {(() => {
            const commit = commits.find(c => c.hash === selectedCommit) || commits[0];
            const branchInfo = branches.find(b => b.name === commit.branch);
            
            return (
              <>
                <div className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Snap State Workspace
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span 
                      className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase"
                      style={{ backgroundColor: `${branchInfo?.color}20`, color: branchInfo?.color }}
                    >
                      {commit.branch}
                    </span>
                    <span className="text-[10px] font-mono font-bold opacity-50">
                      {commit.hash.toUpperCase()}
                    </span>
                  </div>
                  <h3 className={`text-xs font-bold font-sans ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {commit.message}
                  </h3>
                </div>

                <div className="text-[10px] font-mono space-y-1 mt-1">
                  <div className="flex justify-between opacity-75">
                    <span>STATE RATING:</span>
                    <span className="text-emerald-500 font-bold">EXCELLENT (94%)</span>
                  </div>
                  <div className="flex justify-between opacity-75">
                    <span>STATUS:</span>
                    <span className="uppercase font-bold tracking-wider" style={{ color: branchInfo?.color }}>
                      {commit.status}
                    </span>
                  </div>
                  <div className="flex justify-between opacity-75">
                    <span>DATE INDEXED:</span>
                    <span>{commit.timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRollback(commit.hash)}
                  className="mt-3 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase tracking-wider transition-colors shadow-md shadow-indigo-500/10"
                >
                  ROLLBACK SYSTEM TO STATE
                </button>
              </>
            );
          })()}
        </div>

        {/* History log listing */}
        <div className={`p-4 rounded-xl border md:col-span-2 flex flex-col gap-2 min-h-[140px] ${
          isLight ? 'bg-white border-gray-200' : 'bg-white/[0.01] border-white/5'
        }`}>
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">Snapshot Node History</div>
          <div className="flex-1 overflow-y-auto max-h-[120px] space-y-1.5 pr-1">
            {[...commits].reverse().map((commit) => {
              const branchInfo = branches.find(b => b.name === commit.branch);
              const isActive = selectedCommit === commit.hash;

              return (
                <div 
                  key={commit.hash}
                  onClick={() => setSelectedCommit(commit.hash)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                    isActive 
                      ? isLight 
                        ? 'bg-indigo-50 border-indigo-300' 
                        : 'bg-indigo-500/10 border-indigo-500/30'
                      : isLight 
                      ? 'bg-gray-50 border-gray-100 hover:border-gray-200' 
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[75%]">
                    <span 
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: branchInfo?.color }}
                    />
                    <span className="opacity-50 text-[10px] shrink-0 font-bold">{commit.hash.toUpperCase()}</span>
                    <span className="truncate">{commit.message}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] opacity-60">
                    <span className="capitalize">{commit.status}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Snapshot / Commit Modal overlay */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form 
            onSubmit={handleCreateSnapshot}
            className={`w-full max-w-md rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl ${
              isLight ? 'bg-white border-gray-100' : 'bg-[#090514] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Create State Snapshot
              </h3>
              <GitCommit className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase opacity-50">Branch Destination</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={`px-3 py-2 text-xs font-mono rounded-xl outline-none border ${
                  isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black border-white/10 text-white'
                }`}
              >
                {branches.map(b => (
                  <option key={b.name} value={b.name}>{b.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase opacity-50">Snapshot Handle / Message</label>
              <input
                type="text"
                placeholder="e.g. Optimized visual prompt styles"
                value={newSnapshotMsg}
                onChange={(e) => setNewSnapshotMsg(e.target.value)}
                className={`px-3 py-2 text-xs font-mono rounded-xl outline-none border ${
                  isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black border-white/10 text-white'
                }`}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase opacity-50">State Status</label>
              <div className="flex gap-2">
                {(['checkpoint', 'stable', 'active'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setNewSnapshotStatus(status)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase border transition-all ${
                      newSnapshotStatus === status
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : isLight
                        ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        : 'bg-black border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono rounded-xl font-bold uppercase tracking-wider transition-colors"
              >
                Save Snapshot
              </button>
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className={`px-4 py-2 border text-[11px] font-mono rounded-xl font-bold uppercase tracking-wider transition-colors ${
                  isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' : 'bg-transparent border-white/10 hover:bg-white/5 text-gray-400'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Branch Modal overlay */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form 
            onSubmit={handleCreateBranch}
            className={`w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl ${
              isLight ? 'bg-white border-gray-100' : 'bg-[#090514] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Create Branch Node
              </h3>
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase opacity-50">New Branch Handle</label>
              <input
                type="text"
                placeholder="e.g. dev/neural-sound"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className={`px-3 py-2 text-xs font-mono rounded-xl outline-none border ${
                  isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black border-white/10 text-white'
                }`}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase opacity-50">Branch Color Index</label>
              <div className="flex gap-2">
                {['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#a855f7'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewBranchColor(color)}
                    className="w-6 h-6 rounded-full border border-white/20 relative cursor-pointer flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    {newBranchColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono rounded-xl font-bold uppercase tracking-wider transition-colors"
              >
                Forge Branch
              </button>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className={`px-4 py-2 border text-[11px] font-mono rounded-xl font-bold uppercase tracking-wider transition-colors ${
                  isLight ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700' : 'bg-transparent border-white/10 hover:bg-white/5 text-gray-400'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
