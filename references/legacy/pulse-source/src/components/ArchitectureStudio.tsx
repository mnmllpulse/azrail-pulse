import React, { useState } from 'react';

const ArchitectureStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);

  const generate = (type: string) => {
    setResult({
      type,
      content: `Архитектурный проект: ${type} — ${prompt}`,
      details: '3D модель, смета, планировка готовы'
    });
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Architecture Studio</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опиши проект дома или интерьера..."
        className="w-full h-32 bg-black/70 border border-white/10 rounded-2xl p-5"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {['Дом / Квартира', '3D Визуализация', 'Интерьер', 'Ландшафт', 'Смета + Чертежи'].map(item => (
          <button
            key={item}
            onClick={() => generate(item)}
            className="p-6 border border-white/10 hover:border-emerald-500 rounded-3xl text-left transition-all"
          >
            <div className="font-bold">{item}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-12 p-8 bg-black/60 rounded-3xl">
          <h3 className="font-bold mb-4">Результат:</h3>
          <p>{result.content}</p>
          <p className="text-emerald-400 mt-4">{result.details}</p>
        </div>
      )}
    </div>
  );
};

export default ArchitectureStudio;
