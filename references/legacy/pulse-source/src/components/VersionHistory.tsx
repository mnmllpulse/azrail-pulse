import React from 'react';

const VersionHistory = () => {
  const versions = [
    { id: 1, date: 'Сегодня', changes: 'Добавлен Orchestrator' },
    { id: 2, date: 'Вчера', changes: 'Обновлён дизайн' }
  ];

  return (
    <div className="space-y-3">
      {versions.map(v => (
        <div key={v.id} className="p-4 border border-white/10 rounded-2xl">
          <div className="text-xs text-zinc-400">{v.date}</div>
          <div>{v.changes}</div>
        </div>
      ))}
    </div>
  );
};

export default VersionHistory;
