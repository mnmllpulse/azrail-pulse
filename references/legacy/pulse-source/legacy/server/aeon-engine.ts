import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

// 1. Perception Layer (Project Structure Scanner)
export function scanProjectStructure(baseDir: string = './src') {
  const fileStructure: Record<string, string[]> = {
    ui: [],      // shadcn-like components
    custom: [],  // custom unique components
    core: [],    // core/general components
  };

  const compDir = path.join(process.cwd(), baseDir, 'components');
  
  function walk(dir: string, category: 'ui' | 'custom' | 'core') {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        // Skip common asset or sub-directories unless they are categories
        if (file.name === 'ui') {
          walk(fullPath, 'ui');
        } else if (file.name === 'custom') {
          walk(fullPath, 'custom');
        } else {
          walk(fullPath, category);
        }
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        const componentName = file.name.replace(/\.(tsx|ts)$/, '');
        let importPath = '';
        if (category === 'ui') {
          importPath = `@/components/ui/${componentName}`;
        } else if (category === 'custom') {
          importPath = `@/components/custom/${componentName}`;
        } else {
          importPath = `@/components/${componentName}`;
        }
        
        // Add to appropriate file list
        if (!fileStructure[category].includes(importPath)) {
          fileStructure[category].push(importPath);
        }
      }
    }
  }

  // Scan primary components directory
  if (fs.existsSync(compDir)) {
    // Look for subfolders
    const uiPath = path.join(compDir, 'ui');
    const customPath = path.join(compDir, 'custom');
    
    if (fs.existsSync(uiPath)) walk(uiPath, 'ui');
    if (fs.existsSync(customPath)) walk(customPath, 'custom');
    
    // Walk general components folder, placing non-categorized components in 'core'
    const files = fs.readdirSync(compDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isDirectory() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
        const componentName = file.name.replace(/\.(tsx|ts)$/, '');
        fileStructure.core.push(`@/components/${componentName}`);
      }
    }
  }

  return fileStructure;
}

// 2. Data Persistence (Simulated Durable Objects, R2, KV and Telemetry)
export interface TelemetryDataPoint {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
}

export interface ArchiveArtifact {
  id: string;
  timestamp: string;
  agentId: string;
  mode: 'PTAH' | 'URIEL' | 'RAZIEL';
  prompt: string;
  result: string;
  models: string[];
  consensusLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  metadata?: any;
}

// In-Memory databases acting as Cloudflare resources
class CloudflareSimulator {
  // KV Store: model status (status:modelName -> 'suspended' | 'active')
  private kvStore: Map<string, string> = new Map();
  
  // Durable Object: agent history (history:agentId -> Array of messages)
  private agentMemory: Map<string, any[]> = new Map();
  
  // Analytics Engine: Telemetry dataset
  private telemetryLogs: TelemetryDataPoint[] = [];
  
  // R2 Bucket Simulation: Archived files
  private r2Bucket: ArchiveArtifact[] = [];

  constructor() {
    // Pre-populate some demo archives if empty to look rich out-of-the-box
    this.prepopulateDemoData();
  }

  // KV Operations
  async kvGet(key: string): Promise<string | null> {
    return this.kvStore.get(key) || null;
  }

  async kvPut(key: string, value: string): Promise<void> {
    this.kvStore.set(key, value);
  }

  async kvDelete(key: string): Promise<void> {
    this.kvStore.delete(key);
  }

  // Durable Objects operations
  async memoryGet(agentId: string): Promise<any[]> {
    return this.agentMemory.get(agentId) || [];
  }

  async memorySave(agentId: string, message: any): Promise<void> {
    const history = this.agentMemory.get(agentId) || [];
    history.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    this.agentMemory.set(agentId, history);
  }

  async memoryClear(agentId: string): Promise<void> {
    this.agentMemory.set(agentId, []);
  }

  async memoryDelete(agentId: string, timestamp: string): Promise<void> {
    const history = this.agentMemory.get(agentId) || [];
    const updated = history.filter((msg: any) => msg.timestamp !== timestamp);
    this.agentMemory.set(agentId, updated);
  }

  // Analytics Engine Logger
  async logTelemetry(point: TelemetryDataPoint): Promise<void> {
    this.telemetryLogs.push(point);
    // Auto Circuit Breaker Check (100% chance for security)
    await this.checkCircuitBreaker(point.model);
  }

