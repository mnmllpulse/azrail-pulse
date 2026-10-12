import React from 'react';

const MarketStudio = () => {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Market Studio</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-white/10 rounded-3xl p-8">
          <h3 className="font-bold text-xl">Готовые шаблоны</h3>
          <p className="text-zinc-400 mt-2">Более 200 шаблонов</p>
          <button className="mt-6 w-full py-3 bg-white/10 rounded-2xl">Просмотреть</button>
        </div>

        <div className="border border-white/10 rounded-3xl p-8">
          <h3 className="font-bold text-xl">Мои проекты</h3>
          <p className="text-zinc-400 mt-2">Сохранённые работы</p>
          <button className="mt-6 w-full py-3 bg-white/10 rounded-2xl">Открыть</button>
        </div>

        <div className="border border-white/10 rounded-3xl p-8">
          <h3 className="font-bold text-xl">Продажа работ</h3>
          <p className="text-zinc-400 mt-2">Зарабатывай на шаблонах</p>
          <button className="mt-6 w-full py-3 bg-emerald-600 rounded-2xl">Начать продавать</button>
        </div>
      </div>
    </div>
  );
};

export default MarketStudio;
