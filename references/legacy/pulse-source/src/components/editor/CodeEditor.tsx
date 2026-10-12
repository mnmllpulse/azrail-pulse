import React from 'react';

interface CodeEditorProps {
  content: string;
  onChange: (content: string) => void;
  isLight?: boolean;
}

export default function CodeEditor({ content, onChange, isLight }: CodeEditorProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-full p-4 font-mono text-xs outline-none resize-none ${
        isLight 
          ? 'bg-white text-zinc-800' 
          : 'bg-[#000000] text-zinc-300'
      }`}
      spellCheck={false}
    />
  );
}
