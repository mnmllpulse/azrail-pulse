import React, { useState } from 'react';

const FigmaSync = () => {
  const [url, setUrl] = useState('');

  const sync = () => {
    alert(`Импортирую Figma → Cloudflare + GitHub`);
  };

  return (
    <div className="p-6 border border-white/10 rounded-3xl">
      <input 
        type="text" 
        placeholder="https://figma.com/file/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full p-4 bg-black/70 border border-white/10 rounded-2xl"
      />
      <button onClick={sync} className="mt-4 w-full py-3 bg-violet-600 rounded-2xl font-bold">
        Импорт из Figma → Cloudflare
      </button>
    </div>
  );
};

export default FigmaSync;
