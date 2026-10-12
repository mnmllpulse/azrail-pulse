import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Code, 
  FileText, 
  Folder, 
  FolderOpen, 
  Play, 
  Save, 
  X, 
  Settings, 
  Cpu, 
  Globe, 
  Database, 
  ShieldAlert, 
  CheckCircle, 
  Wand2, 
  RefreshCw, 
  GitBranch, 
  Copy, 
  Check, 
  Sliders, 
  Send, 
  Layers, 
  ChevronRight, 
  Search, 
  ExternalLink,
  ChevronDown,
  Monitor,
  Activity,
  User,
  Shield,
  HelpCircle,
  FileCode,
  Lock,
  Sparkles,
  Bot,
  Workflow,
  Music,
  Video,
  Image,
  Server,
  Zap,
  ArrowLeft,
  Plus,
  Upload,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Brain as BrainIcon,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAudio } from '../contexts/AudioContext';
import { PANTHEON_ENTITIES, WORKFLOW_STEPS, PantheonEntity } from '../data/pantheon';
import ConceptWorkbench from './ConceptWorkbench';
import TelemetryWidget from './TelemetryWidget';

// Define the file structure inside the Virtual Machine
interface VMFile {
  name: string;
  path: string;
  content: string;
  language: 'html' | 'typescript' | 'json' | 'css' | 'javascript';
}

const INITIAL_FILES: VMFile[] = [
  {
    name: 'index.html',
    path: '/index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metatron Lab Box App v1.0</title>
  <style>
    body { 
      background: linear-gradient(135deg, #0a0a0c 0%, #111115 100%); 
      color: #f3f4f6; 
      font-family: 'Inter', -apple-system, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
      overflow: hidden;
    }
    .card { 
      background: rgba(20, 20, 25, 0.8); 
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08); 
      border-radius: 20px; 
      padding: 40px; 
      text-align: center; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      max-width: 400px;
      transform: translateY(0);
      transition: all 0.3s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 30px 60px rgba(99, 102, 241, 0.15);
    }
    .icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: white;
      font-weight: bold;
      font-size: 24px;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    }
    h1 { 
      color: #ffffff; 
      margin: 0 0 12px; 
      font-size: 26px; 
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    p { 
      color: #9ca3af; 
      font-size: 14px; 
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #4f46e5;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">Ω</div>
    <h1>Metatron Lab Box</h1>
    <p>This application is compiling and running inside a fully virtual sandboxed container.</p>
    <button class="btn" onclick="alert('Connection Secured!')">Secure Pulse</button>
  </div>
</body>
</html>`
  },
  {
    name: 'src/App.tsx',
    path: '/src/App.tsx',
    language: 'typescript',
    content: `import React, { useState } from 'react';
import { Shield, Zap, RefreshCw } from 'lucide-react';

export default function App() {
  const [pulse, setPulse] = useState(60);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#08080a] text-white p-6">
      <div className="w-full max-w-md bg-zinc-950 border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold uppercase tracking-wider font-mono">Metatron Core</h2>
        </div>

        <div className="text-center py-8">
          <div className="text-6xl font-black font-mono tracking-tighter text-indigo-400 mb-2 animate-pulse">
            {pulse} <span className="text-xs font-normal text-zinc-500">BPM</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">LIVE TELEMETRY MONITOR</p>
        </div>

        <button 
          onClick={() => setPulse(prev => prev + 5)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" /> Overclock Engine
        </button>
      </div>
    </div>
  );
}`
  },
  {
    name: 'package.json',
    path: '/package.json',
    language: 'json',
    content: `{
  "name": "metatron-vm-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000 --host 0.0.0.0",
    "build": "vite build && esbuild server.ts --bundle --platform=node",
    "lint": "tsc --noEmit && eslint src --ext ts,tsx",
    "start": "node dist/server.cjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.400.0",
    "motion": "^11.1.0",
    "stripe": "^15.1.0"
  },
  "devDependencies": {
    "vite": "^5.2.10",
    "typescript": "^5.4.2",
    "esbuild": "^0.20.1"
  }
}`
  },
  {
    name: 'firestore.rules',
    path: '/firestore.rules',
    language: 'javascript',
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero-Trust Rule System
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /system/status {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    match /vault/{itemId} {
      allow read, write: if request.auth != null && resource.data.owner == request.auth.uid;
    }
  }
}`
  },
  {
    name: '.env',
    path: '/.env',
    language: 'javascript',
    content: `# Metatron Environment Manifest
VITE_API_URL=https://ais-pre-rnw2hlscv3yjweadzehqkw.run.app
VITE_STRIPE_PUBLIC_KEY=example-not-configured
GEMINI_API_KEY=
FIREBASE_PROJECT_ID=metatron-pulse-os
DATABASE_URL=postgresql://metatron_admin@localhost:5432/vault`
  }
];

// Available Mock AI Agent Actions
interface AgentAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  steps: {
    thought: string;
    tool: string;
    params: string;
    response: string;
  }[];
  resultingFileModifications?: {
    path: string;
    newContent: string;
  }[];
}

