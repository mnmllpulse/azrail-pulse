import React from 'react';

const ComponentMarketplace = () => {
  const components = ['Button', 'Card', 'Navbar', 'Hero'];

  return (
    <div className="grid grid-cols-2 gap-4">
      {components.map(c => (
        <div key={c} className="p-6 border border-white/10 rounded-3xl hover:border-indigo-500/50">
          <div className="font-bold">{c}</div>
          <button className="mt-4 text-xs bg-white/10 px-4 py-2 rounded-xl">Добавить</button>
        </div>
      ))}
    </div>
  );
};

export default ComponentMarketplace;
