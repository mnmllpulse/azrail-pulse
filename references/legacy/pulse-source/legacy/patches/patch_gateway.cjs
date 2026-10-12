const fs = require('fs');
let file = fs.readFileSync('src/components/AIGatewayStats.tsx', 'utf8');

if (!file.includes('toast.success')) {
  file = file.replace(`import { Activity, Zap, Server, Database, BarChart3, Settings } from 'lucide-react';`, `import { Activity, Zap, Server, Database, BarChart3, Settings } from 'lucide-react';\nimport { toast } from 'sonner';`);
  
  file = file.replace(`<button className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors \${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}\`}>
                  Manage Workers
                </button>`, `<button onClick={() => { toast.success('Worker settings opened'); setShowSettings(false); }} className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors \${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}\`}>
                  Manage Workers
                </button>`);
                
  file = file.replace(`<button className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors \${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}\`}>
                  View Access Logs
                </button>`, `<button onClick={() => { toast.success('Access logs downloaded'); setShowSettings(false); }} className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors \${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'}\`}>
                  View Access Logs
                </button>`);
                
  file = file.replace(`<button className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors text-rose-500 hover:bg-rose-500/10\`}>
                  Restart Gateway
                </button>`, `<button onClick={() => { toast.success('Gateway restarting...'); setShowSettings(false); }} className={\`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors text-rose-500 hover:bg-rose-500/10\`}>
                  Restart Gateway
                </button>`);

  fs.writeFileSync('src/components/AIGatewayStats.tsx', file, 'utf8');
}