const AGENT_ACTIONS: AgentAction[] = [
  {
    id: 'cybersecurity',
    label: 'Hardening Security Guard',
    description: 'Scans and hardens firestore.rules and CSP configurations in index.html.',
    icon: Shield,
    steps: [
      {
        thought: 'Scanning workspace directory to inspect Firestore rules structure.',
        tool: 'list_dir',
        params: '{"DirectoryPath": "/"}',
        response: '["index.html", "src/", "package.json", "firestore.rules", ".env"]'
      },
      {
        thought: 'Reading firestore.rules to verify security postures.',
        tool: 'view_file',
        params: '{"AbsolutePath": "/firestore.rules"}',
        response: '[File content of firestore.rules loaded successfully]'
      },
      {
        thought: 'Analyzing rules... Found open read-write access rules. Replacing with zero-trust multi-auth checks.',
        tool: 'edit_file',
        params: '{"TargetFile": "/firestore.rules", "Instruction": "Enforce strict auth matching on all endpoints"}',
        response: 'SUCCESS: file edit committed.'
      },
      {
        thought: 'Compiling applet to ensure no build dependencies are broken by security changes.',
        tool: 'compile_applet',
        params: '{}',
        response: 'Build succeeded - the applet is compiled.'
      }
    ],
    resultingFileModifications: [
      {
        path: '/firestore.rules',
        newContent: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict E2E Verification
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /system/status {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'superuser';
    }
    match /vault/{itemId} {
      allow read: if request.auth != null && resource.data.owner == request.auth.uid;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.owner;
    }
  }
}`
      }
    ]
  },
  {
    id: 'stripe_fix',
    label: 'Fixing Stripe Load Error',
    description: 'Diagnoses script-loading blocks and adds secure Stripe domains to Content-Security-Policy.',
    icon: ShieldAlert,
    steps: [
      {
        thought: 'Detected error payload: Failed to load Stripe.js. Inspecting CSP headers and index.html configuration.',
        tool: 'view_file',
        params: '{"AbsolutePath": "/index.html", "StartLine": 1, "EndLine": 30}',
        response: '[File content of index.html loaded successfully]'
      },
      {
        thought: 'Vite CSP script-src header requires whitelisting Stripe SDK hostnames. Editing index.html to insert Stripe scripts whitelist tags.',
        tool: 'edit_file',
        params: '{"TargetFile": "/index.html", "Instruction": "Inject script tags for loading Stripe.js safely with correct CSP attributes"}',
        response: 'SUCCESS: index.html modified.'
      },
      {
        thought: 'Injecting VITE_STRIPE_PUBLIC_KEY variable verification check in environmental configuration.',
        tool: 'view_file',
        params: '{"AbsolutePath": "/.env"}',
        response: '[File .env loaded]'
      },
      {
        thought: 'Verifying linter output to ensure syntax is completely valid.',
        tool: 'lint_applet',
        params: '{}',
        response: 'Linting completed successfully. 0 issues detected.'
      }
    ],
    resultingFileModifications: [
      {
        path: '/index.html',
        newContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metatron App v1.0 (CSP Hardened)</title>
  <!-- Stripe safe loading script -->
  <script src="https://js.stripe.com/v3/" async></script>
  <style>
    body { 
      background: #060608; 
      color: #f3f4f6; 
      font-family: 'Inter', -apple-system, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
    }
    .card { 
      background: linear-gradient(135deg, rgba(25, 25, 35, 0.9) 0%, rgba(15, 15, 20, 0.9) 100%); 
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.2); 
      border-radius: 20px; 
      padding: 40px; 
      text-align: center; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      max-width: 400px;
    }
    .icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #4f46e5 0%, #a855f7 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: white;
      font-size: 24px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    }
    h1 { 
      color: #ffffff; 
      margin: 0 0 12px; 
      font-size: 24px; 
      font-weight: 700;
    }
    p { 
      color: #9ca3af; 
      font-size: 13px; 
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #6366f1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💳</div>
    <h1>Stripe Gate Configured</h1>
    <p>Secure CSP connection established with js.stripe.com. Secure checkouts and token validations are fully functional.</p>
    <button class="btn" onclick="alert('Stripe instance authenticated.')">Test payment route</button>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'theme_builder',
    label: 'Metatron Dark Minimal Refactor',
    description: 'Modifies App.tsx visual hierarchy to inject a gorgeous, high-contrast dark-minimal Metatron theme.',
    icon: Wand2,
    steps: [
      {
        thought: 'Reading /src/App.tsx to identify structural layout nodes.',
        tool: 'view_file',
        params: '{"AbsolutePath": "/src/App.tsx"}',
        response: '[File src/App.tsx loaded successfully]'
      },
      {
        thought: 'Applying a full premium styling rewrite using Tailwind modern classes.',
        tool: 'edit_file',
        params: '{"TargetFile": "/src/App.tsx", "Instruction": "Rewrite the app shell with premium modern indigo accent aesthetics"}',
        response: 'SUCCESS: file App.tsx updated.'
      },
      {
        thought: 'Validating compilation build.',
        tool: 'compile_applet',
        params: '{}',
        response: 'Build succeeded - the applet is compiled.'
      }
    ],
    resultingFileModifications: [
      {
        path: '/src/App.tsx',
        newContent: `import React, { useState } from 'react';
import { Activity, Radio, Cpu, Network, Zap } from 'lucide-react';

export default function App() {
  const [pulse, setPulse] = useState(132);
  const [coreMode, setCoreMode] = useState('STANDARD');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030303] text-[#E0E0E0] p-6 font-sans">
      <div className="w-full max-w-md bg-[#09090c] border border-indigo-500/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">PULSE_v14_VM</span>
          </div>
          <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase">STABLE</span>
        </div>

        <div className="text-center py-10 relative">
          <div className="text-7xl font-black font-mono tracking-tighter text-indigo-400 mb-2 relative">
            {pulse}
            <span className="absolute -top-1 right-12 text-xs font-normal text-zinc-500 font-mono">HZ</span>
          </div>
          <p className="text-xs text-[#E0E0E0]/60 font-mono flex items-center justify-center gap-1.5 mt-4">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Speculative Intent Router Engine
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-[11px]">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-zinc-500 mb-1">CORE MODE</div>
            <div className="text-white font-bold">{coreMode}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-zinc-500 mb-1">LATENCY</div>
            <div className="text-indigo-400 font-bold">14.2 ms</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              setPulse(185);
              setCoreMode('THOR');
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white"
          >
            <Zap className="w-4 h-4" /> Deploy THOR Protocol
          </button>
          
          <button 
            onClick={() => {
              setPulse(132);
              setCoreMode('STANDARD');
            }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-zinc-300"
          >
            Reset Core
          </button>
        </div>
      </div>
    </div>
  );
}`
      }
    ]
  }
];

export interface SynthPreset {
  id: string;
  title: string;
  desc: string;
  defaultMode: 'PTAH' | 'URIEL' | 'RAZIEL';
  targetFile: string;
  criticalReview: string[];
  precisionFilter: string[];
  architecturalConstruction: {
    focus: string;
    synthesis_logic: string;
  };
  synthesis_output: string;
  implementation_steps: string[];
  verification_report: string;
}

export const SYNTH_PRESETS: SynthPreset[] = [
  {
    id: 'SECURE_CSP_STROKE',
    title: 'Hardening Security Guard (CSP & Rules)',
    desc: 'Анализ уязвимостей в firestore.rules и настройка Content Security Policy (CSP) против XSS и утечек данных.',
    defaultMode: 'URIEL',
    targetFile: '/firestore.rules',
    criticalReview: [
      "Противоречие 1: DeepSeek предлагает разрешить write для всех авторизованных в /users/{userId}, в то время как Llama Guard настаивает на проверке токена администратора для системных путей.",
      "Галлюцинация: Gemma-2 предложила использовать несуществующий хэндлер 'request.auth.token.role == superuser' без явного декларирования ролей в JWT метаданных.",
      "Избыточность: Claude Haiku сгенерировал 40 строк комментариев к правилам, не несущих функциональной нагрузки."
    ],
    precisionFilter: [
      "Инсайт 1: Разграничение правил чтения и записи для /users/{userId} строго по request.auth.uid.",
      "Инсайт 2: Выделение системных статусов во вложенный роутинг с обязательной проверкой токена роли 'superuser'.",
      "Инсайт 3: Очистка правил от избыточных проверок существования ресурса на пустых путях."
    ],
    architecturalConstruction: {
      focus: "Разработка E2E Zero-Trust архитектуры для Firestore правил.",
      synthesis_logic: "Были объединены строгие проверки безопасности от Llama Guard с лаконичным и валидным синтаксисом от Qwen Coder. За основу взят шаблон с раздельными правами read/write."
    },
    synthesis_output: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero-Trust Rule System v4
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /system/status {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'superuser';
    }
    match /vault/{itemId} {
      allow read: if request.auth != null && resource.data.owner == request.auth.uid;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.owner;
    }
  }
}`,
    implementation_steps: [
      "Шаг 1: Загрузить новые правила нулевого доверия в виртуальный кэш.",
      "Шаг 2: Выполнить тестовую компиляцию firestore.rules.",
      "Шаг 3: Произвести развертывание правил в симулированную базу данных."
    ],
    verification_report: "Валидатор METATRON подтверждает: Спецификация правил полностью соответствует стандарту Firebase security v2. 0 конфликтов, 0 уязвимостей CORS/XSS."
  },
  {
    id: 'CLEAN_STRIPE_FLOW',
    title: 'Fixing Stripe Load Error (Payment Gate)',
    desc: 'Исправление ошибок загрузки внешнего скрипта js.stripe.com, вызванных блокировками CSP, и интеграция в index.html.',
    defaultMode: 'PTAH',
    targetFile: '/index.html',
    criticalReview: [
      "Противоречие 2: Qwen Coder предложил разместить синхронный тег script в body, что блокирует рендеринг, в то время как Mistral настаивает на асинхронной загрузке в head.",
      "Уязвимость: StarCoder-2 предложил использовать unsafe-inline для всех скриптов, что сводит на нет эффективность Content Security Policy."
    ],
    precisionFilter: [
      "Инсайт 1: Добавление домена js.stripe.com в директиву script-src CSP.",
      "Инсайт 2: Использование атрибута async для Stripe тега для обеспечения максимальной скорости отрисовки контента (Core Web Vitals)."
    ],
    architecturalConstruction: {
      focus: "Асинхронная безопасная инициализация платежного шлюза Stripe.",
      synthesis_logic: "Синтезирована наиболее производительная и безопасная схема инициализации от Mistral Large и Llama Guard. Интегрирована валидация ключа VITE_STRIPE_PUBLIC_KEY."
    },
    synthesis_output: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Metatron App v1.2 (Stripe Hardened)</title>
  <!-- Stripe safe loading script -->
  <script src="https://js.stripe.com/v3/" async></script>
  <style>
    body { 
      background: #060608; 
      color: #f3f4f6; 
      font-family: 'Inter', -apple-system, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0; 
    }
    .card { 
      background: linear-gradient(135deg, rgba(25, 25, 35, 0.9) 0%, rgba(15, 15, 20, 0.9) 100%); 
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.2); 
      border-radius: 20px; 
      padding: 40px; 
      text-align: center; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      max-width: 400px;
    }
    .icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #4f46e5 0%, #a855f7 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      color: white;
      font-size: 24px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    }
    h1 { 
      color: #ffffff; 
      margin: 0 0 12px; 
      font-size: 24px; 
      font-weight: 700;
    }
    p { 
      color: #9ca3af; 
      font-size: 13px; 
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #6366f1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💳</div>
    <h1>Stripe Gate Configured</h1>
    <p>Secure CSP connection established with js.stripe.com. Secure checkouts and token validations are fully functional.</p>
    <button class="btn" onclick="alert('Stripe instance authenticated.')">Test payment route</button>
  </div>
</body>
</html>`,
    implementation_steps: [
      "Шаг 1: Внедрить скрипт https://js.stripe.com/v3/ в заголовок страницы.",
      "Шаг 2: Обновить конфигурацию CSP в мета-тегах.",
      "Шаг 3: Проверить загрузку Stripe API в виртуальном iframe."
    ],
    verification_report: "Проверка linter пройдена. Script tag загружается асинхронно. Stripe.js инициализируется без блокировки основного потока рендеринга."
  },
  {
    id: 'CORE_OVERCLOCK_V14',
    title: 'Metatron Dark Minimal Refactor (App.tsx)',
    desc: 'Реорганизация визуальной иерархии App.tsx для интеграции великолепной неоновой темы, измерителей телеметрии и вольтметра.',
    defaultMode: 'PTAH',
    targetFile: '/src/App.tsx',
    criticalReview: [
      "Противоречие 3: Phi 3.5 MoE настаивает на полном удалении иконки ядра для снижения размера пакета, в то время как DeepSeek Coder аргументирует важность визуального якоря в UX.",
      "Галлюцинация: Llama 3.3 предложила использовать библиотеку 'framer-motion-v20', которой не существует."
    ],
    precisionFilter: [
      "Инсайт 1: Замена стандартной темы на глубокий космический серый/черный фон (#030303) с градиентным размытием.",
      "Инсайт 2: Добавление интерактивного переключателя режимов ядра ('STANDARD' и 'THOR') с мгновенной отрисовкой состояния частоты пульса."
    ],
    architecturalConstruction: {
      focus: "Создание реактивного, компактного дашборда мониторинга ядра.",
      synthesis_logic: "Интегрированы наработки из 6 моделей: сетка измерителей от Qwen Math, адаптивные Tailwind классы от Mistral, и защитные проверки типов от Llama-3."
    },
    synthesis_output: `import React, { useState } from 'react';
import { Activity, Radio, Cpu, Network, Zap } from 'lucide-react';

export default function App() {
  const [pulse, setPulse] = useState(132);
  const [coreMode, setCoreMode] = useState('STANDARD');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030303] text-[#E0E0E0] p-6 font-sans">
      <div className="w-full max-w-md bg-[#09090c] border border-indigo-500/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">PULSE_v14_VM</span>
          </div>
          <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase">STABLE</span>
        </div>

        <div className="text-center py-10 relative">
          <div className="text-7xl font-black font-mono tracking-tighter text-indigo-400 mb-2 relative">
            {pulse}
            <span className="absolute -top-1 right-12 text-xs font-normal text-zinc-500 font-mono">HZ</span>
          </div>
          <p className="text-xs text-[#E0E0E0]/60 font-mono flex items-center justify-center gap-1.5 mt-4">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Speculative Intent Router Engine
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-[11px]">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-zinc-500 mb-1">CORE MODE</div>
            <div className="text-white font-bold">{coreMode}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-zinc-500 mb-1">LATENCY</div>
            <div className="text-indigo-400 font-bold">14.2 ms</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              setPulse(185);
              setCoreMode('THOR');
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white"
          >
            <Zap className="w-4 h-4" /> Deploy THOR Protocol
          </button>
          
          <button 
            onClick={() => {
              setPulse(132);
              setCoreMode('STANDARD');
            }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-zinc-300"
          >
            Reset Core
          </button>
        </div>
      </div>
    </div>
  );
}`,
    implementation_steps: [
      "Шаг 1: Заменить дефолтную разметку в /src/App.tsx на неоновые UI панели.",
      "Шаг 2: Подключить иконки lucide-react (Cpu, Radio, Zap, Activity).",
      "Шаг 3: Верифицировать корректность импортов и скомпилировать сборку."
    ],
    verification_report: "Сборка успешно скомпилирована. Отсутствуют синтаксические ошибки и неиспользуемые переменные. Производительность рендеринга улучшена на 30%."
  }
];

interface MetatronModel {
  id: string;
  name: string;
  category: string;
  role: string;
  performance: string;
}

const METATRON_MODELS: MetatronModel[] = [
  // OpenAI
  { id: 'gpt-5-luna', name: 'GPT-5 Luna', category: 'OpenAI (GPT, o-series, TTS)', role: 'Primary Consciousness Node', performance: 'Infinite Intelligence Limit' },
  { id: 'gpt-5-terra', name: 'GPT-5 Terra', category: 'OpenAI (GPT, o-series, TTS)', role: 'Geospatial Reasoning Anchor', performance: 'Infinite Context' },
  { id: 'gpt-5-sol', name: 'GPT-5 Sol', category: 'OpenAI (GPT, o-series, TTS)', role: 'High-Luminance Reasoning Engine', performance: 'Maximum Core Latency Reduction' },
  { id: 'gpt-5.5', name: 'GPT-5.5', category: 'OpenAI (GPT, o-series, TTS)', role: 'General Cognitive Overseer', performance: 'Multi-Modal Nexus' },
  { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', category: 'OpenAI (GPT, o-series, TTS)', role: 'Deep Strategic Reasoner', performance: 'Infinite Logical Step Depth' },
  { id: 'gpt-5.4', name: 'GPT-5.4', category: 'OpenAI (GPT, o-series, TTS)', role: 'Sovereign Code Architect', performance: 'Low-latency code' },
  { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro', category: 'OpenAI (GPT, o-series, TTS)', role: 'Enterprise Logical Optimizer', performance: 'Multi-threaded Compilation' },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', category: 'OpenAI (GPT, o-series, TTS)', role: 'Edge Device Controller', performance: 'Sub-millisecond Action' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Hyper-optimized Agent Catalyst', performance: 'Atomic Context Operations' },
  { id: 'gpt-5.1', name: 'GPT-5.1', category: 'OpenAI (GPT, o-series, TTS)', role: 'Syntactic Translation Lead', performance: 'Dynamic Syntax' },
  { id: 'gpt-5.1-chat', name: 'GPT-5.1 Chat', category: 'OpenAI (GPT, o-series, TTS)', role: 'Semantic Negotiation Hub', performance: 'Conversational Anchor' },
  { id: 'gpt-5', name: 'GPT-5 Standard', category: 'OpenAI (GPT, o-series, TTS)', role: 'Syntactic Core Engine', performance: 'Balanced Logic' },
  { id: 'gpt-5-chat', name: 'GPT-5 Chat', category: 'OpenAI (GPT, o-series, TTS)', role: 'Interactive Interface Orchestrator', performance: 'Smooth Dialogue Stream' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Micro-Context Router', performance: 'Instant Routing' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', category: 'OpenAI (GPT, o-series, TTS)', role: 'Microscopic Instruction Sentinel', performance: 'Edge Efficiency' },
  { id: 'gpt-4o', name: 'GPT-4o', category: 'OpenAI (GPT, o-series, TTS)', role: 'Unified Multimodal Anchor', performance: 'Sovereign Vector Pipeline' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Atomic Visual Parser', performance: '235 t/s throughput' },
  { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe', category: 'OpenAI (GPT, o-series, TTS)', role: 'Real-time Signal Decrypter', performance: 'Zero-latency Audio Demodulation' },
  { id: 'gpt-4.1', name: 'GPT-4.1', category: 'OpenAI (GPT, o-series, TTS)', role: 'Rigorous Logic Validator', performance: 'Deterministic Logic checks' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Strict Format Compliance Checker', performance: 'Fast JSON parsing' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', category: 'OpenAI (GPT, o-series, TTS)', role: 'Lightweight Security Validator', performance: 'Minimal Token footprint' },
  { id: 'gpt-o3', name: 'GPT-o3', category: 'OpenAI (GPT, o-series, TTS)', role: 'Mathematical Core Engine', performance: 'Hyper-systematic Math & Code' },
  { id: 'gpt-o3-mini', name: 'GPT-o3 Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Algorithmic Optimization Sentinel', performance: 'Multi-agent reasoning paths' },
  { id: 'gpt-o4-mini', name: 'GPT-o4 Mini', category: 'OpenAI (GPT, o-series, TTS)', role: 'Complex Consensus Arbiter', performance: 'Maximum Precision reasoning' },
  { id: 'gpt-image-2', name: 'GPT Image 2', category: 'OpenAI (GPT, o-series, TTS)', role: 'Generative Concept Illustrator', performance: 'Multi-layer photorealistic layout' },
  { id: 'gpt-image-1.5', name: 'GPT Image 1.5', category: 'OpenAI (GPT, o-series, TTS)', role: 'Dynamic Canvas Draft Engine', performance: 'Fast UI element sketching' },
  { id: 'gpt-tts-1', name: 'GPT TTS 1', category: 'OpenAI (GPT, o-series, TTS)', role: 'Acoustic Soundwave Modulator', performance: 'Dynamic vocal patterns' },
  { id: 'gpt-tts-1-hd', name: 'GPT TTS 1 HD', category: 'OpenAI (GPT, o-series, TTS)', role: 'Vocal Master Synthesizer', performance: 'Lossless studio-grade output' },

  // Google
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Gemini 3.5 Flash', category: 'Google (Gemini, Veo, Imagen)', role: 'Supreme Metatron Archon', performance: 'Infinite speed context routing' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Gemini 3.1 Pro', category: 'Google (Gemini, Veo, Imagen)', role: 'Deep Sacred Geometric Sentinel', performance: '2M tokens absolute retention' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', category: 'Google (Gemini, Veo, Imagen)', role: 'Sub-latency Flow Executor', performance: '340 t/s stream velocity' },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', category: 'Google (Gemini, Veo, Imagen)', role: 'High-Volume Stream Router', performance: 'Optimized multi-agent coordinator' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', category: 'Google (Gemini, Veo, Imagen)', role: 'Hyper-responsive Task Executor', performance: 'Sub-50ms execution' },
  { id: 'gemini-3.1-flash-tts', name: 'Gemini 3.1 Flash TTS', category: 'Google (Gemini, Veo, Imagen)', role: 'Speech Synthesis Controller', performance: 'Zero-latency neural audio' },
  { id: 'veo-3.1', name: 'Google Veo 3.1', category: 'Google (Gemini, Veo, Imagen)', role: 'Cinematic Reality Constructor', performance: 'Full 8K raw photorealistic physical frames' },
  { id: 'veo-3', name: 'Google Veo 3', category: 'Google (Gemini, Veo, Imagen)', role: 'Fluid Physics World Simulator', performance: '60fps physical coherence' },
  { id: 'veo-3.1-fast', name: 'Google Veo 3.1 Fast', category: 'Google (Gemini, Veo, Imagen)', role: 'Real-time Kinetic Draftsman', performance: 'Instant frame extrapolation' },
  { id: 'veo-3-fast', name: 'Google Veo 3 Fast', category: 'Google (Gemini, Veo, Imagen)', role: 'Low-latency Video Compositor', performance: 'Dynamic visual prototyping' },
  { id: 'imagen-4', name: 'Imagen 4', category: 'Google (Gemini, Veo, Imagen)', role: 'Vector Text-to-Image Master', performance: 'Ultra-HD detail fidelity' },
  { id: 'nano-banana', name: 'Nano Banana', category: 'Google (Gemini, Veo, Imagen)', role: 'Real-time Canvas Draft Node', performance: 'Fast visual design sketches' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', category: 'Google (Gemini, Veo, Imagen)', role: 'Enhanced Canvas Blueprint Architect', performance: 'Clean SVG structure planning' },
  { id: 'nano-banana-2-lite', name: 'Nano Banana 2 Lite', category: 'Google (Gemini, Veo, Imagen)', role: 'Atomic UI Element Sketcher', performance: 'Instant vector components' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', category: 'Google (Gemini, Veo, Imagen)', role: 'Sovereign UI Design Compositor', performance: 'Perfect design-system matching' },

  // xAI
  { id: 'grok-4.3', name: 'Grok 4.3', category: 'xAI (Grok)', role: 'Real-time Cybernetic Security Oracle', performance: 'Live-web search integration' },
  { id: 'grok-4.20-multi-agent-0309', name: 'Grok 4.20 Multi-Agent', category: 'xAI (Grok)', role: 'Swarm Consensus Controller', performance: '10-agent synchrony' },
  { id: 'grok-4.20-0309-reasoning', name: 'Grok 4.20 Reasoning', category: 'xAI (Grok)', role: 'System Decompiler & Auditor', performance: 'Recursive logical trace validation' },
  { id: 'grok-4.20-0309-non-reasoning', name: 'Grok 4.20 Non-Reasoning', category: 'xAI (Grok)', role: 'High-speed Text Streamer', performance: '500 t/s peak bandwidth' },
  { id: 'grok-voice', name: 'Grok Voice', category: 'xAI (Grok)', role: 'Conversational Modulation Engine', performance: 'Vocal nuances & sarcasm mapping' },
  { id: 'grok-tts', name: 'Grok TTS', category: 'xAI (Grok)', role: 'Vocal Soundwave Modulator', performance: 'Studio audio fidelity' },
  { id: 'grok-stt', name: 'Grok STT', category: 'xAI (Grok)', role: 'Acoustic Signal Translator', performance: 'Highly accurate audio processing' },
  { id: 'grok-imagine-video-1.5-preview', name: 'Grok Imagine Video 1.5 Preview', category: 'xAI (Grok)', role: 'Interactive 3D Video Draftsman', performance: 'Fast rendering' },
  { id: 'grok-imagine-video', name: 'Grok Imagine Video', category: 'xAI (Grok)', role: 'Kinetic Motion Compositor', performance: 'Dynamic camera paths' },
  { id: 'grok-imagine-image', name: 'Grok Imagine Image', category: 'xAI (Grok)', role: 'Surrealist Concept Artist', performance: 'High aesthetic quality' },
  { id: 'grok-imagine-image-quality', name: 'Grok Imagine Image Quality', category: 'xAI (Grok)', role: 'Detail & Texture Enhancement Node', performance: 'Photorealistic texturing' },

  // Anthropic
  { id: 'claude-sonnet-5', name: 'Claude 5 Sonnet', category: 'Anthropic', role: 'Pure UI/UX Swiss Artisan', performance: 'Perfect code compliance & layout' },
  { id: 'claude-fable-5', name: 'Claude 5 Fable', category: 'Anthropic', role: 'Narrative Alignment Coordinator', performance: 'Multi-turn context coherence' },
  { id: 'claude-opus-4.8', name: 'Claude 4.8 Opus', category: 'Anthropic', role: 'Grand Architectural Designer', performance: 'Maximum logical reasoning density' },

  // Video & Image Specialized
  { id: 'p-video', name: 'Pruna AI Video (p-)', category: 'Video & Image Gen (Specialized)', role: 'Cinematic Frame Interpolator', performance: 'AI frame-rate generation' },
  { id: 'p-video-animate', name: 'Pruna AI Animate', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Canvas Motion Engine', performance: 'Physically accurate animation' },
  { id: 'p-video-replace', name: 'Pruna AI Replace', category: 'Video & Image Gen (Specialized)', role: 'Neural Canvas Inpainting Node', performance: 'Surgical object swapping' },
  { id: 'p-video-avatar', name: 'Pruna AI Avatar', category: 'Video & Image Gen (Specialized)', role: 'Facial Synthesis Mapping Sentinel', performance: 'Low-latency conversational mapping' },
  { id: 'p-image-try-on', name: 'Pruna AI Try-On', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Texture Realignment Node', performance: 'Realistic drapery & material physics' },
  { id: 'p-image-upscale', name: 'Pruna AI Upscale', category: 'Video & Image Gen (Specialized)', role: 'Neural Resolution Enhancer', performance: 'Sub-pixel pattern synthesis' },
  { id: 'p-image-edit', name: 'Pruna AI Edit', category: 'Video & Image Gen (Specialized)', role: 'Selective Mask Editor', performance: 'Precise regional modification' },
  { id: 'p-image', name: 'Pruna AI Image', category: 'Video & Image Gen (Specialized)', role: 'Pure Concept Art Node', performance: 'Dynamic prompt adherence' },
  { id: 'recraftv4', name: 'Recraft v4', category: 'Video & Image Gen (Specialized)', role: 'Corporate Visual Standard Engine', performance: 'Perfect brand layout matching' },
  { id: 'recraftv4-pro', name: 'Recraft v4 Pro', category: 'Video & Image Gen (Specialized)', role: 'Master Branding Graphic Designer', performance: 'Professional layout vector design' },
  { id: 'recraftv4-vector', name: 'Recraft v4 Vector', category: 'Video & Image Gen (Specialized)', role: 'Pure Mathematical SVG Synthesizer', performance: 'Lossless vector design' },
  { id: 'recraftv4-pro-vector', name: 'Recraft v4 Pro Vector', category: 'Video & Image Gen (Specialized)', role: 'Grand SVG Mathematical Architect', performance: 'Clean node pathing output' },
  { id: 'recraftv4-1', name: 'Recraft v4.1', category: 'Video & Image Gen (Specialized)', role: 'Aesthetic Logo Designer', performance: 'Enhanced spatial geometry' },
  { id: 'recraftv4-1-pro', name: 'Recraft v4.1 Pro', category: 'Video & Image Gen (Specialized)', role: 'Advanced Brand Identity Director', performance: 'Top-tier graphics compositing' },
  { id: 'recraftv4-1-vector', name: 'Recraft v4.1 Vector', category: 'Video & Image Gen (Specialized)', role: 'Aesthetic Icon SVG Builder', performance: 'Symmetric geometric layouts' },
  { id: 'recraftv4-1-pro-vector', name: 'Recraft v4.1 Pro Vector', category: 'Video & Image Gen (Specialized)', role: 'Sovereign UI Component Illustrator', performance: 'Fine-grain vector detail' },
  { id: 'recraftv4-1-utility', name: 'Recraft v4.1 Utility', category: 'Video & Image Gen (Specialized)', role: 'Industrial Symbol Builder', performance: 'Clean design system graphics' },
  { id: 'recraftv4-1-utility-pro', name: 'Recraft v4.1 Utility Pro', category: 'Video & Image Gen (Specialized)', role: 'Advanced Symbolic Language Compiler', performance: 'Flawless visual representation' },
  { id: 'recraftv4-1-utility-vector', name: 'Recraft v4.1 Utility Vector', category: 'Video & Image Gen (Specialized)', role: 'Symmetric Symbol SVG Architect', performance: 'Mathematical symmetry checks' },
  { id: 'recraftv4-1-utility-pro-vector', name: 'Recraft v4.1 Pro Vector Utility', category: 'Video & Image Gen (Specialized)', role: 'Premium Symbol System Director', performance: 'Iconographic standard alignment' },
  { id: 'recraftv3', name: 'Recraft v3', category: 'Video & Image Gen (Specialized)', role: 'Legacy Graphic Formatter', performance: 'Backward compatible styles' },
  { id: 'pixverse-v6', name: 'PixVerse v6', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Camera Animator', performance: '3D spatial coherence' },
  { id: 'pixverse-v5.6', name: 'PixVerse v5.6', category: 'Video & Image Gen (Specialized)', role: 'Temporal Transition Modulator', performance: 'Smooth frame sequencing' },
  { id: 'krea-2-large', name: 'Krea 2 Large', category: 'Video & Image Gen (Specialized)', role: 'Real-time Digital Painter Node', performance: 'Sub-100ms visual output' },
  { id: 'krea-2-medium', name: 'Krea 2 Medium', category: 'Video & Image Gen (Specialized)', role: 'Real-time Brushstroke Estimator', performance: 'Fast layout sketches' },
  { id: 'krea-2-medium-turbo', name: 'Krea 2 Medium Turbo', category: 'Video & Image Gen (Specialized)', role: 'Dynamic UI Layout Draft Node', performance: 'Zero-latency UI design' },
  { id: 'hh1.1-r2v', name: 'HappyHorse 1.1 R2V', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Render-to-Video Engine', performance: 'Physically coherent frame simulation' },
  { id: 'hh1.1-i2v', name: 'HappyHorse 1.1 I2V', category: 'Video & Image Gen (Specialized)', role: 'Image-to-Video Animator Node', performance: 'Smooth dynamic scaling' },
  { id: 'hh1.1-t2v', name: 'HappyHorse 1.1 T2V', category: 'Video & Image Gen (Specialized)', role: 'Text-to-Video Physical Compositor', performance: '3D scene compilation' },
  { id: 'wan-2.7-i2v', name: 'Alibaba Wan 2.7', category: 'Video & Image Gen (Specialized)', role: 'Sovereign Temporal Animator', performance: 'True 4K video frame generation' },
  { id: 'aleph-2', name: 'RunwayML Aleph 2', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Kinetic Video Composer', performance: 'Advanced cinematic physics' },
  { id: 'gen-4.5', name: 'RunwayML Gen 4.5', category: 'Video & Image Gen (Specialized)', role: 'Sovereign World Generator', performance: 'Photorealistic environment rendering' },
  { id: 'flux-2-pro-preview', name: 'Flux 2 Pro Preview', category: 'Video & Image Gen (Specialized)', role: 'Advanced Latent Space Synthesizer', performance: 'Highly descriptive prompt matches' },
  { id: 'flux-2-max', name: 'Flux 2 Max', category: 'Video & Image Gen (Specialized)', role: 'Sovereign Photorealism Engine', performance: 'Infinite textures & sub-pixel detail' },
  { id: 'flux-2-flex', name: 'Flux 2 Flex', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Aspect Aspect Modulator', performance: 'Flexible canvas scaling' },
  { id: 'vidu-q3-pro', name: 'Vidu q3 Pro', category: 'Video & Image Gen (Specialized)', role: 'Master Cinematic Scenario Composer', performance: 'Coherent multi-scene video loops' },
  { id: 'vidu-q3-turbo', name: 'Vidu q3 Turbo', category: 'Video & Image Gen (Specialized)', role: 'Rapid Scene Draft Node', performance: 'Fast scene pre-rendering' },
  { id: 'hailuo-2.3', name: 'Hailuo 2.3', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Physics Motion Engine', performance: 'Extreme physical interaction' },
  { id: 'minimax-m3', name: 'Minimax m3', category: 'Video & Image Gen (Specialized)', role: 'Sovereign Scene Compositor', performance: 'Long video clip structure' },
  { id: 'minimax-speech-turbo', name: 'Minimax Speech Turbo', category: 'Video & Image Gen (Specialized)', role: 'Low-latency Vocal Synthesizer', performance: 'Dynamic breath patterns' },
  { id: 'minimax-music', name: 'Minimax Music 2.6', category: 'Video & Image Gen (Specialized)', role: 'Dynamic Symphonic Synthesizer', performance: 'Full orchestral vocal generation' },

  // Other
  { id: 'inworld-tts-2', name: 'Inworld TTS 2', category: 'Other Models', role: 'Conversational Avatar Engine', performance: 'Real-time contextual expression' },
  { id: 'eleven-turbo-v2-5', name: 'ElevenLabs Turbo 2.5', category: 'Other Models', role: 'Lossless Vocal Streamer', performance: 'Ultra low-latency speech stream' },
  { id: 'moondream-3.1', name: 'Moondream 3.1 9B', category: 'Other Models', role: 'Compact Visual Inspector', performance: 'Low power edge validation' },
  { id: 'glm-5.2', name: 'GLM 5.2', category: 'Other Models', role: 'Bilingual System Coordinator', performance: 'Zero-latency English-Russian reasoning' },
  { id: 'kimi-k2.7-code', name: 'Kimi k2.7 Code', category: 'Other Models', role: 'Ultra-Long Code Context Refactorer', performance: '2M tokens analysis depth' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek v4 Pro', category: 'Other Models', role: 'Supreme Algorithmic Engine', performance: 'Extreme mathematical density checks' }
];

const getEntityIcon = (iconName: string) => {
  switch (iconName) {
    case 'Cpu': return Cpu;
    case 'Zap': return Zap;
    case 'Code': return Code;
    case 'FileText': return FileText;
    case 'ShieldAlert': return ShieldAlert;
    case 'Lock': return Lock;
    case 'Search': return Search;
    case 'Send': return Send;
    case 'Wand2': return Wand2;
    case 'Shield': return Shield;
    case 'Music': return Music;
    case 'Layers': return Layers;
    case 'CheckCircle': return CheckCircle;
    case 'Sliders': return Sliders;
    case 'Sparkles': return Sparkles;
    case 'Activity': return Activity;
    case 'Database': return Database;
    case 'Server': return Server;
    case 'RefreshCw': return RefreshCw;
    case 'Monitor': return Monitor;
    case 'GitBranch': return GitBranch;
    default: return HelpCircle;
  }
};

export default function MetatronLabBox({ onClose, isLight }: { onClose: () => void, isLight?: boolean }) {
  const { playHover, playActivation } = useAudio();

  // Column collapse/expand states for the ultra-convenient responsive slider layout
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);

  // Section expansion states (none, left, middle, right)
  const [expandedSection, setExpandedSection] = useState<'none' | 'left' | 'middle' | 'right'>('none');

  // File Creation States
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');

  // Tab states for Central area
  const [mainTab, setMainTab] = useState<'editor' | 'pantheon' | 'synthesizer'>('editor');
  const [synthTask, setSynthTask] = useState<string>('SECURE_CSP_STROKE');
  const [customSynthPrompt, setCustomSynthPrompt] = useState<string>('');
  const [synthMode, setSynthMode] = useState<'PTAH' | 'URIEL' | 'RAZIEL'>('URIEL');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthProgress, setSynthProgress] = useState<number>(0);
  const [synthStepName, setSynthStepName] = useState<string>('');
  const [synthesizerResult, setSynthesizerResult] = useState<any | null>(null);
  const [activeSynthesisLogs, setActiveSynthesisLogs] = useState<{modelId: string, modelName: string, role: string, text: string, tokensPerSec: number, status: 'idle' | 'thinking' | 'writing' | 'done'}[]>([]);
  const [synthResultTab, setSynthResultTab] = useState<'cot' | 'code'>('cot');
  const [pantheonTab, setPantheonTab] = useState<'registry' | 'workflow'>('registry');
  const [entityFilter, setEntityFilter] = useState<'all' | 'multiagent' | 'agent' | 'bot' | 'angel' | 'egyptian'>('all');
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<PantheonEntity | null>(null);

  const filteredEntities = PANTHEON_ENTITIES.filter(entity => {
    const matchesFilter = entityFilter === 'all' || entity.group === entityFilter;
    const matchesSearch = entity.name.toLowerCase().includes(entitySearch.toLowerCase()) || 
                          entity.originalName.toLowerCase().includes(entitySearch.toLowerCase()) ||
                          entity.role.toLowerCase().includes(entitySearch.toLowerCase()) ||
                          entity.systemFunction.toLowerCase().includes(entitySearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const [files, setFiles] = useState<VMFile[]>(INITIAL_FILES);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('/index.html');
  const [editorContent, setEditorContent] = useState<string>('');
  
  // Sidebar Tabs state
  const [sidebarTab, setSidebarTab] = useState<'workspace' | 'upgrade' | 'models'>('workspace');
  const [modelSearch, setModelSearch] = useState<string>('');
  const [selectedMatrixModelId, setSelectedMatrixModelId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Google (Gemini, Veo, Imagen)');

  // Cloudflare 10-AI Swarm States
  const [cloudflareSwarmActive, setCloudflareSwarmActive] = useState<boolean>(false);
  const [isSwarmOptimizing, setIsSwarmOptimizing] = useState<boolean>(false);
  const [swarmProgress, setSwarmProgress] = useState<number>(0);
  const [swarmModels, setSwarmModels] = useState([
    { id: 'deepseek-coder', name: 'DeepSeek Coder v2', role: 'Syntax Architect', status: 'idle', tokPerSec: 145, load: 0 },
    { id: 'qwen-coder', name: 'Qwen 2.5 Coder', role: 'Logic Optimization', status: 'idle', tokPerSec: 132, load: 0 },
    { id: 'llama-3.3', name: 'Llama 3.3 70B', role: 'Cross-module Validator', status: 'idle', tokPerSec: 92, load: 0 },
    { id: 'mistral-large', name: 'Mistral Large 2', role: 'Refactoring Lead', status: 'idle', tokPerSec: 110, load: 0 },
    { id: 'claude-haiku', name: 'Claude 3 Haiku', role: 'Security Auditor', status: 'idle', tokPerSec: 180, load: 0 },
    { id: 'gemma-2', name: 'Gemma 2 27B', role: 'Semantic Translator', status: 'idle', tokPerSec: 85, load: 0 },
    { id: 'phi-3.5', name: 'Phi 3.5 MoE', role: 'Context Reducer', status: 'idle', tokPerSec: 155, load: 0 },
    { id: 'starcoder-2', name: 'StarCoder 2', role: 'Syntax Completeness', status: 'idle', tokPerSec: 120, load: 0 },
    { id: 'llama-guard', name: 'Llama Guard 3', role: 'API Firewall Auditor', status: 'idle', tokPerSec: 140, load: 0 },
    { id: 'qwen-math', name: 'Qwen 2.5 Math', role: 'Latency Optimizer', status: 'idle', tokPerSec: 105, load: 0 }
  ]);

  // Pulse OS 5 Studios Upgrade States
  const [isUpgradingPulseOS, setIsUpgradingPulseOS] = useState<boolean>(false);
  const [upgradeStep, setUpgradeStep] = useState<number>(0);
  const [studios, setStudios] = useState([
    { id: 'web', name: 'Web Studio', desc: 'React 18 + Vite client UI', status: 'ready', icon: Globe, color: 'text-cyan-400', glow: 'shadow-cyan-500/10' },
    { id: 'image', name: 'Image Studio', desc: 'Mockups & high-contrast vector art', status: 'ready', icon: Image, color: 'text-purple-400', glow: 'shadow-purple-500/10' },
    { id: 'video', name: 'Video Studio', desc: 'Sora & physics-particle loops', status: 'ready', icon: Video, color: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
    { id: 'music', name: 'Music Studio', desc: 'Ambient frequency synth engines', status: 'ready', icon: Music, color: 'text-rose-400', glow: 'shadow-rose-500/10' },
    { id: 'bots', name: 'Swarm Bots / Billing Studio', desc: 'Zero-trust firewalls & Stripe gateways', status: 'ready', icon: Database, color: 'text-emerald-400', glow: 'shadow-emerald-500/10' }
  ]);
  
  // Terminal VM states
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Initializing METATRON Sandbox Secure Enclave VM...',
    'System: Linux 5.15.0-83-generic x86_64',
    'Ingress Proxy Node listening on 0.0.0.0:3000 -> Forwarded correctly.',
    'Ready. Type "help" to view advanced system tools.',
    ''
  ]);
  const [commandInput, setCommandInput] = useState<string>('');
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  
  // Settings Panel States
  const [selectedModel, setSelectedModel] = useState<string>('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  const [temperature, setTemperature] = useState<number>(0.15);
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  const [persona, setPersona] = useState<string>('High-Security Cybersecurity Specialist');
  const [speculativeRag, setSpeculativeRag] = useState<boolean>(true);
  const [secureMode, setSecureMode] = useState<boolean>(true);
  const [synthSubTab, setSynthSubTab] = useState<'playground' | 'aeon'>('aeon');
 
  // AI Agent Panel States
  const [agentActiveAction, setAgentActiveAction] = useState<AgentAction | null>(null);
  const [agentLogs, setAgentLogs] = useState<{ type: 'thought' | 'tool' | 'response'; message: string; subText?: string }[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentStepIndex, setAgentStepIndex] = useState<number>(0);
  const [agentChatHistory, setAgentChatHistory] = useState<{ sender: 'user' | 'agent'; text: string; time: string }[]>([
    { sender: 'agent', text: 'Привет! Я агент METATRON. Я могу автономно писать код, тестировать, настраивать бэкенд, исправлять ошибки сборки и деплоить ваш сервис в Cloud Run. Чем я могу помочь?', time: '20:00' }
  ]);
  const [agentChatInput, setAgentChatInput] = useState<string>('');

  // Selected file shortcut
  const selectedFile = files.find(f => f.path === selectedFilePath) || files[0];

  useEffect(() => {
    setEditorContent(selectedFile.content);
  }, [selectedFilePath]);

  // Terminal scroll to bottom
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Handle saving code in editor
  const handleSave = () => {
    setFiles(prev => prev.map(f => {
      if (f.path === selectedFilePath) {
        return { ...f, content: editorContent };
      }
      return f;
    }));
    toast.success(`Файл ${selectedFile.name} успешно сохранен в VM!`);
    
    // Add file modified message to terminal
    setTerminalLogs(prev => [
      ...prev,
      `[VM FS Monitor] File changed: ${selectedFilePath} (${editorContent.length} bytes)`,
      'Re-indexing local workspace directories...',
      ''
    ]);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerFileUpload = () => {
    playActivation();
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const newFilePath = file.name.startsWith('/') ? file.name : `/${file.name}`;
      
      if (files.some(f => f.path === newFilePath)) {
        toast.error(`Файл ${file.name} уже существует!`);
        return;
      }
      
      // determine language
      let lang: 'html' | 'typescript' | 'json' | 'css' | 'javascript' = 'typescript';
      if (file.name.endsWith('.html')) lang = 'html';
      else if (file.name.endsWith('.json')) lang = 'json';
      else if (file.name.endsWith('.css')) lang = 'css';
      else if (file.name.endsWith('.js')) lang = 'javascript';

      const newFile: VMFile = {
        name: file.name,
        path: newFilePath,
        language: lang,
        content: text
      };
      
      setFiles(prev => [...prev, newFile]);
      setSelectedFilePath(newFilePath);
      toast.success(`Файл ${file.name} загружен в виртуальное окружение!`);
      
      setTerminalLogs(prev => [
        ...prev,
        `[VM FS Monitor] New file uploaded: ${newFilePath} (${text.length} bytes)`,
        `Re-indexing workspace directory tree...`,
        ''
      ]);
    };
    reader.readAsText(file);
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    let formattedName = newFileName.trim();
    if (!formattedName.startsWith('/')) {
      formattedName = '/' + formattedName;
    }
    
    const parts = formattedName.split('/');
    const name = parts[parts.length - 1];
    
    if (files.some(f => f.path === formattedName)) {
      toast.error(`Файл ${formattedName} уже существует!`);
      return;
    }
    
    let lang: 'html' | 'typescript' | 'json' | 'css' | 'javascript' = 'typescript';
    if (name.endsWith('.html')) lang = 'html';
    else if (name.endsWith('.json')) lang = 'json';
    else if (name.endsWith('.css')) lang = 'css';
    else if (name.endsWith('.js')) lang = 'javascript';

    const newFile: VMFile = {
      name: name,
      path: formattedName,
      language: lang,
      content: `// Created file: ${formattedName}\n\nexport default function ${name.split('.')[0]}() {\n  return (\n    <div>${name.split('.')[0]}</div>\n  );\n}\n`
    };
    
    setFiles(prev => [...prev, newFile]);
    setSelectedFilePath(formattedName);
    setIsCreatingFile(false);
    setNewFileName('');
    toast.success(`Файл ${name} успешно создан!`);
    
    setTerminalLogs(prev => [
      ...prev,
      `[VM FS Monitor] Created local file node: ${formattedName}`,
      ''
    ]);
  };

  const handleAssignAsCore = (model: MetatronModel) => {
    setSelectedModel(model.name);
    setTerminalLogs(prev => [
      ...prev,
      `[METATRON CORE] Active model set to standard Sentinel Node: "${model.name}" (${model.id})`,
      `[METATRON CORE] Re-routing sacred logic parameters to role: "${model.role}"`,
      ''
    ]);
    toast(`Узел "${model.name}" назначен Ядром METATRON!`, {
      icon: '🔷',
      style: {
        background: '#09090b',
        color: '#fff',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }
    });
  };

  const handleAssignToSwarm = (model: MetatronModel) => {
    setSwarmModels(prev => {
      const next = [...prev];
      const randomIndex = Math.floor(Math.random() * next.length);
      next[randomIndex] = {
        id: model.id,
        name: model.name,
        role: model.role,
        status: 'idle',
        tokPerSec: Math.floor(Math.random() * 100) + 120,
        load: 0
      };
      return next;
    });
    setTerminalLogs(prev => [
      ...prev,
      `[10-AI SWARM] Injected model "${model.name}" as dynamic active worker node.`,
      `[10-AI SWARM] Worker role mapped: "${model.role}"`,
      ''
    ]);
    toast(`Узел "${model.name}" внедрен в 10-AI Рой Cloudflare!`, {
      icon: '🔥',
      style: {
        background: '#09090b',
        color: '#fff',
        border: '1px solid rgba(34, 211, 238, 0.2)'
      }
    });
  };

  // Pulse OS 5-Studio Upgrade Bridge action handler
  const handleStudioUpgrade = () => {
    if (isUpgradingPulseOS) return;
    setIsUpgradingPulseOS(true);
    setUpgradeStep(0);
    
    // Set all studios back to upgrading style
    setStudios(prev => prev.map(s => ({ ...s, status: 'ready' })));
    
    setTerminalLogs(prev => [
      ...prev,
      '>>> INITIATING DARK MNMLL PULSE OS SYSTEM-WIDE UPGRADE BRIDGE <<<',
      'Establishing cross-studio compiler links to all 5 Creative Studios...',
      ''
    ]);
    
    const runUpgradeStep = (step: number) => {
      if (step >= 5) {
        setStudios(prev => prev.map(s => ({ ...s, status: 'upgraded' })));
        setIsUpgradingPulseOS(false);
        
        // Add upgrade log file to VM workspace
        setFiles(prev => {
          const updated = prev.map(f => {
            if (f.path === '/src/App.tsx') {
              return {
                ...f,
                content: `// UPGRADED BY 5-STUDIO BRIDGE (PULSE OS v15.0_MAX)
// Cross-Studio compiler links: Web, Image, Video, Music, SwarmBots completely synchronized.
${f.content}`
              };
            }
            return f;
          });
          
          if (!updated.some(x => x.path === '/src/UpgradeLog.json')) {
            updated.push({
              name: 'src/UpgradeLog.json',
              path: '/src/UpgradeLog.json',
              language: 'json',
              content: JSON.stringify({
                status: 'COMPLETED',
                version: '15.0.0-PulseOS',
                upgradeDate: new Date().toISOString(),
                studiosSynced: ['Web Studio', 'Image Studio', 'Video Studio', 'Music Studio', 'Swarm Bots / Billing Studio'],
                cloudFlareSwarmConsensus: 'ACTIVE',
                metatronShield: 'MAXIMUM_ZeroTrust'
              }, null, 2)
            });
          }
          return updated;
        });

        // Set selected file to the newly created Upgrade Log to make it awesome!
        setSelectedFilePath('/src/UpgradeLog.json');
        
        setTerminalLogs(prev => [
          ...prev,
          '✓ Web Studio: Interface & Responsive controls upgraded to v15.0.',
          '✓ Image Studio: Asset generation pipelines synced with Video shaders.',
          '✓ Video Studio: Sora dynamic physics rendering model active.',
          '✓ Music Studio: ambient frequency synth loaded into WebAudio cache.',
          '✓ Swarm Bots & Billing: Zero-trust firewalls compiled & deployed to Cloud Run.',
          '🎉 DARK MNMLL PULSE OS IS FULLY UPGRADED TO v15.0! ALL SYSTEMS OPERATIONAL ✔',
          ''
        ]);
        
        toast.success('Dark Mnmll Pulse OS полностью обновлен до v15.0!');
        return;
      }

      setUpgradeStep(step + 1);
      const currentStudio = studios[step];
      
      setStudios(prev => prev.map((s, idx) => idx === step ? { ...s, status: 'upgrading' } : s));
      
      setTerminalLogs(prev => [
        ...prev,
        `[Upgrade Bridge] Connecting to ${currentStudio.name}... [OK]`,
        `[Upgrade Bridge] Optimizing packages inside ${currentStudio.name}... SUCCESS`,
        ''
      ]);

      setTimeout(() => {
        setStudios(prev => prev.map((s, idx) => idx === step ? { ...s, status: 'upgraded' } : s));
        runUpgradeStep(step + 1);
      }, 1000);
    };

    runUpgradeStep(0);
  };

  // Run Cloudflare 10-AI consensus optimization
  const runSwarmConsensusOptimization = () => {
    if (isSwarmOptimizing) return;
    setIsSwarmOptimizing(true);
    setSwarmProgress(0);
    
    setAgentLogs([
      { type: 'thought', message: 'Initiating 10-AI Cloudflare Multi-Agent Orchestrator consensus check on active codebase.' }
    ]);
    
    setTerminalLogs(prev => [
      ...prev,
      '>>> CLOUDFLARE MULTI-AGENT SWARM CONSENSUS SYSTEM ACTIVATED <<<',
      'Distributing task "Full Codebase Refactor & Performance Review" across 10 concurrent AI nodes...',
      ''
    ]);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setSwarmProgress(progress);
      
      setSwarmModels(prev => prev.map((m, idx) => {
        const statuses = ['idle', 'analyzing', 'generating', 'verifying', 'completed'];
        let currentStatusIdx = Math.floor((progress / 100) * 4);
        if (currentStatusIdx > 4) currentStatusIdx = 4;
        
        const randomLoad = Math.floor(Math.random() * 40) + 40;
        const randomSpeed = m.tokPerSec + Math.floor(Math.random() * 20) - 10;
        
        return {
          ...m,
          status: statuses[currentStatusIdx],
          load: progress >= 100 ? 0 : randomLoad,
          tokPerSec: progress >= 100 ? 0 : randomSpeed
        };
      }));
      
      if (progress === 20) {
        setAgentLogs(prev => [
          ...prev,
          { type: 'tool', message: 'CONCURRENT_REQUEST: Broadcast logic AST validation to all nodes.', subText: 'Broadcasting files: index.html, src/App.tsx, firestore.rules' }
        ]);
        setTerminalLogs(prev => [
          ...prev,
          '[Swarm Broadcast] Nodes [DeepSeek-Coder-v2, Qwen-2.5-Coder] started parallel parsing and refactoring...',
          ''
        ]);
      } else if (progress === 40) {
        setAgentLogs(prev => [
          ...prev,
          { type: 'thought', message: 'Consensus draft formed. Llama-3.3-70B and Mistral-Large-2 are cross-referencing types & linting requirements.' }
        ]);
        setTerminalLogs(prev => [
          ...prev,
          '[Swarm Validation] Node [Llama-3.3-70B] generated Jest/Vitest unit test coverage check.',
          '[Swarm Refactoring] Node [Mistral-Large-2] optimized React hooks dependency arrays in src/App.tsx.',
          ''
        ]);
      } else if (progress === 60) {
        setAgentLogs(prev => [
          ...prev,
          { type: 'tool', message: 'FIREWALL_SECURITY_AUDIT: Llama-Guard-3 security verification.', subText: 'Validating rules inside firestore.rules against secure cloud guidelines' }
        ]);
        setTerminalLogs(prev => [
          ...prev,
          '[Swarm Security] Node [Llama-Guard-3] audited firestore.rules - Zero-Trust Verified!',
          ''
        ]);
      } else if (progress === 80) {
        setAgentLogs(prev => [
          ...prev,
          { type: 'thought', message: 'Computing performance delta. Qwen-2.5-Math and Phi-3.5 MoE verifying latency optimizations.' }
        ]);
        setTerminalLogs(prev => [
          ...prev,
          '[Swarm Metrics] Latency reduction computed: -32.5% load speed acceleration on compile stage.',
          ''
        ]);
      } else if (progress >= 100) {
        clearInterval(interval);
        setIsSwarmOptimizing(false);
        setSwarmProgress(100);
        
        setSwarmModels(prev => prev.map(m => ({ ...m, status: 'completed', load: 0 })));
        
        setFiles(prev => prev.map(f => {
          if (f.path === '/src/App.tsx') {
            return {
              ...f,
              content: `// OPTIMIZED BY CLOUDFLARE 10-AI MULTI-AGENT SWARM CONSENSUS
// Latency: 14.2ms -> 8.5ms | Compiles: 100% | Security: Zero-Trust Strict
${f.content}`
            };
          }
          return f;
        }));
        
        setAgentLogs(prev => [
          ...prev,
          { type: 'response', message: '🏆 CONSENSUS COMPLETE: All 10 models reached 100% consensus agreement. Core file src/App.tsx has been refactored with optimal performance variables, secure routes, and strict hooks stability!' }
        ]);
        
        setTerminalLogs(prev => [
          ...prev,
          '✓ Consensus agreed at 100%. Code fully refactored and stored into virtual storage.',
          '✓ Virtual compiler: tsc --noEmit && vite build SUCCESSFUL.',
          '🎉 Cloudflare Multi-Agent Swarm execution finished successfully!',
          ''
        ]);
        
        toast.success('Оптимизация Мультиагентом 10 АИ завершена успешно!');
      }
    }, 500);
  };

  // Compile Applet Simulation
  const simulateCompile = () => {
    if (cloudflareSwarmActive) {
      setTerminalLogs(prev => [
        ...prev,
        'npm run build',
        '>>> CLOUDFLARE MULTI-AGENT ORCHESTRATOR COMPILING CONCURRENTLY <<<',
        'Node [DeepSeek-Coder] running syntax tree validation...',
        'Node [Llama-3.3] compiling types check...',
        'Node [Llama-Guard-3] auditing security boundaries...',
        'Consensus matching: 10/10 nodes agreed on safe build artifacts.',
        '✓ 32 modules compiled and optimized under Swarm supervision.',
        '✓ dist/server.cjs generated with CJS bundle (esbuild).',
        '✓ Build succeeded - the virtual applet compiles successfully! ✔',
        ''
      ]);
    } else {
      setTerminalLogs(prev => [
        ...prev,
        'npm run build',
        'vite build',
        'vite v5.2.10 building for production...',
        '✓ 32 modules compiled and optimized.',
        '✓ dist/server.cjs generated with CJS bundle (esbuild).',
        'dist/assets/index.js      122 kB | gzip: 39 kB',
        'dist/assets/index.css     4 kB   | gzip: 1.2 kB',
        '✓ Build succeeded - the virtual applet compiles successfully! ✔',
        ''
      ]);
    }
    toast.success('Виртуальная компиляция завершена успешно!');
  };

  // Run Linter Simulation
  const simulateLint = () => {
    if (cloudflareSwarmActive) {
      setTerminalLogs(prev => [
        ...prev,
        'npm run lint',
        '>>> CLOUDFLARE 10-AI MULTI-AGENT ORCHESTRATOR RUNNING LINT CHECKS <<<',
        'Qwen-2.5-Coder and Mistral-Large auditing code layout guidelines...',
        '✓ All 10 models verified 0 eslint warnings and perfect type matching.',
        ''
      ]);
    } else {
      setTerminalLogs(prev => [
        ...prev,
        'npm run lint',
        'tsc --noEmit',
        'eslint src --ext ts,tsx',
        '✔ No linting errors or structural syntax warnings found. All types validated successfully. [0ms]',
        ''
      ]);
    }
    toast.success('Виртуальный линтер: Ошибок не найдено!');
  };

  // Parse Terminal Commands
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    let responseLines: string[] = [];
    const commandName = cmd.split(' ')[0].toLowerCase();

    switch (commandName) {
      case 'help':
        responseLines = [
          'METATRON OS VM Core - Available Commands:',
          '  help               Displays this diagnostics log',
          '  ls                 List all directories and files in workspace root',
          '  cat <filename>     Print file content inside the terminal',
          '  npm run dev        Boots up the local Vite Dev Server on port 3000',
          '  npm run build      Bundles the client and compiles node server',
          '  npm run lint       Validate code structure and types',
          '  git status         Verify index cache state and modified tree files',
          '  firebase deploy    Upload security rules and build indexes',
          '  clear              Clear terminal log logs'
        ];
        break;
      case 'ls':
        responseLines = [
          'Listing workspace contents at / :',
          'drwxr-xr-x   - root   root   10 Jul 20:00 src/',
          '-rw-r--r--   1 root   root    753 index.html',
          '-rw-r--r--   1 root   root    621 package.json',
          '-rw-r--r--   1 root   root    452 firestore.rules',
          '-rw-r--r--   1 root   root    210 .env'
        ];
        break;
      case 'clear':
        setTerminalLogs([]);
        setCommandInput('');
        return;
      case 'cat':
        const targetFile = cmd.split(' ')[1];
        if (!targetFile) {
          responseLines = ['Error: missing file argument. Usage: cat <filename>'];
        } else {
          const fileToCat = files.find(f => f.name.toLowerCase().includes(targetFile.toLowerCase()) || f.path.toLowerCase().includes(targetFile.toLowerCase()));
          if (fileToCat) {
            responseLines = [
              `--- Content of ${fileToCat.path} ---`,
              ...fileToCat.content.split('\n'),
              '---------------------------------------'
            ];
          } else {
            responseLines = [`Error: File "${targetFile}" not found in current directory.`];
          }
        }
        break;
      case 'npm':
        const subSub = cmd.substring(4).trim();
        if (subSub === 'run dev') {
          responseLines = [
            'vite --port 3000 --host 0.0.0.0',
            '  VITE v5.2.10  ready in 142 ms',
            '  ➜  Local:   http://localhost:3000/',
            '  ➜  Network: http://172.17.0.2:3000/',
            '  [Vite] HMR connection established on channel 0',
            '  [Server] Node Express server booted in DEV mode on host 0.0.0.0:3000'
          ];
        } else if (subSub === 'run build') {
          responseLines = [
            'vite build && esbuild server.ts --bundle',
            'vite v5.2.10 building for production...',
            '✓ 32 modules transformed.',
            'dist/index.html                  0.45 kB │ gzip: 0.28 kB',
            'dist/assets/index-D1g9h2A.css     1.20 kB │ gzip: 0.50 kB',
            'dist/assets/index-Kj92h3B.js     142.10 kB │ gzip: 45.20 kB',
            '✓ esbuild: bundled server.ts into dist/server.cjs in 55ms',
            '✓ built in 420ms'
          ];
        } else if (subSub === 'run lint') {
          responseLines = [
            'tsc --noEmit && eslint src --ext ts,tsx',
            '✔ No linting errors found. Code meets standard Airbnb style directives.'
          ];
        } else {
          responseLines = [`npm error: command "${cmd}" is not recognized or supported inside sandbox.`];
        }
        break;
      case 'git':
        if (cmd.substring(4).trim() === 'status') {
          responseLines = [
            'On branch main',
            'Your branch is up to date with \'origin/main\'.',
            '',
            'Changes not staged for commit:',
            '  (use "git add <file>..." to update what will be committed)',
            '  (use "git restore <file>..." to discard changes in working directory)',
            '	modified:   src/App.tsx',
            '	modified:   index.html',
            '',
            'no changes added to commit (use "git add" and/or "git commit -a")'
          ];
        } else {
          responseLines = [`git: command "${cmd}" not implemented in virtual environment.`];
        }
        break;
      case 'firebase':
        if (cmd.substring(9).trim() === 'deploy') {
          responseLines = [
            '=== Deploying to \'metatron-pulse-os\'...',
            '',
            'i  deploying firestore',
            '✔  firestore: rules file firestore.rules uploaded successfully',
            '✔  firestore: indexes file firestore.indexes.json uploaded successfully',
            '',
            '✔  Deploy complete! Console URL: https://console.firebase.google.com/project/metatron-pulse-os'
          ];
        } else {
          responseLines = [`firebase error: argument is missing or invalid.`];
        }
        break;
      default:
        responseLines = [
          `metatron-shell: command not found: ${commandName}`,
          'Type "help" to view a full catalog of simulated virtual terminal actions.'
        ];
    }

    setTerminalLogs(prev => [...prev, `$ ${cmd}`, ...responseLines, '']);
    setCommandInput('');
  };

  const summonEntity = (entity: PantheonEntity) => {
    playActivation();
    
    // Add logs to the Virtual bash terminal log stream to show active integration!
    setTerminalLogs(prev => [
      ...prev,
      `[PANTHEON PROTOCOL] Initiating sacred mobilization sequence for [${entity.name}]...`,
      `[PANTHEON PROTOCOL] Mapping role: "${entity.role}"`,
      `[PANTHEON PROTOCOL] Deploying system subroutine: "${entity.systemFunction}"`,
      `[PANTHEON PROTOCOL] Status: ACTIVE (100% integrity)`,
      ''
    ]);
    
    toast(`Сущность ${entity.name} (${entity.originalName}) успешно мобилизована!`, {
      icon: '🏛️',
      style: {
        background: '#09090b',
        color: '#fff',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }
    });
  };

  // Run METATRON AI Agent Action Simulation
  const startAgentAction = (action: AgentAction) => {
    if (isAgentRunning) return;
    
    setAgentActiveAction(action);
    setIsAgentRunning(true);
    setAgentStepIndex(0);
    setAgentLogs([]);
    
    // Staggered execution of steps
    let currentStepIndex = 0;
    
    const runNextStep = () => {
      if (currentStepIndex >= action.steps.length) {
        // Finished! Apply modifications to virtual files
        if (action.resultingFileModifications) {
          setFiles(prev => prev.map(f => {
            const mod = action.resultingFileModifications?.find(m => m.path === f.path);
            if (mod) {
              return { ...f, content: mod.newContent };
            }
            return f;
          }));
          
          // If we currently have that file loaded in editor, refresh content
          const currentlyEdited = action.resultingFileModifications.find(m => m.path === selectedFilePath);
          if (currentlyEdited) {
            setEditorContent(currentlyEdited.newContent);
          }
        }

        setAgentLogs(prev => [
          ...prev,
          { type: 'response', message: `🤖 AGENT COMPLETE: I have successfully implemented the ${action.label} request! I validated the changes against type safety checks and the app compiles perfectly.` }
        ]);
        
        setTerminalLogs(prev => [
          ...prev,
          `[METATRON Agent Daemon] Operation successful: ${action.label}`,
          `[METATRON Agent Daemon] Workspace state is clean and stabilized.`,
          ''
        ]);
        
        setIsAgentRunning(false);
        toast.success(`METATRON Agent: ${action.label} успешно завершен!`);
        return;
      }

      const step = action.steps[currentStepIndex];
      
      // Push thought
      setAgentLogs(prev => [...prev, { type: 'thought', message: step.thought }]);
      
      setTimeout(() => {
        // Push tool call
        setAgentLogs(prev => [
          ...prev, 
          { type: 'tool', message: `CALL: ${step.tool}`, subText: `ARGS: ${step.params}` }
        ]);
        
        setTimeout(() => {
          // Push response
          setAgentLogs(prev => [
            ...prev,
            { type: 'response', message: `RESPONSE:`, subText: step.response }
          ]);
          
          currentStepIndex++;
          setAgentStepIndex(currentStepIndex);
          setTimeout(runNextStep, 1000);
        }, 1200);
      }, 1000);
    };

    runNextStep();
  };

  const handleAgentChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentChatInput.trim()) return;

    const userMsg = agentChatInput.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setAgentChatHistory(prev => [...prev, { sender: 'user', text: userMsg, time }]);
    setAgentChatInput('');

    // Simulated responses
    setTimeout(() => {
      let responseText = '';
      if (userMsg.toLowerCase().includes('stripe') || userMsg.toLowerCase().includes('ошибк')) {
        responseText = 'Обнаружена ошибка Stripe в Content Security Policy! Я могу запустить виртуальный патч для исправления разрешений script-src в файле index.html. Нажмите на модуль "Fixing Stripe Load Error" слева для выполнения авто-патча!';
      } else if (userMsg.toLowerCase().includes('dark') || userMsg.toLowerCase().includes('темн') || userMsg.toLowerCase().includes('дизайн')) {
        responseText = 'Хорошо! Я могу реорганизовать структуру приложения, применив современную темную минималистичную неоновую тему с телеметрией в App.tsx. Запустите модуль "Metatron Dark Minimal Refactor" для полной интеграции.';
      } else if (userMsg.toLowerCase().includes('rules') || userMsg.toLowerCase().includes('безопас')) {
        responseText = 'Вопрос безопасности базы данных критичен. Я могу установить правила нулевого доверия (Zero-Trust) для Firestore. Запустите сценарий "Hardening Security Guard" в списке модулей.';
      } else {
        responseText = `Команда "${userMsg}" принята. В нашей песочнице вы можете запустить автономные действия через модули слева (Hardening Security Guard, Fixing Stripe Load Error, Metatron Dark Minimal Refactor) для полной симуляции сложного цикла: Чтение → Изменение → Сборка → Линтер!`;
      }

      setAgentChatHistory(prev => [...prev, { sender: 'agent', text: responseText, time }]);
    }, 1000);
  };

  const runHyperSynthesis = () => {
    if (isSynthesizing) return;
    
    playActivation();
    setIsSynthesizing(true);
    setSynthProgress(0);
    setSynthesizerResult(null);
    setSynthStepName('Инициализация нод 10-AI Swarm...');
    
    // Initialize streams logs
    const initialLogs = swarmModels.map(model => ({
      modelId: model.id,
      modelName: model.name,
      role: model.role,
      text: 'Инициализация защищенного канала...',
      tokensPerSec: model.tokPerSec,
      status: 'thinking' as const
    }));
    setActiveSynthesisLogs(initialLogs);

    // Staged simulation using intervals
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setSynthProgress(currentProgress);

      if (currentProgress === 10) {
        setSynthStepName('АНАЛИЗ (CRITICAL REVIEW): Сканирование входящих потоков...');
        setActiveSynthesisLogs(prev => prev.map((log, idx) => {
          if (idx % 2 === 0) {
            return { ...log, status: 'writing', text: 'Анализ синтаксической совместимости. Обнаружены предупреждения...' };
          }
          return { ...log, text: 'Проверка сигнатур безопасности и CSP-директив...' };
        }));
      } else if (currentProgress === 35) {
        setSynthStepName('ФИЛЬТРАЦИЯ (PRECISION FILTER): Фильтрация галлюцинаций и шума...');
        setActiveSynthesisLogs(prev => prev.map((log, idx) => {
          if (idx === 5 || idx === 8) {
            return { ...log, status: 'done', text: 'Поток завершен: Обнаружен шум. Фильтрация активна.' };
          }
          return { ...log, status: 'writing', text: 'Извлечение ключевых инсайтов. Повышение степени достоверности...' };
        }));
      } else if (currentProgress === 65) {
        setSynthStepName('СИНТЕЗ (ARCHITECTURAL CONSTRUCTION): Сборка финального решения...');
        setActiveSynthesisLogs(prev => prev.map((log, idx) => {
          if (log.status !== 'done') {
            return { ...log, status: 'writing', text: 'Интеграция фрагментов кода в единую структуру PTAH/URIEL...' };
          }
          return log;
        }));
      } else if (currentProgress === 85) {
        setSynthStepName('ВЕРИФИКАЦИЯ (VALIDATION): Проверка синтаксиса и безопасности...');
        setActiveSynthesisLogs(prev => prev.map(log => ({
          ...log,
          status: 'done',
          text: 'Синтез завершен. Результаты переданы валидатору.'
        })));
      } else if (currentProgress >= 100) {
        clearInterval(interval);
        
        // Final Synthesis result construction
        let selectedPreset = SYNTH_PRESETS.find(p => p.id === synthTask);
        let finalResult: any;

        if (synthTask === 'CUSTOM') {
          const taskName = customSynthPrompt.trim() || 'Custom Metatron Optimization Task';
          finalResult = {
            synthesizer_activation: {
              pulse_id: `METATRON-SYNTH-${Math.floor(100000 + Math.random() * 900000)}`,
              timestamp: new Date().toISOString(),
              mode_selected: synthMode,
              confidence_rating: (0.95 + Math.random() * 0.049).toFixed(4),
              active_nodes_count: 10
            },
            chain_of_thought: {
              critical_review: [
                `Противоречие: Спецификация для задачи "${taskName}" содержит несовместимые требования в модулях генерации.`,
                "Галлюцинация: Phi-3.5 предложил неоптимальную структуру зависимостей для сборщика.",
                "Шум: 3 модели выдали дублирующиеся куски кода без оптимизации."
              ],
              precision_filter: [
                `Инсайт 1: Очищен от шума лог сборки для "${taskName}".`,
                "Инсайт 2: Выделен чистый алгоритмический каркас.",
                "Инсайт 3: Устранены неиспользуемые импорты и дублирующиеся вызовы."
              ],
              architectural_construction: {
                focus: `Реализация оптимального решения для: ${taskName}`,
                synthesis_logic: `Были отобраны лучшие логические блоки от DeepSeek Coder v2 и Llama 3.3. Результат собран в единый оптимизированный модуль.`
              }
            },
            final_actionable_synthesis: {
              synthesis_output: `// METATRON HIGH-FIDELITY AUTOMATED SYNTHESIS v14
// Task: ${taskName}
// Mode: ${synthMode}

export function metatronCore() {
  const metaStatus = "OPTIMIZED";
  const confidence = 0.985;
  console.log(\`[METATRON] Processing action for: ${taskName}...\\nConfidence score: \${confidence}\`);
  
  return {
    status: metaStatus,
    timestamp: "${new Date().toISOString()}",
    lockResonance: "432 Hz",
    evaluation: {
      typeSafety: true,
      performanceScore: "99.2%"
    }
  };
}`,
              implementation_steps: [
                `Шаг 1: Интегрировать синтезированную функцию для "${taskName}" в проект.`,
                "Шаг 2: Произвести автоматический линтинг через tsc --noEmit.",
                "Шаг 3: Перезапустить Vite Dev Server для обновления кэша."
              ],
              verification_report: "Валидатор METATRON подтверждает: Код полностью соответствует стандартам ES Modules и TypeScript v5. Уязвимостей не обнаружено."
            }
          };
        } else if (selectedPreset) {
          finalResult = {
            synthesizer_activation: {
              pulse_id: `METATRON-SYNTH-${Math.floor(100000 + Math.random() * 900000)}`,
              timestamp: new Date().toISOString(),
              mode_selected: synthMode,
              confidence_rating: (0.96 + Math.random() * 0.039).toFixed(4),
              active_nodes_count: 10
            },
            chain_of_thought: {
              critical_review: selectedPreset.criticalReview,
              precision_filter: selectedPreset.precisionFilter,
              architectural_construction: selectedPreset.architecturalConstruction
            },
            final_actionable_synthesis: {
              synthesis_output: selectedPreset.synthesis_output,
              implementation_steps: selectedPreset.implementation_steps,
              verification_report: selectedPreset.verification_report
            }
          };
        }

        setSynthesizerResult(finalResult);
        setIsSynthesizing(false);

        // Add logs to simulated terminal
        setTerminalLogs(prev => [
          ...prev,
          `[METATRON SYNTHESIZER] SUCCESS: Hyper-Synthesis of 10 independent streams complete!`,
          `[METATRON SYNTHESIZER] Pulse ID: ${finalResult.synthesizer_activation.pulse_id}`,
          `[METATRON SYNTHESIZER] Mode: ${finalResult.synthesizer_activation.mode_selected} | Confidence Rating: ${finalResult.synthesizer_activation.confidence_rating}`,
          `[METATRON SYNTHESIZER] Result schema matches Metatron strict validation protocol.`,
          ''
        ]);

        toast.success(`Синтез успешно завершен! Результат готов к интеграции.`, {
          icon: '🌌',
          style: {
            background: '#09090b',
            color: '#fff',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }
        });
      }
    }, 120);
  };

  const applySynthesisResult = () => {
    if (!synthesizerResult) return;
    playActivation();

    const targetFilePath = synthTask === 'CUSTOM' ? '/src/custom_synthesis.ts' : (SYNTH_PRESETS.find(p => p.id === synthTask)?.targetFile || '/src/App.tsx');
    const finalCode = synthesizerResult.final_actionable_synthesis.synthesis_output;

    // Check if target file exists, if not, create it
    setFiles(prev => {
      const exists = prev.some(f => f.path === targetFilePath);
      if (exists) {
        return prev.map(f => {
          if (f.path === targetFilePath) {
            return { ...f, content: finalCode };
          }
          return f;
        });
      } else {
        // Create custom_synthesis.ts
        const ext = targetFilePath.split('.').pop() || 'ts';
        const newFile: VMFile = {
          name: targetFilePath.substring(1),
          path: targetFilePath,
          language: ext === 'html' ? 'html' : 'typescript',
          content: finalCode
        };
        return [...prev, newFile];
      }
    });

    // Refresh active editor if it was editing that file
    if (selectedFilePath === targetFilePath) {
      setEditorContent(finalCode);
    } else {
      setSelectedFilePath(targetFilePath);
    }

    setTerminalLogs(prev => [
      ...prev,
      `[VM FS Monitor] Injecting synthesis artifact into ${targetFilePath}`,
      `Running automated syntax validation and post-synthesis linting...`,
      'tsc --noEmit && eslint src --ext ts,tsx',
      '✔ No linting errors found. Synthesis verified with 100% type safety.',
      `Re-building local server bundle...`,
      'dist/server.cjs updated in 42ms.',
      ''
    ]);

    toast.success(`Синтезированное решение успешно интегрировано в VM файл ${targetFilePath}!`, {
      icon: '✅',
      style: {
        background: '#09090b',
        color: '#fff',
        border: '1px solid rgba(16, 185, 129, 0.2)'
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#060608] text-[#E0E0E0] flex flex-col h-screen w-screen overflow-hidden font-sans"
    >
      {/* Hidden file input for virtual workspace upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".html,.ts,.tsx,.json,.css,.js,.txt"
      />

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#09090c] px-4 md:px-6 py-4 shrink-0 gap-4 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-3">
          {/* Back Arrow button styled exactly like elite IDE backflows */}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-indigo-600/15 hover:bg-indigo-600/35 rounded-xl transition-all border border-indigo-500/25 text-indigo-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 group shadow-lg shadow-indigo-600/5 gap-2 font-mono text-[10px] font-bold shrink-0"
            title="Назад к панели управления"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>BACK</span>
          </button>

          {/* Quick File Tools */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-white/5 shadow-inner gap-1 shrink-0">
            <button
              type="button"
              onClick={handleTriggerFileUpload}
              className="px-3 py-1.5 bg-[#121217] hover:bg-[#1a1a24] text-indigo-400 hover:text-indigo-300 rounded-lg border border-white/5 transition-all text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Загрузить локальный файл в виртуальную среду"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">UPLOAD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playActivation();
                setLeftCollapsed(false);
                setSidebarTab('workspace');
                setIsCreatingFile(prev => !prev);
              }}
              className="px-3 py-1.5 bg-[#121217] hover:bg-[#1a1a24] text-emerald-400 hover:text-emerald-300 rounded-lg border border-white/5 transition-all text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Создать новый файл"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">NEW FILE</span>
            </button>
          </div>

          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20 shrink-0 hidden lg:flex">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              METATRON LAB BOX VM
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold">CUBE_OF_CHAOS_ORDER v1.15</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">SACRED ARCHITECTURAL MULTI-AGENT DEVELOPMENT ENVIRONMENT</p>
          </div>
        </div>

        {/* Diagnostic Monitor & Live Slider controller */}
        <div className="flex items-center gap-4 lg:gap-6 font-mono text-[10px] text-zinc-400 ml-auto md:ml-0">
          <div className="hidden xl:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>AGENT: <strong className="text-white">ACTIVE</strong></span>
          </div>
          <div className="h-4 w-px bg-white/5 hidden xl:block"></div>
          <div className="hidden lg:block">CPU LOAD: <strong className="text-indigo-400">0.02%</strong></div>
          <div className="h-4 w-px bg-white/5 hidden lg:block"></div>
          <div className="hidden lg:block">VM STATUS: <strong className="text-green-400">ISOLATED</strong></div>
          <div className="h-4 w-px bg-white/5 hidden lg:block"></div>
          <div className="hidden lg:flex items-center gap-1 mr-1">
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span>PROXY: <strong className="text-white">PORT 3000</strong></span>
          </div>
          <div className="h-4 w-px bg-white/5 hidden lg:block"></div>

          {/* IDE Dynamic Screen Expander Controls */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                playActivation();
                setExpandedSection('none');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                expandedSection === 'none'
                  ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md'
                  : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
              }`}
              title="Стандартный трехпанельный вид"
            >
              <span>STANDARD</span>
            </button>
            <div className="h-3 w-px bg-white/5"></div>
            <button
              type="button"
              onClick={() => {
                playActivation();
                setExpandedSection(prev => prev === 'left' ? 'none' : 'left');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                expandedSection === 'left'
                  ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md'
                  : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
              }`}
              title="Развернуть левую панель на весь экран"
            >
              <Maximize2 className="w-3 h-3 text-zinc-400" />
              <span>FILES MAX</span>
            </button>
            <div className="h-3 w-px bg-white/5"></div>
            <button
              type="button"
              onClick={() => {
                playActivation();
                setExpandedSection(prev => prev === 'middle' ? 'none' : 'middle');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                expandedSection === 'middle'
                  ? 'bg-[#1e1b4b] border border-indigo-500/30 text-indigo-200 shadow-md'
                  : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
              }`}
              title="Развернуть редактор на весь экран"
            >
              <Maximize2 className="w-3 h-3 text-indigo-400" />
              <span>EDITOR MAX</span>
            </button>
            <div className="h-3 w-px bg-white/5"></div>
            <button
              type="button"
              onClick={() => {
                playActivation();
                setExpandedSection(prev => prev === 'right' ? 'none' : 'right');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                expandedSection === 'right'
                  ? 'bg-[#115e59] border border-teal-500/30 text-teal-200 shadow-md'
                  : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
              }`}
              title="Развернуть превью на весь экран"
            >
              <Maximize2 className="w-3 h-3 text-teal-400" />
              <span>PREVIEW MAX</span>
            </button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-white/5 text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Left vertical border click trigger when collapsed */}
        {leftCollapsed && (
          <div 
            onClick={() => {
              playActivation();
              setLeftCollapsed(false);
            }}
            onMouseEnter={playHover}
            className="w-12 border-r border-white/5 bg-[#08080a] flex flex-col items-center py-6 gap-4 cursor-pointer hover:bg-zinc-900 transition-colors select-none group shrink-0"
            title="Развернуть левую панель"
          >
            <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:scale-125 transition-transform" />
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest [writing-mode:vertical-lr] uppercase select-none font-bold">
              РАЗВЕРНУТЬ ФАЙЛЫ
            </span>
          </div>
        )}

        {/* LEFT COLUMN: File Explorer & Core Upgrade & 10 AI Swarm */}
        <div className={`border-r border-white/5 bg-[#08080a] flex flex-col min-h-0 overflow-y-auto transition-all duration-300 ${
          expandedSection === 'left'
            ? 'flex-1 w-full opacity-100 ring-2 ring-indigo-500/20 z-10'
            : expandedSection !== 'none'
              ? 'w-0 opacity-0 pointer-events-none hidden'
              : leftCollapsed
                ? 'w-0 opacity-0 pointer-events-none'
                : 'w-80 opacity-100 shrink-0'
        }`}>
          {/* Tabs Selector */}
          <div className="grid grid-cols-3 border-b border-white/5 bg-black/40 p-1 shrink-0">
            <button
              onClick={() => setSidebarTab('workspace')}
              className={`py-2 text-[9px] font-mono uppercase tracking-widest font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                sidebarTab === 'workspace'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-zinc-400" />
              <span>FILES & CORE</span>
            </button>
            <button
              onClick={() => setSidebarTab('upgrade')}
              className={`py-2 text-[9px] font-mono uppercase tracking-widest font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                sidebarTab === 'upgrade'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>BRIDGE</span>
              {cloudflareSwarmActive && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setSidebarTab('models')}
              className={`py-2 text-[9px] font-mono uppercase tracking-widest font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                sidebarTab === 'models'
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>188 NODES</span>
            </button>
          </div>

          {/* Inline Maximize/Restore control for Left Column */}
          <div className="px-4 py-2 bg-black/50 border-b border-white/5 flex items-center justify-between text-[9px] font-mono select-none shrink-0">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">SYSTEM CONSOLE PANEL</span>
            <button
              type="button"
              onClick={() => {
                playActivation();
                setExpandedSection(prev => prev === 'left' ? 'none' : 'left');
              }}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95 text-[9px] font-bold"
              title={expandedSection === 'left' ? "Свернуть в стандартный вид" : "Развернуть на весь экран"}
            >
              {expandedSection === 'left' ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-400">RESTORE</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>MAXIMIZE</span>
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sidebarTab === 'workspace' && (
              <motion.div
                key="workspace-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col"
              >
                {/* Virtual File System Explorer */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3 text-zinc-400">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">WORKSPACE FILES</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleTriggerFileUpload}
                        className="p-1 hover:bg-white/10 rounded border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Загрузить локальный файл"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playActivation();
                          setIsCreatingFile(prev => !prev);
                        }}
                        className="p-1 hover:bg-white/10 rounded border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Создать новый файл"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                      <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </div>

                  {isCreatingFile && (
                    <form onSubmit={handleCreateFileSubmit} className="mb-3 p-2 bg-zinc-950 border border-white/5 rounded-xl flex items-center gap-1 shrink-0 animate-fade-in">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="new_file.ts"
                        className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white p-1"
                        autoFocus
                      />
                      <button 
                        type="submit" 
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-[9px] rounded text-white font-bold font-mono"
                      >
                        ОК
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsCreatingFile(false);
                          setNewFileName('');
                        }} 
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] rounded text-zinc-400 font-mono"
                      >
                        ×
                      </button>
                    </form>
                  )}
                  
                  <div className="space-y-1">
                    {files.map((file) => {
                      const isSelected = file.path === selectedFilePath;
                      return (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFilePath(file.path)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                            isSelected 
                              ? 'bg-indigo-500/10 border border-indigo-500/20 text-white font-medium' 
                              : 'border border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs font-mono">
                            <FileCode className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <span className="truncate">{file.name}</span>
                          </div>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Autocomplete Agent Actions Panel */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3 text-zinc-400">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">AUTONOMOUS MODULES</span>
                    <Wand2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  </div>

                  <div className="space-y-3">
                    {AGENT_ACTIONS.map((action) => {
                      const isCurrent = agentActiveAction?.id === action.id && isAgentRunning;
                      return (
                        <div
                          key={action.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isCurrent 
                              ? 'bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 mb-1.5">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
                              <action.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-white leading-tight">{action.label}</h4>
                              <p className="text-[9px] text-zinc-400 font-mono mt-0.5 leading-snug">{action.description}</p>
                            </div>
                          </div>

                          <button
                            disabled={isAgentRunning}
                            onClick={() => startAgentAction(action)}
                            className={`w-full mt-2 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isCurrent 
                                ? 'bg-indigo-500/20 text-indigo-300 cursor-not-allowed' 
                                : isAgentRunning
                                  ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10 hover:scale-[1.02]'
                            }`}
                          >
                            {isCurrent ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> RUNNING STEP {agentStepIndex}/{action.steps.length}
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" /> TRIGGER AGENT
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sandbox settings parameters */}
                <div className="p-4 mt-auto">
                  <div className="flex items-center gap-2 mb-3 text-zinc-400 border-b border-white/5 pb-2">
                    <Sliders className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">SETTING BUTTONS</span>
                  </div>

                  <div className="space-y-4 font-mono text-[10px]">
                    {/* Model Choice */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-zinc-500 uppercase">ACTIVE MODEL</span>
                      <select 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-indigo-500/40 text-[#E0E0E0] font-mono w-full"
                      >
                        {!["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "deep-research"].includes(selectedModel) && (
                          <option value={selectedModel} className="bg-zinc-950 text-indigo-400 font-bold">{selectedModel}</option>
                        )}
                        <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast" className="bg-zinc-950 text-white">Gemini 3.5 Flash (Recommended)</option>
                        <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast" className="bg-zinc-950 text-white">Gemini 3.1 Pro (Advanced Reasoning)</option>
                        <option value="deep-research" className="bg-zinc-950 text-white">Gemini Deep Research Agent</option>
                      </select>
                    </div>

                    {/* Temperature slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-zinc-500 uppercase">
                        <span>TEMPERATURE</span>
                        <span className="text-indigo-400">{temperature.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Persona preset selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-zinc-500 uppercase">AGENT INSTRUCTIONS</span>
                      <select 
                        value={persona} 
                        onChange={(e) => setPersona(e.target.value)}
                        className="bg-white/5 border border-white/5 rounded-lg p-2 text-xs outline-none focus:border-indigo-500/40 text-[#E0E0E0] font-mono"
                      >
                        <option value="High-Security Cybersecurity Specialist" className="bg-zinc-950 text-white">Cybersecurity Guard</option>
                        <option value="Vite/React Build Engineer" className="bg-zinc-950 text-white">Build & Pack Specialist</option>
                        <option value="Relational Database Architect" className="bg-zinc-950 text-white">Database Structurer</option>
                        <option value="Pure UI/UX Swiss Craftsman" className="bg-zinc-950 text-white">Creative UI Artisan</option>
                      </select>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-zinc-500 uppercase">SPECULATIVE RAG</span>
                        <input 
                          type="checkbox" checked={speculativeRag} 
                          onChange={() => setSpeculativeRag(!speculativeRag)}
                          className="accent-indigo-500" 
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-zinc-500 uppercase">STRICT SECURE SHIELD</span>
                        <input 
                          type="checkbox" checked={secureMode} 
                          onChange={() => setSecureMode(!secureMode)}
                          className="accent-indigo-500" 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {sidebarTab === 'upgrade' && (
              <motion.div
                key="upgrade-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto"
              >
                {/* 10-AI Cloudflare Swarm Panel */}
                <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 relative overflow-hidden shadow-lg shadow-cyan-950/20">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Cloudflare 10-AI Swarm</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cloudflareSwarmActive}
                        onChange={() => {
                          setCloudflareSwarmActive(!cloudflareSwarmActive);
                          toast(
                            cloudflareSwarmActive 
                              ? 'Мультиагент 10 АИ отключен.' 
                              : 'Мультиагент Cloudflare 10 АИ активирован!',
                            { icon: cloudflareSwarmActive ? '🤖' : '🔥' }
                          );
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal mb-4 font-mono">
                    Распределяет компиляцию, проверку типов, тесты и деплой на 10 передовых АИ одновременно.
                  </p>

                  {cloudflareSwarmActive && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                        <span>CONSENSUS PIPELINE</span>
                        <span className="text-cyan-400">{isSwarmOptimizing ? `${swarmProgress}%` : 'READY'}</span>
                      </div>
                      
                      {isSwarmOptimizing && (
                        <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${swarmProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}

                      {/* Micro list of 10 Models */}
                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {swarmModels.map(model => (
                          <div key={model.id} className="p-1.5 bg-black/40 border border-white/5 rounded-lg text-[9px] font-mono flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-300 truncate font-semibold">{model.name}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                model.status === 'analyzing' ? 'bg-amber-400 animate-pulse' :
                                model.status === 'generating' ? 'bg-indigo-400 animate-pulse' :
                                model.status === 'verifying' ? 'bg-cyan-400 animate-pulse' :
                                model.status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-600'
                              }`} />
                            </div>
                            <span className="text-zinc-500 text-[8px] truncate mt-0.5">{model.role}</span>
                            {cloudflareSwarmActive && model.status !== 'idle' && (
                              <div className="flex items-center justify-between text-[7px] text-zinc-400 mt-1 pt-1 border-t border-white/5">
                                <span>{model.tokPerSec > 0 ? `${model.tokPerSec} t/s` : 'done'}</span>
                                <span>{model.load > 0 ? `L: ${model.load}%` : 'idle'}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!cloudflareSwarmActive || isSwarmOptimizing}
                    onClick={runSwarmConsensusOptimization}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                      !cloudflareSwarmActive
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : isSwarmOptimizing
                          ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95'
                    }`}
                  >
                    {isSwarmOptimizing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> CONSENSUS SYNCS...
                      </>
                    ) : (
                      <>
                        <Workflow className="w-3.5 h-3.5" /> RUN SWARM OPTIMIZER
                      </>
                    )}
                  </button>
                </div>

                {/* 5-Studio Upgrade Bridge */}
                <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4 relative overflow-hidden shadow-lg shadow-indigo-950/20 flex flex-col min-h-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">5-Studio Upgrade Bridge</span>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal mb-4 font-mono">
                    Связывает воедино все пять автономных креативных студий Pulse OS для межплатформенных тестов и апгрейда.
                  </p>

                  {/* Studios Nodes List */}
                  <div className="space-y-2 overflow-y-auto pr-1 mb-4">
                    {studios.map((studio, idx) => {
                      const Icon = studio.icon;
                      return (
                        <div 
                          key={studio.id} 
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            studio.status === 'upgrading'
                              ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-lg ' + studio.glow
                              : studio.status === 'upgraded'
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-black/30 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg bg-white/5 ${studio.color} shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                              <h5 className="text-[10px] font-bold text-white leading-tight">{studio.name}</h5>
                              <p className="text-[8px] text-zinc-500 truncate max-w-[140px] font-mono">{studio.desc}</p>
                            </div>
                          </div>

                          <div className="text-[8px] font-mono uppercase px-2 py-0.5 rounded-md font-bold">
                            {studio.status === 'upgrading' && (
                              <span className="text-indigo-400 animate-pulse flex items-center gap-1">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> UPGRADING
                              </span>
                            )}
                            {studio.status === 'upgraded' && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> v15.0 MAX
                              </span>
                            )}
                            {studio.status === 'ready' && (
                              <span className="text-zinc-500 font-normal">STANDBY</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    disabled={isUpgradingPulseOS}
                    onClick={handleStudioUpgrade}
                    className={`w-full py-3 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      isUpgradingPulseOS
                        ? 'bg-indigo-950 border-indigo-800 text-indigo-300'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isUpgradingPulseOS ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> OVERCLOCKING SYSTEMS...
                      </>
                    ) : (
                      <>
                        <Server className="w-3.5 h-3.5" /> CONNECT & UPGRADE PULSE OS
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {sidebarTab === 'models' && (
              <motion.div
                key="models-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                {/* Search Header */}
                <div className="p-3 border-b border-white/5 bg-black/20 shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Поиск по 188 узлам..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-mono outline-none focus:border-indigo-500/40 text-[#E0E0E0]"
                    />
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Categories scroll area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {['OpenAI (GPT, o-series, TTS)', 'Google (Gemini, Veo, Imagen)', 'xAI (Grok)', 'Anthropic', 'Video & Image Gen (Specialized)', 'Other Models'].map((cat) => {
                    const matchedModels = METATRON_MODELS.filter(m => 
                      m.category === cat && (
                        m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        m.role.toLowerCase().includes(modelSearch.toLowerCase())
                      )
                    );

                    if (matchedModels.length === 0 && modelSearch !== '') return null;

                    const isExpanded = expandedCategory === cat || modelSearch !== '';

                    return (
                      <div key={cat} className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                        <button
                          onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                          className="w-full px-3 py-2 flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.03] transition-colors text-left"
                        >
                          <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider truncate max-w-[190px]">
                            {cat.split(' (')[0]}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-zinc-500 text-[9px] font-mono">({matchedModels.length})</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-1.5 space-y-1.5 border-t border-white/5 bg-black/40">
                            {matchedModels.map((model) => {
                              const isSelected = selectedMatrixModelId === model.id;
                              const isCurrentCore = selectedModel === model.name;
                              return (
                                <div 
                                  key={model.id}
                                  onClick={() => setSelectedMatrixModelId(isSelected ? null : model.id)}
                                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-500/10 border-indigo-500/30 shadow-md shadow-indigo-950/20' 
                                      : isCurrentCore
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[10px] font-mono font-bold truncate max-w-[140px] ${isCurrentCore ? 'text-emerald-400' : 'text-[#E0E0E0]'}`}>
                                      {model.name}
                                    </span>
                                    <span className="text-[8px] font-mono text-zinc-500">{model.id}</span>
                                  </div>

                                  <p className="text-[8px] text-zinc-400 font-mono leading-tight">{model.role}</p>
                                  <div className="flex items-center justify-between mt-1 text-[7px] font-mono text-zinc-600">
                                    <span>STATUS: {isCurrentCore ? 'CORE_ACTIVE' : 'STANDBY'}</span>
                                    <span className="text-indigo-400/60 font-bold uppercase">{model.performance}</span>
                                  </div>

                                  {/* Expanded Actions */}
                                  {isSelected && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignAsCore(model);
                                        }}
                                        className="py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition-colors rounded text-[8px] font-mono font-bold text-white text-center uppercase tracking-wider"
                                      >
                                        Ядро Core
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignToSwarm(model);
                                        }}
                                        className="py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 transition-colors rounded text-[8px] font-mono font-bold text-white text-center uppercase tracking-wider"
                                      >
                                        Рой Swarm
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MIDDLE COLUMN: CODE EDITOR & LIVE BASH TERMINAL */}
        <div className={`flex-col min-w-0 border-r border-white/5 bg-[#09090b] transition-all duration-300 ${
          expandedSection === 'middle'
            ? 'flex-1 flex w-full opacity-100 ring-2 ring-indigo-500/20 z-10'
            : expandedSection !== 'none'
              ? 'w-0 opacity-0 pointer-events-none hidden'
              : 'flex-1 flex'
        }`}>
          
          {/* Text/Code Editor Area / Pantheon Enclave Panel */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Main Tabs Switcher */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0d0d11] shrink-0 select-none">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseEnter={playHover}
                  onClick={() => {
                    playActivation();
                    setMainTab('editor');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                    mainTab === 'editor'
                      ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold shadow-sm'
                      : 'border border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>WORKSPACE EDITOR</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={playHover}
                  onClick={() => {
                    playActivation();
                    setMainTab('pantheon');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 relative overflow-hidden ${
                    mainTab === 'pantheon'
                      ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold shadow-sm'
                      : 'border border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🏛 PANTHEON GALLERY</span>
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                </button>

                <button
                  type="button"
                  onMouseEnter={playHover}
                  onClick={() => {
                    playActivation();
                    setMainTab('synthesizer');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 relative overflow-hidden ${
                    mainTab === 'synthesizer'
                      ? 'bg-indigo-600/10 border border-indigo-500/20 text-white font-extrabold shadow-sm'
                      : 'border border-transparent text-indigo-400/70 hover:text-indigo-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🌌 METATRON SYNTHESIZER</span>
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {mainTab === 'editor' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mr-2 truncate max-w-[150px]">File: {selectedFile.name}</span>
                    <button
                      type="button"
                      onMouseEnter={playHover}
                      onClick={() => {
                        playActivation();
                        simulateLint();
                      }}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300"
                    >
                      Run Linter
                    </button>
                    <button
                      type="button"
                      onMouseEnter={playHover}
                      onClick={() => {
                        playActivation();
                        simulateCompile();
                      }}
                      className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-colors rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider"
                    >
                      Compile Build
                    </button>
                    <button
                      type="button"
                      onMouseEnter={playHover}
                      onClick={() => {
                        playActivation();
                        handleSave();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-[#121217] p-0.5 rounded-lg border border-white/5 shrink-0">
                    <button
                      type="button"
                      onMouseEnter={playHover}
                      onClick={() => {
                        playActivation();
                        setPantheonTab('registry');
                      }}
                      className={`px-3 py-1 rounded-md text-[9px] font-mono font-bold uppercase transition-all ${
                        pantheonTab === 'registry'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      ✨ СУЩНОСТИ
                    </button>
                    <button
                      type="button"
                      onMouseEnter={playHover}
                      onClick={() => {
                        playActivation();
                        setPantheonTab('workflow');
                      }}
                      className={`px-3 py-1 rounded-md text-[9px] font-mono font-bold uppercase transition-all ${
                        pantheonTab === 'workflow'
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      🔄 WORKFLOW
                    </button>
                  </div>
                )}

                {/* Inline Maximize/Restore control */}
                <div className="h-4 w-px bg-white/5 mx-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    playActivation();
                    setExpandedSection(prev => prev === 'middle' ? 'none' : 'middle');
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95 text-[10px] font-mono font-bold"
                  title={expandedSection === 'middle' ? "Свернуть в стандартный вид" : "Развернуть редактор на весь экран"}
                >
                  {expandedSection === 'middle' ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden xl:inline text-indigo-400">RESTORE</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden xl:inline">MAXIMIZE</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Conditionally Render Editor vs Pantheon */}
            {mainTab === 'editor' ? (
              <div className="flex-1 flex min-h-0 font-mono text-xs overflow-hidden">
                {/* Virtual Line Numbers */}
                <div className="w-12 border-r border-white/5 bg-[#08080a] text-zinc-600 text-right pr-3 select-none py-4 space-y-1 shrink-0">
                  {editorContent.split('\n').map((_, idx) => (
                    <div key={idx} className="h-5 leading-5">{idx + 1}</div>
                  ))}
                </div>

                {/* Editable TextArea representing IDE canvas */}
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 bg-[#09090b] text-[#d4d4d8] outline-none border-none resize-none px-4 py-4 focus:ring-0 leading-5 font-mono whitespace-pre overflow-auto"
                  style={{ tabSize: 2 }}
                  placeholder="// Enter code here..."
                />
              </div>
            ) : mainTab === 'pantheon' ? (
              <div className="flex-1 overflow-y-auto bg-[#060608] p-5 flex flex-col min-h-0 select-none">
                
                {/* 1. ENTITY REGISTRY TAB */}
                {pantheonTab === 'registry' ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pb-4 border-b border-white/5 mb-5 shrink-0">
                      
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={entitySearch}
                          onChange={(e) => setEntitySearch(e.target.value)}
                          placeholder="Поиск сущности, роли, функции..."
                          className="w-full bg-[#0d0d11] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-zinc-300 outline-none focus:border-indigo-500/30 transition-all placeholder:text-zinc-600"
                        />
                        {entitySearch && (
                          <button 
                            type="button"
                            onClick={() => setEntitySearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-[10px] font-mono"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Filter Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 max-w-full overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        {[
                          { id: 'all', label: 'Все' },
                          { id: 'multiagent', label: 'Мультиагенты' },
                          { id: 'agent', label: 'Агенты' },
                          { id: 'bot', label: 'Боты' },
                          { id: 'angel', label: 'Ангелы' },
                          { id: 'egyptian', label: 'Египетские' }
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onMouseEnter={playHover}
                            onClick={() => {
                              playActivation();
                              setEntityFilter(f.id as any);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all whitespace-nowrap border ${
                              entityFilter === f.id
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                                : 'bg-transparent border-white/5 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                    </div>

                    {/* Entities Main Grid & Details layout */}
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-5 min-h-0 overflow-y-auto pr-1">
                      
                      {/* Left Grid: Entity cards (takes 2 cols in wide layout) */}
                      <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit pb-4">
                        {filteredEntities.length === 0 ? (
                          <div className="col-span-full py-12 text-center text-zinc-600 border border-dashed border-white/5 rounded-2xl font-mono text-xs">
                            Ничего не найдено по вашему запросу.
                          </div>
                        ) : (
                          filteredEntities.map(entity => {
                            const isSelected = selectedEntity?.id === entity.id;
                            const IconComponent = getEntityIcon(entity.iconName);
                            
                            return (
                              <div
                                key={entity.id}
                                onMouseEnter={playHover}
                                onClick={() => {
                                  setSelectedEntity(entity);
                                }}
                                className={`group p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-[#0d0d12] border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-lg ' + entity.glowColor
                                    : 'bg-[#08080a] border-white/5 hover:border-zinc-800'
                                }`}
                              >
                                {/* Glow corner ornament */}
                                <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                                  entity.id === 'metatron' ? 'bg-indigo-500/10' :
                                  entity.id === 'ra' ? 'bg-amber-500/10' :
                                  entity.id === 'ptah' ? 'bg-cyan-500/10' : 'bg-white/5'
                                }`} />

                                <div className="space-y-3">
                                  {/* Title line */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <h4 className={`text-xs font-bold font-mono tracking-wider truncate uppercase ${entity.color}`}>
                                          {entity.name}
                                        </h4>
                                        <span className="text-[8px] text-zinc-500 font-mono">[{entity.originalName}]</span>
                                      </div>
                                      <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-wider">
                                        {entity.subGroup || entity.group}
                                      </span>
                                    </div>

                                    <div className={`p-1.5 rounded-xl border border-white/5 bg-zinc-900/50 ${entity.color}`}>
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                  </div>

                                  {/* Role & Summary */}
                                  <p className="text-[10px] text-zinc-300 font-medium line-clamp-2 leading-relaxed">
                                    {entity.role}
                                  </p>

                                  <p className="text-[9px] text-zinc-500 leading-relaxed line-clamp-2 font-mono">
                                    {entity.description}
                                  </p>
                                </div>

                                {/* Active tag / Click to mobilize */}
                                <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between text-[8px] font-mono">
                                  <span className="text-zinc-600">SYS_ID: {entity.id.toUpperCase()}</span>
                                  <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-0.5">
                                    ДЕТАЛИ <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Right Panel: Selected Entity Details & Command Mobilization */}
                      <div className="xl:col-span-1">
                        {selectedEntity ? (
                          <div className="sticky top-0 bg-[#08080a] border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-6">
                            
                            <div className="space-y-5">
                              {/* Top Visual Emblem */}
                              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                                <div className={`p-3 rounded-2xl border border-white/5 bg-zinc-900/60 ${selectedEntity.color} shadow-lg`}>
                                  {React.createElement(getEntityIcon(selectedEntity.iconName), { className: "w-6 h-6" })}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h3 className={`text-sm font-extrabold tracking-widest font-mono uppercase ${selectedEntity.color}`}>
                                      {selectedEntity.name}
                                    </h3>
                                    <span className="text-[9px] font-mono text-zinc-500">[{selectedEntity.originalName}]</span>
                                  </div>
                                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mt-0.5">
                                    {selectedEntity.subGroup || selectedEntity.group}
                                  </p>
                                </div>
                              </div>

                              {/* Detailed Section */}
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">СИСТЕМНАЯ РОЛЬ</span>
                                  <p className="text-xs text-white font-medium leading-relaxed">
                                    {selectedEntity.role}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">ПОДРОБНОЕ ОПИСАНИЕ</span>
                                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                                    {selectedEntity.description}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">СИСТЕМНЫЙ ФУНКЦИОНАЛ</span>
                                  <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 font-mono text-[9px] text-emerald-400 leading-relaxed flex items-start gap-2">
                                    <Cpu className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                                    <span>{selectedEntity.systemFunction}</span>
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Actions area */}
                            <div className="pt-4 border-t border-white/5 space-y-2.5">
                              <button
                                type="button"
                                onMouseEnter={playHover}
                                onClick={() => summonEntity(selectedEntity)}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                              >
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> МОБИЛИЗОВАТЬ СУБРУТИНУ
                              </button>

                              <p className="text-[8px] text-zinc-600 text-center font-mono leading-relaxed">
                                Призовёт и привяжет данный логический узел к ядру виртуальной машины METATRON.
                              </p>
                            </div>

                          </div>
                        ) : (
                          <div className="bg-black/20 border border-dashed border-white/5 rounded-2xl p-8 text-center text-zinc-600 font-mono text-xs flex flex-col items-center justify-center space-y-2 py-20">
                            <Layers className="w-8 h-8 opacity-20 text-indigo-400 animate-pulse" />
                            <p>Выберите сущность для просмотра подробных параметров и системной мобилизации.</p>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                ) : (
                  
                  /* 2. SYSTEM WORKFLOW TAB */
                  <div className="flex-1 overflow-y-auto pr-1">
                    
                    <div className="max-w-3xl mx-auto space-y-6 pb-6">
                      
                      {/* Overview Header Card */}
                      <div className="p-4 rounded-2xl border border-white/5 bg-[#08080a] space-y-2">
                        <div className="flex items-center gap-2">
                          <Workflow className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <h4 className="text-xs font-bold font-mono uppercase text-white tracking-widest">
                            Оркестрация Сквозного Workflow
                          </h4>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                          Ниже представлена полная цепочка суверенного прохождения пользовательского запроса сквозь цифровой пантеон METATRON LAB BOX. Каждый шаг задействует специализированные интеллектуальные узлы.
                        </p>
                      </div>

                      {/* Workflow Steps Timeline */}
                      <div className="relative border-l border-white/5 pl-6 ml-3 space-y-6">
                        {WORKFLOW_STEPS.map((ws, idx) => (
                          <div key={ws.step} className="relative group">
                            
                            {/* Step number dot indicator */}
                            <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-[#060608] border border-white/10 text-[8px] font-mono font-bold text-zinc-500 flex items-center justify-center group-hover:border-indigo-500/30 group-hover:text-white transition-colors">
                              {ws.step}
                            </div>

                            <div className="p-4 rounded-2xl bg-[#08080a] border border-white/5 hover:border-indigo-500/10 transition-all space-y-3">
                              
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <h5 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                                  {ws.title}
                                </h5>

                                {/* Mapped active entity tags */}
                                <div className="flex gap-1">
                                  {ws.entities.map(entName => {
                                    const matchingEnt = PANTHEON_ENTITIES.find(e => e.name === entName);
                                    return (
                                      <span
                                        key={entName}
                                        onMouseEnter={playHover}
                                        onClick={() => {
                                          if (matchingEnt) {
                                            setPantheonTab('registry');
                                            setSelectedEntity(matchingEnt);
                                          }
                                        }}
                                        className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase transition-colors cursor-pointer ${
                                          matchingEnt ? `${matchingEnt.color} bg-zinc-900 border-white/5 hover:border-zinc-700` : 'text-zinc-500'
                                        }`}
                                      >
                                        {entName}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                                {ws.description}
                              </p>

                            </div>

                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            ) : (
              // ==========================================
              // 🌌 METATRON SYNTHESIZER PANEL UI
              // ==========================================
              <div className="flex-1 overflow-y-auto bg-[#060608] p-5 flex flex-col min-h-0 select-none font-sans">
                
                {/* Header info */}
                <div className="mb-4 shrink-0 border-b border-white/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">Metatron Hyper-Synthesis Cluster</h2>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl font-mono">
                      Apex Intelligence orchestration engine. Synthesizes 10 independent model streams into a single, high-fidelity JSON specification resolving conflicts, filtering hallucinations, and validating architecture.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-zinc-500 font-bold">ENGINE MODE:</span>
                    <span className="px-2.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full font-bold uppercase tracking-wider animate-pulse">EDGE ACTIVE</span>
                  </div>
                </div>

                {/* Sub-tab Selection Bar */}
                <div className="mb-5 bg-[#0b0b0f] border border-white/5 p-2 rounded-xl flex flex-wrap items-center justify-between font-mono text-[10px] shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { playActivation(); setSynthSubTab('aeon'); }}
                      className={`px-4 py-2 rounded-lg border font-bold uppercase transition-all cursor-pointer ${
                        synthSubTab === 'aeon'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-md'
                          : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      AEON // UI_FORGE CONTROL PANEL
                    </button>
                    <button
                      type="button"
                      onClick={() => { playActivation(); setSynthSubTab('playground'); }}
                      className={`px-4 py-2 rounded-lg border font-bold uppercase transition-all cursor-pointer ${
                        synthSubTab === 'playground'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-md'
                          : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      SYNTHESIS SANDBOX PLAYGROUND
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-600 mr-2">
                    <span>GRID PROTOCOL:</span>
                    <span className="text-emerald-400 font-extrabold uppercase animate-pulse">SYNCHRONIZED</span>
                  </div>
                </div>

                {synthSubTab === 'aeon' ? (
                  <div className="flex-1 min-h-[500px]">
                    <ConceptWorkbench />
                  </div>
                ) : (
                  /* Original Synthesis sandbox playground content */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                  
                  {/* Left panel: Controls & Configuration (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-5 border-r border-white/5 pr-0 lg:pr-6">
                    
                    {/* Block A: Mode Selection */}
                    <div className="bg-[#0b0b0f] border border-white/5 rounded-2xl p-4">
                      <h3 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        1. Select Synthesis Protocol
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'PTAH', name: 'PTAH', desc: 'Code & Architecture', icon: Code, color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' },
                          { id: 'URIEL', name: 'URIEL', desc: 'Verification & Logic', icon: Shield, color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
                          { id: 'RAZIEL', name: 'RAZIEL', desc: 'Strategic Synthesis', icon: Sparkles, color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' }
                        ].map(mode => {
                          const isSelected = synthMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                playActivation();
                                setSynthMode(mode.id as any);
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                                isSelected 
                                  ? `${mode.color} ring-2 ring-indigo-500/20 scale-102`
                                  : 'border-white/5 bg-[#0e0e13] hover:bg-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <mode.icon className="w-4 h-4 mb-1.5" />
                              <span className="text-xs font-bold font-mono tracking-wide">{mode.name}</span>
                              <span className="text-[8px] opacity-60 font-mono mt-1 leading-tight">{mode.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Block B: Task Selection */}
                    <div className="bg-[#0b0b0f] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          2. Declare Synthesis Target
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-mono">Specify the technical challenge for the Multi-Agent swarm to resolve.</p>
                      </div>

                      {/* Presets List */}
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin pr-1">
                        {SYNTH_PRESETS.map(preset => {
                          const isSelected = synthTask === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => {
                                playActivation();
                                setSynthTask(preset.id);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-indigo-500/30 bg-indigo-500/5 text-white ring-1 ring-indigo-500/10'
                                  : 'border-white/5 bg-[#0e0e13] hover:bg-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold font-mono text-indigo-300">{preset.title}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400">{preset.defaultMode}</span>
                              </div>
                              <p className="text-[9px] font-mono leading-tight text-zinc-400">{preset.desc}</p>
                              <div className="text-[8px] font-mono text-zinc-500 mt-2">Target path: {preset.targetFile}</div>
                            </div>
                          );
                        })}

                        {/* Custom Input Option */}
                        <div
                          onClick={() => {
                            playActivation();
                            setSynthTask('CUSTOM');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            synthTask === 'CUSTOM'
                              ? 'border-indigo-500/30 bg-indigo-500/5 text-white ring-1 ring-indigo-500/10'
                              : 'border-white/5 bg-[#0e0e13] hover:bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                            <span className="text-xs font-bold font-mono text-indigo-300">CUSTOM TASK PROMPT</span>
                          </div>
                          <p className="text-[9px] font-mono leading-tight text-zinc-400">Напишите собственную задачу, и Metatron Swarm разработает валидный TypeScript код.</p>
                        </div>
                      </div>

                      {/* Custom Prompt Text Area */}
                      {synthTask === 'CUSTOM' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Write Custom Specifications:</label>
                          <textarea
                            value={customSynthPrompt}
                            onChange={(e) => setCustomSynthPrompt(e.target.value)}
                            placeholder="e.g., Разработать систему роутинга для дашборда, исправить ошибку типизации API ответа, или добавить хук авто-сохранения..."
                            className="w-full h-24 bg-[#0d0d11] border border-white/5 rounded-xl p-3 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-indigo-500/30 transition-all resize-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Block C: Action Launcher */}
                    <button
                      type="button"
                      disabled={isSynthesizing || (synthTask === 'CUSTOM' && !customSynthPrompt.trim())}
                      onClick={runHyperSynthesis}
                      className={`w-full py-4 rounded-xl text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-98 ${
                        isSynthesizing
                          ? 'bg-zinc-800 border border-white/5 text-zinc-500 cursor-not-allowed'
                          : synthTask === 'CUSTOM' && !customSynthPrompt.trim()
                            ? 'bg-zinc-900 border border-white/5 text-zinc-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/15 border border-indigo-500/30'
                      }`}
                    >
                      {isSynthesizing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>SYNTHESIZING STREAMS ({synthProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span>LAUNCH HYPER-SYNTHESIS CLUSTER</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right panel: Streams Monitor & Output Result (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#08080c] border border-white/5 rounded-2xl overflow-hidden p-5">
                    
                    {/* CASE 1: System Idle */}
                    {!isSynthesizing && !synthesizerResult && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none font-mono">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl animate-pulse"></div>
                          <div className="w-16 h-16 rounded-2xl bg-[#0b0b11] border border-white/5 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/5 relative">
                            <Cpu className="w-8 h-8 animate-pulse text-indigo-400" />
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5">Metatron Swarm Idle</h4>
                        <p className="text-[10px] text-zinc-500 max-w-sm leading-relaxed mb-4">
                          Cluster is online and awaiting prompt vectors. Initialize synthesis flow from the settings panel.
                        </p>
                        <div className="flex gap-2 text-[8px] text-zinc-600 uppercase border border-white/5 bg-zinc-950/40 px-3 py-1.5 rounded-lg">
                          <span>10 Nodes Connected</span>
                          <span>•</span>
                          <span>Gossip Protocol Valid</span>
                          <span>•</span>
                          <span>PTAH Engine OK</span>
                        </div>
                      </div>
                    )}

                    {/* CASE 2: Synthesizing Loader */}
                    {isSynthesizing && (
                      <div className="flex-1 flex flex-col min-h-0 font-mono">
                        {/* Upper progress */}
                        <div className="mb-5 bg-[#0b0b0f] border border-white/5 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-indigo-400 animate-pulse flex items-center gap-1.5 uppercase">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              {synthStepName}
                            </span>
                            <span className="text-xs font-extrabold text-white">{synthProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                              style={{ width: `${synthProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Swarm logs grid (10 items) */}
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">Swarm Nodes Real-time Gossip Stream:</h4>
                        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-1 max-h-[320px] scrollbar-thin">
                          {activeSynthesisLogs.map(log => (
                            <div key={log.modelId} className="bg-[#0b0b10] border border-white/5 rounded-xl p-3 flex flex-col justify-between gap-2.5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300 leading-none">{log.modelName}</div>
                                  <div className="text-[8px] text-zinc-500 uppercase font-bold mt-1 tracking-wider">{log.role}</div>
                                </div>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  log.status === 'thinking'
                                    ? 'bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20'
                                    : log.status === 'writing'
                                      ? 'bg-indigo-500/10 text-indigo-400 animate-pulse border border-indigo-500/20'
                                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                }`}>
                                  {log.status}
                                </span>
                              </div>
                              <div className="text-[9px] text-zinc-400 leading-relaxed font-mono truncate-3-lines">
                                {log.text}
                              </div>
                              <div className="flex justify-between items-center text-[7px] text-zinc-600 border-t border-white/5 pt-1.5">
                                <span>SPEED: {log.tokensPerSec} TOK/S</span>
                                <span>GOSSIP: STABLE</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CASE 3: Result Display */}
                    {synthesizerResult && !isSynthesizing && (
                      <div className="flex-1 flex flex-col min-h-0 font-sans">
                        
                        {/* Upper Summary info */}
                        <div className="mb-4 bg-[#0a0a0f] border border-white/5 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 font-mono">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shadow-md">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span>Pulse Synthesis ID</span>
                                <span className="text-[9px] text-zinc-500 font-normal">({synthesizerResult.synthesizer_activation.pulse_id})</span>
                              </div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">{new Date(synthesizerResult.synthesizer_activation.timestamp).toLocaleTimeString()} UTC</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">CONFIDENCE</div>
                              <div className="text-xs font-black text-green-400">{(synthesizerResult.synthesizer_activation.confidence_rating * 100).toFixed(2)}%</div>
                            </div>
                            <div className="text-right border-l border-white/5 pl-4">
                              <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">MODE</div>
                              <div className="text-xs font-black text-indigo-400 uppercase">{synthesizerResult.synthesizer_activation.mode_selected}</div>
                            </div>
                          </div>
                        </div>

                        {/* Result Tab Switcher */}
                        <div className="flex border-b border-white/5 mb-4 font-mono text-[10px]">
                          <button
                            type="button"
                            onClick={() => { playActivation(); setSynthResultTab('cot'); }}
                            className={`px-4 py-2 font-bold uppercase border-b-2 transition-all flex items-center gap-1.5 ${
                              synthResultTab === 'cot'
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <BrainIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>1. Swarm CoT & Analysis</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { playActivation(); setSynthResultTab('code'); }}
                            className={`px-4 py-2 font-bold uppercase border-b-2 transition-all flex items-center gap-1.5 ${
                              synthResultTab === 'code'
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>2. Final Actionable Code</span>
                          </button>
                        </div>

                        {/* Sub-tab 1: COT & Analysis */}
                        {synthResultTab === 'cot' && (
                          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[290px] font-mono scrollbar-thin">
                            
                            {/* Critical review */}
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5">
                              <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                Critical Swarm Review (Resolved Conflicts):
                              </h5>
                              <ul className="space-y-1.5">
                                {synthesizerResult.chain_of_thought.critical_review.map((item: string, i: number) => (
                                  <li key={i} className="text-[10px] text-zinc-300 leading-relaxed flex items-start gap-1.5">
                                    <span className="text-red-500/60 font-bold">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Precision filter */}
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5">
                              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Precision Noise Filter & Extraction:
                              </h5>
                              <ul className="space-y-1.5">
                                {synthesizerResult.chain_of_thought.precision_filter.map((item: string, i: number) => (
                                  <li key={i} className="text-[10px] text-zinc-300 leading-relaxed flex items-start gap-1.5">
                                    <span className="text-emerald-500/60 font-bold">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Architectural focus */}
                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5">
                              <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                                Architectural Synthesis Logic:
                              </h5>
                              <div className="space-y-1.5 text-[10px] text-zinc-300 leading-relaxed">
                                <div><strong className="text-white">FOCUS:</strong> {synthesizerResult.chain_of_thought.architectural_construction.focus}</div>
                                <div><strong className="text-white">LOGIC:</strong> {synthesizerResult.chain_of_thought.architectural_construction.synthesis_logic}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sub-tab 2: Final Code Output */}
                        {synthResultTab === 'code' && (
                          <div className="flex-1 flex flex-col min-h-0 space-y-4 font-mono">
                            
                            {/* Verification report banner */}
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 flex items-center gap-2 text-[10px] text-emerald-400 shrink-0">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{synthesizerResult.final_actionable_synthesis.verification_report}</span>
                            </div>

                            {/* Code editor container */}
                            <div className="flex-1 relative border border-white/5 rounded-xl overflow-hidden bg-zinc-950 flex flex-col min-h-[140px] max-h-[190px]">
                              <div className="flex justify-between items-center bg-[#0d0d11] px-3.5 py-1.5 border-b border-white/5 text-[9px] text-zinc-500 shrink-0">
                                <span>OUTPUT ARTIFACT</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(synthesizerResult.final_actionable_synthesis.synthesis_output);
                                    toast.success('Скопировано в буфер обмена!');
                                  }}
                                  className="text-zinc-400 hover:text-white transition-colors animate-pulse"
                                >
                                  COPY CODE
                                </button>
                              </div>
                              <div className="flex-1 overflow-auto p-3 text-[10px] font-mono leading-relaxed text-[#d4d4d8] whitespace-pre-wrap">
                                {synthesizerResult.final_actionable_synthesis.synthesis_output}
                              </div>
                            </div>

                            {/* Steps list */}
                            <div className="shrink-0 space-y-1 bg-white/5 border border-white/5 rounded-xl p-3 text-[10px]">
                              <div className="font-bold text-zinc-300 uppercase tracking-wider mb-1 font-mono">Post-Synthesis Integration Protocol:</div>
                              {synthesizerResult.final_actionable_synthesis.implementation_steps.map((step: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-zinc-400 leading-relaxed font-mono">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>

                            {/* Action Injector Button */}
                            <button
                              type="button"
                              onClick={applySynthesisResult}
                              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 border border-emerald-500/20 active:scale-98 transition-all"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>INJECT & INTEGRATE INTO PROJECT</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Bottom Live VM Terminal */}
          <div className="h-64 border-t border-white/5 bg-[#050507] flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#08080a] shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-emerald-400">Virtual Bash Shell Terminal</span>
              </div>
              <div className="flex gap-2">
                {['npm run dev', 'git status', 'firebase deploy'].map(shortcut => (
                  <button
                    key={shortcut}
                    onClick={() => {
                      setCommandInput(shortcut);
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono border border-white/5 text-zinc-400 hover:text-white"
                  >
                    {shortcut}
                  </button>
                ))}
                <button
                  onClick={() => setTerminalLogs([])}
                  className="text-[9px] font-mono text-zinc-500 hover:text-white px-2 py-0.5 rounded bg-white/5 border border-white/5"
                >
                  Clear logs
                </button>
              </div>
            </div>

            {/* Command-line text feed */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] text-[#A0A0A0] leading-normal space-y-1">
              {terminalLogs.map((log, index) => {
                if (log.startsWith('$ ')) {
                  return (
                    <div key={index} className="text-[#f3f4f6] font-bold mt-1.5 flex gap-1">
                      <span className="text-emerald-500">metatron@pulse-os:~$</span>
                      <span>{log.substring(2)}</span>
                    </div>
                  );
                } else if (log.includes('✔') || log.includes('✓') || log.includes('complete') || log.includes('successfully') || log.includes('compiles')) {
                  return <div key={index} className="text-emerald-400">{log}</div>;
                } else if (log.includes('error') || log.includes('Error:') || log.includes('Failed')) {
                  return <div key={index} className="text-rose-400 font-bold">{log}</div>;
                } else if (log.startsWith('---Content of') || log.startsWith('Listing workspace')) {
                  return <div key={index} className="text-indigo-400">{log}</div>;
                }
                return <div key={index}>{log}</div>;
              })}
              <div ref={terminalBottomRef} />
            </div>

            {/* Command line prompt form */}
            <form onSubmit={handleTerminalSubmit} className="flex border-t border-white/5 bg-[#09090c] shrink-0">
              <div className="flex items-center px-4 font-mono text-xs text-emerald-500 select-none border-r border-white/5 bg-black/20">
                metatron@pulse-os:~$
              </div>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Type command (e.g. ls, help, npm run dev, firebase deploy, cat .env)"
                className="flex-1 bg-transparent px-4 py-3 outline-none text-xs font-mono text-[#E0E0E0]"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-zinc-300 border-l border-white/5"
              >
                EXECUTE
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: REACTION LIVE PREVIEW & METATRON REASONING TRACE */}
        <div className={`border-l border-white/5 bg-[#08080a] flex flex-col min-h-0 transition-all duration-300 ${
          expandedSection === 'right'
            ? 'flex-1 w-full opacity-100 ring-2 ring-indigo-500/20 z-10'
            : expandedSection !== 'none'
              ? 'w-0 opacity-0 pointer-events-none hidden'
              : rightCollapsed
                ? 'w-0 opacity-0 pointer-events-none'
                : 'w-80 opacity-100 shrink-0'
        }`}>
          
          {/* Reaction Live Preview */}
          <div className="h-2/3 border-b border-white/5 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0c0c10] shrink-0">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white">Live VM Ingress Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] font-mono text-zinc-500 mr-1">PORT: 3000</span>
                <div className="h-4 w-px bg-white/5"></div>
                
                <button
                  type="button"
                  onClick={() => {
                    playActivation();
                    setExpandedSection(prev => prev === 'right' ? 'none' : 'right');
                  }}
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95 text-[9px] font-mono font-bold"
                  title={expandedSection === 'right' ? "Свернуть в стандартный вид" : "Развернуть на весь экран"}
                >
                  {expandedSection === 'right' ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-indigo-400" />
                      <span className="text-indigo-400">RESTORE</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-teal-400" />
                      <span>MAXIMIZE</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Virtualized IFrame representation */}
            <div className="flex-1 p-4 bg-[#111116] overflow-hidden flex flex-col">
              <div className="bg-zinc-950 border border-white/5 rounded-xl flex-1 overflow-hidden flex flex-col shadow-inner">
                {/* Browser bar mockup */}
                <div className="bg-zinc-900 px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5 shrink-0 select-none">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-700"></span>
                    <span className="h-2 w-2 rounded-full bg-zinc-700"></span>
                    <span className="h-2 w-2 rounded-full bg-zinc-700"></span>
                  </div>
                  <div className="flex-1 bg-zinc-950/70 text-[9px] text-zinc-500 py-0.5 px-3 rounded-md font-mono flex items-center justify-between">
                    <span>https://metatron-pulse-port3000.dev</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                  </div>
                </div>

                {/* Render compiled sandbox content via iframe srcdoc */}
                <div className="flex-1 relative bg-white">
                  <iframe
                    title="METATRON Sandbox Application Live View"
                    srcDoc={files.find(f => f.path === '/index.html')?.content || ''}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active METATRON AI Agent reasoning logs */}
          <div className="h-1/3 flex flex-col min-h-0 bg-[#070709]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#09090c] shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">Agent Reasoning Trace</span>
              </div>
              {isAgentRunning && (
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 animate-pulse font-mono">
                  <span>THINKING</span>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-3 leading-relaxed">
              {agentLogs.length === 0 ? (
                <div className="text-center text-zinc-600 py-8">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>Awaiting METATRON Agent action triggering...</p>
                </div>
              ) : (
                agentLogs.map((log, idx) => {
                  if (log.type === 'thought') {
                    return (
                      <div key={idx} className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5">
                        <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1">
                          <BrainIcon className="w-3.5 h-3.5" /> 🧠 THINK:
                        </div>
                        <div className="text-zinc-300">{log.message}</div>
                      </div>
                    );
                  } else if (log.type === 'tool') {
                    return (
                      <div key={idx} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                        <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5" /> 🛠️ CALL_TOOL:
                        </div>
                        <div className="text-[#E0E0E0] font-bold">{log.message}</div>
                        {log.subText && (
                          <div className="text-zinc-500 mt-1 font-mono text-[9px] bg-black/20 p-1.5 rounded border border-white/5 select-all overflow-x-auto">
                            {log.subText}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
                        <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> 📥 TOOL_RESPONSE:
                        </div>
                        <div className="text-zinc-400 whitespace-pre-wrap select-all overflow-x-auto text-[9px] bg-black/10 p-1.5 rounded border border-white/5 mt-1">
                          {log.subText || log.message}
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>

        </div>

        {/* Right vertical border click trigger when collapsed */}
        {rightCollapsed && (
          <div 
            onClick={() => {
              playActivation();
              setRightCollapsed(false);
            }}
            onMouseEnter={playHover}
            className="w-12 border-l border-white/5 bg-[#08080a] flex flex-col items-center py-6 gap-4 cursor-pointer hover:bg-zinc-900 transition-colors select-none group shrink-0"
            title="Развернуть правую панель"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-400 group-hover:scale-125 transition-transform" />
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest [writing-mode:vertical-lr] rotate-180 uppercase select-none font-bold">
              РАЗВЕРНУТЬ ПРЕВЬЮ
            </span>
          </div>
        )}

      </div>

      {/* Floating System Enclave Lock Info */}
      <div className="bg-[#050507] border-t border-white/5 py-2 px-6 shrink-0 flex items-center justify-between text-[9px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>VAULT PROTECTION CORE ACTIVE: SHIELD_ENCLAVE_v4_STRICT</span>
        </div>
        <div>
          <span>METATRON BUILD SYSTEM - PORT 3000 DIRECT OVERPASS</span>
        </div>
      </div>
    </motion.div>
  );
}

function Brain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 6v12"/>
      <path d="M8 10c0-1.5 1-2.5 2-2.5"/>
      <path d="M16 10c0-1.5-1-2.5-2-2.5"/>
      <path d="M8 14c0 1.5 1 2.5 2 2.5"/>
      <path d="M16 14c0 1.5-1 2.5-2 2.5"/>
    </svg>
  );
}
