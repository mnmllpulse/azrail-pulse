import React, { useState } from 'react';

const AIPreview = () => {
  const [url, setUrl] = useState('');

  return (
    <div className="border border-white/10 rounded-3xl p-6">
      <input 
        type="text" 
        placeholder="Введи URL для предпросмотра"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="w-full p-4 bg-black/70 rounded-2xl"
      />
      <div className="mt-6 h-96 border border-dashed border-white/20 rounded-2xl flex items-center justify-center">
        {url ? `Предпросмотр: ${url}` : 'AI Preview Mode'}
      </div>
    </div>
  );
};

export default AIPreview;