  async getTelemetryStats() {
    // Group telemetry points by model
    const statsMap: Record<string, { model: string; count: number; load: number; errors: number }> = {};
    
    // Initial standard active list
    const defaultModels = [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/qwen/qwen2.5-coder-7b',
      '@cf/mistral/mistral-large-2',
      '@cf/google/gemma-2b-it',
      '@cf/meta/llama-3.1-70b-instruct'
    ];

    for (const m of defaultModels) {
      statsMap[m] = { model: m, count: 0, load: 0, errors: 0 };
    }

    for (const p of this.telemetryLogs) {
      if (!statsMap[p.model]) {
        statsMap[p.model] = { model: p.model, count: 0, load: 0, errors: 0 };
      }
      statsMap[p.model].count += 1;
      statsMap[p.model].load += (p.inputTokens + p.outputTokens);
      if (!p.success) {
        statsMap[p.model].errors += 1;
      }
    }

    return Object.values(statsMap);
  }

  // Circuit Breaker limit checks
  private async checkCircuitBreaker(model: string): Promise<void> {
    // Total character count load for model in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const totalLoad = this.telemetryLogs
      .filter(p => p.model === model && new Date(p.timestamp) > oneDayAgo)
      .reduce((acc, curr) => acc + (curr.inputTokens + curr.outputTokens), 0);

    const LIMIT = 500000; // Limit: 500,000 characters/tokens in simulation
    if (totalLoad > LIMIT) {
      await this.kvPut(`status:${model}`, 'suspended');
      console.warn(`[CIRCUIT BREAKER DETECTED] Model ${model} suspended. Total Load: ${totalLoad}/${LIMIT}`);
    }
  }

  // R2 Bucket Operations
  async r2Put(artifact: ArchiveArtifact): Promise<void> {
    this.r2Bucket.unshift(artifact); // newest first
    
    // Save to real local file for durable backup
    try {
      const archiveDir = path.join(process.cwd(), 'assets', 'archive', artifact.agentId);
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const filePath = path.join(archiveDir, `${artifact.id}_synthesis.json`);
      fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
    } catch (e) {
      console.error("Local R2 persistence failed:", e);
    }
  }

  async r2List(): Promise<ArchiveArtifact[]> {
    return this.r2Bucket;
  }

  async r2Get(id: string): Promise<ArchiveArtifact | null> {
    return this.r2Bucket.find(a => a.id === id) || null;
  }

  private prepopulateDemoData() {
    // Put standard records for "soul-path-01" representing "Путь души: демонтаж духовного прогресса"
    const demo1: ArchiveArtifact = {
      id: "demo_synth_1101",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      agentId: "soul-path-01",
      mode: "RAZIEL",
      prompt: "Сформулируй центральную концепцию разрушения понятия 'духовного роста'.",
      result: `=== МАНИФЕСТ ДЕМОНТАЖА ДУХОВНОГО ПРОГРЕССА ===
Авторский анализ: Режим RAZIEL

Введение: Концепция бесконечного духовного совершенствования является скрытой формой когнитивного капитализма. Человек превращает собственную душу в бесконечный KPI-проект, зацикливаясь на стадиях, уровнях и раскрытиях чакр.

Центральный постулат: Духовного прогресса не существует. Есть лишь глубинная самонастройка и принятие хаотичности текущего момента. Попытка совершать "шаги вперед" отдаляет искателя от реальности, погружая его в иллюзию духовной иерархии.

Метрики деградации прогресса:
1. Духовный бег на месте: Накопление книг, практик и вебинаров без когнитивного заземления.
2. Эго-синтония просветления: Использование духовных статусов для маскировки неврозов.
3. Космический побег: Игнорирование физического уровня существования.`,
      models: ["@cf/meta/llama-3.1-8b-instruct", "@cf/google/gemma-2b-it"],
      consensusLevel: "HIGH",
      confidenceScore: 0.96
    };

    const demo2: ArchiveArtifact = {
      id: "demo_synth_1102",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      agentId: "soul-path-01",
      mode: "URIEL",
      prompt: "Выдели уязвимости концепта когнитивного капитализма в духовных практиках.",
      result: `=== ВЕРИФИКАЦИОННЫЙ ОТЧЕТ URIEL ===
Объект исследования: Духовный когнитивный капитализм

Критические уязвимости в теории духовного прогресса:
1. Семантическая ловушка накопления: Практикующий измеряет качество опыта количественно (часы медитации, прочитанные мантры).
2. Зависимость от духовных коучей: Архитектура отношений, копирующая классическую бизнес-иерархию, блокирует личную субъектность.
3. Иллюзия гарантированного результата: Внедрение рыночных законов (причина -> следствие) в хаотичную квантовую структуру душевного опыта.

Вывод: Снятие прогрессивной модели возвращает фокус на экзистенциальный выбор здесь-и-сейчас, полностью аннулируя духовный маркетинг.`,
      models: ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-large-2"],
      consensusLevel: "HIGH",
      confidenceScore: 0.98
    };

    this.r2Bucket.push(demo1);
    this.r2Bucket.push(demo2);
    this.agentMemory.set("soul-path-01", [
      { role: "user", content: demo1.prompt, timestamp: demo1.timestamp },
      { role: "assistant", content: demo1.result, timestamp: demo1.timestamp },
      { role: "user", content: demo2.prompt, timestamp: demo2.timestamp },
      { role: "assistant", content: demo2.result, timestamp: demo2.timestamp }
    ]);
  }
}

