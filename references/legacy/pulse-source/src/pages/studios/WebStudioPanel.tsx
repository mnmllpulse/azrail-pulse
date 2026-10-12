import React, { useState } from 'react';
import OrchestratorAgent from '../../agents/OrchestratorAgent';
import CreativeStudio from '../../components/CreativeStudio';
import ArchitectureStudio from '../../components/ArchitectureStudio';
import DevelopmentStudio from '../../components/DevelopmentStudio';
import MarketStudio from '../../components/MarketStudio';
import SystemConsciousness from '../../components/SystemConsciousness';

const WebStudioPanel = () => {
  const [activeSection, setActiveSection] = useState('orchestrator');

  const sections = [
    { id: 'orchestrator', label: 'Azrail Core', icon: '🧠' },
    { id: 'creative', label: 'Creative', icon: '🎨' },
    { id: 'architecture', label: 'Architecture', icon: '🏠' },
    { id: 'development', label: 'Development', icon: '💻' },
    { id: 'market', label: 'Market', icon: '🛒' },
    { id: 'research', label: 'Research', icon: '🔍' },
    { id: 'automation', label: 'Automation', icon: '⚡' },
    { id: 'data', label: 'Data', icon: '📊' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'deployment', label: 'Deployment', icon: '🚀' },
    { id: 'knowledge', label: 'Knowledge', icon: '📚' },
    { id: 'system', label: 'Control', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-[#05010a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-2 text-center">DARK MNML PULSE OS</h1>
        <p className="text-center text-zinc-400 mb-10">AI Operating System: Intent → Reality</p>

        {/* Главное меню */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-10 bg-black/40 p-2 rounded-3xl">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-3 px-4 rounded-2xl text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                activeSection === section.id 
                  ? 'bg-white text-black shadow-xl' 
                  : 'hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{section.icon}</span> {section.label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="rounded-3xl border border-white/10 p-8 bg-black/30 min-h-[600px]">
          {activeSection === 'orchestrator' && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold mb-4">Azrail Core</h2>
              <p className="text-zinc-400">Формулируй намерение — я трансформирую его в реальность</p>
              <div className="mt-8"><OrchestratorAgent /></div>
            </div>
          )}
          {activeSection === 'creative' && <CreativeStudio />}
          {activeSection === 'architecture' && <ArchitectureStudio />}
          {activeSection === 'development' && <DevelopmentStudio />}
          {activeSection === 'market' && <MarketStudio />}
          {activeSection === 'system' && <SystemConsciousness />}
          {['research', 'automation', 'data', 'security', 'deployment', 'knowledge'].includes(activeSection) && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold capitalize">{activeSection} Studio</h2>
              <p className="text-zinc-400">Модуль в стадии развертывания...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebStudioPanel;
