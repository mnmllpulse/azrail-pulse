import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileJson, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Check, 
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface FileExplorerProps {
  files: { [filename: string]: string };
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  isLight?: boolean;
}

// Simple helper to build tree from flat paths
const buildFileTree = (filePaths: string[]): TreeNode => {
  const root: TreeNode = { name: 'root', path: '', type: 'directory', children: [] };

  filePaths.forEach(filePath => {
    const parts = filePath.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (!current.children) current.children = [];

      let existingNode = current.children.find(node => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : []
        };
        current.children.push(existingNode);
      }

      current = existingNode;
    });
  });

  // Sort helper: folders first, then alphabetically
  const sortTree = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  };
  sortTree(root);

  return root;
};

const getFileIcon = (fileName: string, active: boolean) => {
  const iconClass = active ? 'text-indigo-400' : 'text-zinc-400';
  if (fileName.endsWith('.json')) return <FileJson className={`w-3.5 h-3.5 ${iconClass}`} />;
  if (fileName.endsWith('.css')) return <FileCode className={`w-3.5 h-3.5 text-pink-400`} />;
  if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return <FileCode className={`w-3.5 h-3.5 text-sky-400`} />;
  if (fileName.endsWith('.md')) return <FileText className={`w-3.5 h-3.5 text-emerald-400`} />;
  return <FileCode className={`w-3.5 h-3.5 ${iconClass}`} />;
};

export default function FileExplorer({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  isLight = false
}: FileExplorerProps) {
  const fileKeys = Object.keys(files);
  const tree = buildFileTree(fileKeys);

  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({
    'src': false // start with src expanded
  });
  const [addingToPath, setAddingToPath] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');

  const toggleFolder = (path: string) => {
    setCollapsedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleStartAdd = (path: string, type: 'file' | 'directory', e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingToPath(path);
    setNewItemType(type);
    setNewItemName('');
  };

  const handleConfirmAdd = () => {
    if (!newItemName.trim()) {
      setAddingToPath(null);
      return;
    }

    let fullPath = addingToPath ? `${addingToPath}/${newItemName}` : newItemName;
    
    // Auto-append appropriate extension if creating a file and no extension is provided
    if (newItemType === 'file' && !fullPath.includes('.')) {
      fullPath += '.tsx';
    }

    if (newItemType === 'directory') {
      // For directories, we can create a dummy file inside it to make it exist in our virtual flat fs
      fullPath += '/.keep';
    }

    if (files[fullPath] !== undefined) {
      toast.error('File or directory already exists');
      return;
    }

    onCreateFile(fullPath);
    setAddingToPath(null);
    setNewItemName('');
    toast.success(`Created ${newItemType}: ${newItemName}`);
  };

  const handleDeleteClick = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (path === 'src/App.tsx') {
      toast.error('Cannot delete core component src/App.tsx');
      return;
    }
    onDeleteFile(path);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isRoot = node.path === '';
    const isCollapsed = collapsedPaths[node.path];
    const isSelected = activeFile === node.path;
    const hasChildren = node.children && node.children.length > 0;
    const isAddingHere = addingToPath === node.path;

    if (isRoot) {
      return (
        <div className="space-y-1">
          {node.children?.map(child => renderNode(child, depth))}
          
          {/* Create at root button if we want to allow top level additions */}
          {addingToPath === '' && (
            <div className="pl-3 pr-2 py-1 flex items-center gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={newItemType === 'file' ? 'filename.tsx' : 'foldername'}
                className={`flex-1 px-2 py-0.5 text-[11px] font-mono rounded outline-none border ${
                  isLight 
                    ? 'bg-white border-zinc-200 text-zinc-800' 
                    : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
                onKeyDown={e => e.key === 'Enter' && handleConfirmAdd()}
                autoFocus
              />
              <button onClick={handleConfirmAdd} className="p-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setAddingToPath(null)} className="p-0.5 rounded bg-zinc-700 text-white hover:bg-zinc-650">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={node.path} className="select-none">
        {node.type === 'directory' ? (
          <div>
            {/* Directory Node */}
            <div
              onClick={() => toggleFolder(node.path)}
              className={`flex items-center justify-between pl-2 pr-2 py-1 rounded-lg cursor-pointer transition-all group ${
                isLight 
                  ? 'hover:bg-zinc-100 text-zinc-700' 
                  : 'hover:bg-white/5 text-zinc-300'
              }`}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-zinc-500">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
                {isCollapsed ? (
                  <Folder className="w-4 h-4 text-indigo-500/80 fill-indigo-500/10" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-indigo-400 fill-indigo-400/10" />
                )}
                <span className="text-xs font-mono font-medium tracking-wide truncate">{node.name}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleStartAdd(node.path, 'file', e)}
                  title="New File..."
                  className={`p-0.5 rounded hover:bg-zinc-800 transition-colors ${isLight ? 'text-zinc-600 hover:text-indigo-600 hover:bg-zinc-200' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Nested Adding Input */}
            <AnimatePresence>
              {isAddingHere && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                  style={{ paddingLeft: `${(depth + 1) * 12 + 18}px` }}
                >
                  <div className="flex items-center gap-2 py-1 pr-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      placeholder={newItemType === 'file' ? 'filename.tsx' : 'folder'}
                      className={`flex-1 px-2 py-0.5 text-[11px] font-mono rounded outline-none border ${
                        isLight 
                          ? 'bg-white border-zinc-200 text-zinc-800' 
                          : 'bg-zinc-950 border-zinc-800 text-white'
                      }`}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmAdd()}
                      autoFocus
                    />
                    <button onClick={handleConfirmAdd} className="p-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setAddingToPath(null)} className="p-0.5 rounded bg-zinc-700 text-white hover:bg-zinc-650">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nested Directory Contents */}
            <AnimatePresence initial={false}>
              {!isCollapsed && hasChildren && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-l border-zinc-800/50 ml-3.5 pl-0.5"
                >
                  {node.children?.map(child => renderNode(child, depth + 1))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* File Node */
          node.name !== '.keep' && (
            <div
              onClick={() => onSelectFile(node.path)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${
                isSelected 
                  ? (isLight ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/20') 
                  : (isLight ? 'hover:bg-zinc-100 text-zinc-600' : 'hover:bg-white/5 text-zinc-400')
              }`}
              style={{ paddingLeft: `${depth * 12 + 18}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                {getFileIcon(node.name, isSelected)}
                <span className="text-xs font-mono truncate">{node.name}</span>
              </div>

              {/* Action Buttons */}
              {node.path !== 'src/App.tsx' && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDeleteClick(node.path, e)}
                    title="Delete file"
                    className={`p-0.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* File Explorer Tools */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800/40 shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5">
          Workspace Files
        </span>
        <button
          onClick={(e) => handleStartAdd('', 'file', e)}
          title="Create new file in root"
          className={`p-1 rounded hover:bg-white/5 transition-colors ${isLight ? 'text-zinc-600 hover:text-indigo-600 hover:bg-zinc-200' : 'text-zinc-400 hover:text-white'}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {renderNode(tree)}
      </div>
    </div>
  );
}