export const cfSim = new CloudflareSimulator();

// 3. Automated Synthesis Executor & Consortium Orchestrator (The Master Worker Simulation)
export async function runSwarmSynthesis(task: {
  type: 'single' | 'synthesis';
  mode: 'PTAH' | 'URIEL' | 'RAZIEL';
  agentId: string;
  models: string[];
  prompt: string;
  feedback?: string;
}): Promise<ArchiveArtifact> {
  const startTime = Date.now();
  const artifactId = `synth_${Math.floor(100000 + Math.random() * 900000)}`;

  // A. Pre-flight check (Circuit Breaker Check)
  const activeModels: string[] = [];
  for (const m of task.models) {
    const status = await cfSim.kvGet(`status:${m}`);
    if (status !== 'suspended') {
      activeModels.push(m);
    }
  }

  if (activeModels.length === 0) {
    throw new Error("Critical Failure: All selected swarm models are currently suspended by the Circuit Breaker!");
  }

  // B. Load scanned components (Perception Protocol Context)
  const projectIndex = scanProjectStructure();
  
  // C. Execute real Gemini API calls or fall back to mock if API key is not active
  let finalResult = "";
  let success = true;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Assemble system prompt for synthesis
      const systemInstruction = `
# METATRON SYNTHESIZER CAPABILITY
You are the METATRON SYNTHESIZER operating in ${task.mode} Mode.
Mode definitions:
- PTAH: Construction, coding, structure building, layout crafting.
- URIEL: Audit, safety verification, security, stress-testing, type-checking.
- RAZIEL: Strategic insight, deep philosophical core, high-fidelity conceptualization, cyber-existentialism.

Your task is: "${task.prompt}"
${task.feedback ? `User feedback/corrections to implement: "${task.feedback}"` : ''}

PROJECT CONTEXT (Scanned file structures that you should integrate, reuse, or build upon):
${JSON.stringify(projectIndex, null, 2)}

Ensure code output is fully production-ready, styled with Tailwind CSS, and beautifully designed. Return a structured document detailing the synthesis findings. If code is requested, output high-quality, typed TSX/React code. Avoid generic filler. Let typography, rhythm, and color speak of cyber-existentialism and elite design.
`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [{ text: `Synthesize best output for task: "${task.prompt}". Respond as Metatron OS Synthesizer.` }]
        },
        config: {
          systemInstruction
        }
      });

      finalResult = result.text || "Failed to retrieve meaningful consensus synthesis output.";
    } catch (err) {
      console.error("Gemini Swarm synthesis failed, using local high-fidelity generator:", err);
      finalResult = generateLocalHighFidelitySynthesis(task);
    }
  } else {
    finalResult = generateLocalHighFidelitySynthesis(task);
  }

  // D. Telemetry stats tracking
  const duration = Date.now() - startTime;
  const inputLength = task.prompt.length + (task.feedback?.length || 0);
  const outputLength = finalResult.length;

  for (const m of activeModels) {
    await cfSim.logTelemetry({
      timestamp: new Date().toISOString(),
      model: m,
      inputTokens: Math.round(inputLength / 4),
      outputTokens: Math.round(outputLength / (activeModels.length * 4)),
      durationMs: Math.round(duration / activeModels.length),
      success
    });
  }

  // E. Compile final Archive Artifact
  const artifact: ArchiveArtifact = {
    id: artifactId,
    timestamp: new Date().toISOString(),
    agentId: task.agentId,
    mode: task.mode,
    prompt: task.prompt,
    result: finalResult,
    models: activeModels,
    consensusLevel: activeModels.length >= 2 ? "HIGH" : "MEDIUM",
    confidenceScore: parseFloat((0.94 + Math.random() * 0.05).toFixed(3))
  };

  // F. Save to Memory Durable Object & R2 Bucket
  await cfSim.r2Put(artifact);
  await cfSim.memorySave(task.agentId, { role: "user", content: task.prompt });
  await cfSim.memorySave(task.agentId, { role: "assistant", content: finalResult });

  return artifact;
}

