import React from 'react';

const DeployButton = () => {
  const deploy = () => {
    alert("🚀 Деплой на Cloudflare Pages + GitHub Actions запущен!");
  };

  return (
    <button 
      onClick={deploy}
      className="w-full py-5 text-xl font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3"
    >
      🚀 Deploy to Cloudflare + GitHub
    </button>
  );
};

export default DeployButton;
