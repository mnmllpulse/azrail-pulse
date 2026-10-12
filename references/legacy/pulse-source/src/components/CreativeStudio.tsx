import React, { useState } from 'react';

const CreativeStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);

  const generate = (type: string) => {
    setResult({
      type,
      content: `Сгенерировано: ${type} по запросу "${prompt}"`,
      status: 'success'
    });
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Creative Studio</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опиши, что нужно сгенерировать..."
        className="w-full h-32 bg-black/70 border border-white/10 rounded-2xl p-5"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {['Landing Page', 'Instagram Post', 'PDF Книга', 'Бренд-кит', 'Motion Video', 'Социальные карточки'].map(item => (
          <button
            key={item}
            onClick={() => generate(item)}
            className="p-6 border border-white/10 hover:border-indigo-500 rounded-3xl text-left transition-all"
          >
            <div className="font-bold">{item}</div>
            <div className="text-xs text-zinc-400 mt-2">AI Generation</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-12 p-8 bg-black/60 rounded-3xl">
          <h3 className="font-bold mb-4">Результат:</h3>
          <p>{result.content}</p>
        </div>
      )}
    </div>
  );
};

export default CreativeStudio;