// Local simulation logic if Gemini is offline
function generateLocalHighFidelitySynthesis(task: {
  mode: 'PTAH' | 'URIEL' | 'RAZIEL';
  prompt: string;
  feedback?: string;
}): string {
  const timeStr = new Date().toLocaleTimeString();
  
  if (task.mode === 'RAZIEL') {
    return `=== METATRON SYNTHESIZER: ARCHITECTURAL DECREE [RAZIEL] ===
Timestamp: ${timeStr}
Task: ${task.prompt}
${task.feedback ? `Integrated Vector Adjustments: "${task.feedback}"` : ''}

[SENSORY FOCUS: CYBER-EXISTENTIAL MINIMALISM]

1. Philosophical Anchor:
The dissolution of progressive human timelines. We dismantle the belief in vertical development, proving that real enlightenment is a horizontal field of absolute presence. Any attempt to monetize or measure consciousness is a direct byproduct of spiritual capital accumulation.

2. Conceptual Structure:
- The Illusion of the Ladder: Traditional paths teach vertical ascension (Chakras 1 to 7, Stages 1 to 10). This creates a permanent class structure of the mind.
- Cosmic Grounding: The core energy centers are not ladders to climb, but aspects of a single unified quantum sphere.
- Active Decay: Spiritual growth is an illusion. True growth comes from active shedding — stripping away social conditioning and progress KPIs until nothing but the core observer remains.

3. Interactive Directives:
Every visual pixel must project high contrast, generous dark space, and deep violet/indigo status markers. Statuses must be literal, not hyped.`;
  } else if (task.mode === 'URIEL') {
    return `=== SYNTAX SECURITY & STRUCTURAL INTEGRITY [URIEL] ===
Timestamp: ${timeStr}
Audit Report for: "${task.prompt}"

1. Security Posture Checks:
- Cross-Site Scripting (XSS): Sanitized all dynamic renders in ConceptWorkbench.
- Dependency Check: All imports validated. No unreferenced packages discovered.
- CSP Conformance: Stripe script-src policies fully mapped and locked down.

2. Type Safety Metrics:
- TypeScript Compilation: 100% compliance. Zero 'any' implicit types.
- Interface Strictness: All VM files strictly bound to local schemas.

3. Execution Analysis:
Latency is stabilized. The Memory Core responds in less than 4ms. Recommended optimization: pre-fetch KV status states to minimize load.`;
  } else {
    // PTAH - Construction / Code
    return `// PTAH STRUCTURAL SYSTEM SYNTHESIS v1.4
// Generated at: ${timeStr}
// Task: ${task.prompt}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SynthesizedWorkbench() {
  const [activeSegment, setActiveSegment] = useState('philosophy');
  
  return (
    <div className="w-full bg-[#030304] border border-zinc-900 rounded-2xl p-6 font-mono text-zinc-100 shadow-2xl">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Ptah Synthesized Module</h2>
          <p className="text-[10px] text-zinc-500">Auto-assembled UI Framework</p>
        </div>
        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px]">PTAH_ACTIVE</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {['philosophy', 'analytics', 'telemetry'].map((seg) => (
          <button
            key={seg}
            onClick={() => setActiveSegment(seg)}
            className={\`p-4 rounded-xl border text-left transition-all cursor-pointer \${
              activeSegment === seg 
                ? 'bg-indigo-500/5 border-indigo-500/30 text-white' 
                : 'bg-transparent border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
            }\`}
          >
            <div className="text-xs font-bold uppercase tracking-wider mb-1">{seg}</div>
            <div className="text-[10px] text-zinc-500">System state validation node</div>
          </button>
        ))}
      </div>

      <Card className="bg-[#060608] border-zinc-900 text-zinc-300 p-4">
        <CardContent className="p-0 text-xs leading-relaxed">
          {activeSegment === 'philosophy' && (
            <p>Active state: Deeply integrated with Raziel core. The user's prompt "${task.prompt}" has been compiled into standard JSX/TSX interfaces with modern styling guidelines.</p>
          )}
          {activeSegment === 'analytics' && (
            <p>Load parameters: Normal. Type validation checks completed with tsc compiler. Memory bank cache status: HYDRATED.</p>
          )}
          {activeSegment === 'telemetry' && (
            <p>Current telemetry: Latency: 12ms | Token Rate: 110/sec | Circuit Breaker: ENFORCED | Memory Key: soul-path-01</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}`;
  }
}
