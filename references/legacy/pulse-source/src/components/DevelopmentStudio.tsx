import React, { useState } from 'react';

const DevelopmentStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');

  const styles = [
    'Dark Minimal Techno', 'Brutalist', 'Glassmorphism', 'Neubrutalism',
    'Cyberpunk', 'Organic 3D', 'Swiss Minimal', 'Retro 90s',
    'Futuristic', 'Corporate Premium', 'Startup Clean', 'Luxury Fashion',
    'NFT / Crypto', 'Medical', 'Education', 'Real Estate',
    'Restaurant', 'Portfolio', 'SaaS', 'E-commerce'
  ];

  const generate = () => {
    alert(`Генерирую сайт в стиле ${style} для запроса: ${prompt}`);
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Development Studio</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опиши сайт..."
        className="w-full h-32 bg-black/70 border border-white/10 rounded-2xl p-5"
      />

      <div className="mt-8">
        <h3 className="text-sm font-bold mb-4">20 стилей сайтов</h3>
        <div className="grid grid-cols-4 gap-3">
          {styles.map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`p-4 text-xs border rounded-2xl transition-all ${
                style === s ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!prompt || !style}
        className="mt-10 w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl font-bold text-xl"
      >
        Сгенерировать сайт
      </button>
    </div>
  );
};

export default DevelopmentStudio;
