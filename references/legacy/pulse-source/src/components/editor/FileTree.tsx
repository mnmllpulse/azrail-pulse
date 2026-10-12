import React from 'react';
import { FileCode, Folder } from 'lucide-react';

interface FileTreeProps {
  files: string[];
  activeFile: string;
  onFileSelect: (file: string) => void;
}

export default function FileTree({ files, activeFile, onFileSelect }: FileTreeProps) {
  return (
    <div className="w-48 border-r border-white/5 bg-black/20 p-2 flex flex-col gap-1">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-2 py-1">Explorer</div>
      {files.map(file => (
        <button
          key={file}
          onClick={() => onFileSelect(file)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono transition-all ${
            activeFile === file ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/5'
          }`}
        >
          <FileCode className="w-3 h-3" />
          {file}
        </button>
      ))}
    </div>
  );
}
