import React from 'react';
import BotManager from '../../components/bots/BotManager';

export default function BotManagerPanel({ isLight }: { isLight?: boolean }) {
  return (
    <div className="p-6">
      <h2 className={`text-xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>Bot Manager</h2>
      <BotManager isLight={isLight} />
    </div>
  );
}
