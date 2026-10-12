import React from 'react';

const SocialTemplates = () => {
  const deployToGitHub = (platform: string) => {
    alert(`Экспортировано для ${platform} → GitHub + Cloudflare Pages`);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {['Instagram', 'TikTok', 'Telegram', 'YouTube'].map(p => (
        <div key={p} className="p-5 border border-white/10 rounded-3xl hover:border-indigo-500/50 transition-all">
          <div className="font-bold">{p}</div>
          <button 
            onClick={() => deployToGitHub(p)}
            className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm"
          >
            Генерировать + Deploy
          </button>
        </div>
      ))}
    </div>
  );
};

export default SocialTemplates;
