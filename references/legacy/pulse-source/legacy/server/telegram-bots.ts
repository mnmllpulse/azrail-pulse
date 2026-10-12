import { Request, Response } from 'express';

export interface TelegramBotInfo {
  id: string;
  name: string;
  username: string;
  status: 'ONLINE' | 'OFFLINE' | 'SIMULATED';
  description: string;
  capabilities: string[];
  metrics: {
    messagesProcessed: number;
    webAppSessions: number;
    commandsTriggered: number;
    lastActive: string;
  };
  commands: { command: string; description: string }[];
}

class TelegramBotsManager {
  private bots: Record<string, TelegramBotInfo> = {
    'mnmllpulse_os': {
      id: 'mnmllpulse_os',
      name: 'mnmllpulse_os',
      username: 'darkmnmllpulse_os_bot',
      status: process.env.TG_BOT_TOKEN_OS ? 'ONLINE' : 'SIMULATED',
      description: 'The core neural link for Dark Mnmll OS.',
      capabilities: ['Full System Access', 'Neural Monitoring', 'Security Core'],
      metrics: { messagesProcessed: 512, webAppSessions: 124, commandsTriggered: 210, lastActive: new Date().toISOString() },
      commands: [{ command: 'start', description: 'Boot the OS neural link' }]
    },
    'mnmllpulse': {
      id: 'mnmllpulse',
      name: 'mnmllpulse',
      username: 'mnmpllpulse_bot',
      status: process.env.TG_BOT_TOKEN_PULSE ? 'ONLINE' : 'SIMULATED',
      description: 'Core Pulse OS companion. Manages telemetry and main control panels.',
      capabilities: ['System Control', 'Live Metrics', 'TWA Launcher'],
      metrics: { messagesProcessed: 142, webAppSessions: 38, commandsTriggered: 56, lastActive: new Date().toISOString() },
      commands: [
        { command: 'start', description: 'Initialize Pulse OS & Web App' },
        { command: 'status', description: 'System integrity check' }
      ]
    },
    'mnmllcoding': {
      id: 'mnmllcoding',
      name: 'mnmllcoding',
      username: 'mnmllcoding_bot',
      status: process.env.TG_BOT_TOKEN_CODING ? 'ONLINE' : 'SIMULATED',
      description: 'Neural coding assistant. Handles logic synthesis and code shadowing.',
      capabilities: ['Code Generation', 'Logic Debugging', 'Git Sync Alerts'],
      metrics: { messagesProcessed: 89, webAppSessions: 14, commandsTriggered: 29, lastActive: new Date().toISOString() },
      commands: [
        { command: 'start', description: 'Open Coding companion' },
        { command: 'debug', description: 'Analyze current logic' }
      ]
    },
    'mnmllghost': {
      id: 'mnmllghost',
      name: 'mnmllghost',
      username: 'mnmllhost_bot',
      status: process.env.TG_BOT_TOKEN_GHOST ? 'ONLINE' : 'SIMULATED',
      description: 'Market ghost and trend analyzer. Operates in the shadows of data.',
      capabilities: ['Market Analysis', 'Trend Prediction', 'Secret Signals'],
      metrics: { messagesProcessed: 215, webAppSessions: 42, commandsTriggered: 88, lastActive: new Date().toISOString() },
      commands: [
        { command: 'start', description: 'Enter the Ghost network' },
        { command: 'signals', description: 'View latest market ghosts' }
      ]
    },
    'mnmllimage': {
      id: 'mnmllimage',
      name: 'mnmllimage',
      username: 'mnmllpulse_image_bot',
      status: process.env.TG_BOT_TOKEN_IMAGE ? 'ONLINE' : 'SIMULATED',
      description: 'Visual generation and neural image synthesis.',
      capabilities: ['AI Image Gen', 'Asset Enhancement', 'Style Transfer'],
      metrics: { messagesProcessed: 64, webAppSessions: 22, commandsTriggered: 31, lastActive: new Date().toISOString() },
      commands: [
        { command: 'generate', description: 'Synthesize new visual asset' }
      ]
    },
    'mnmllmotion': {
      id: 'mnmllmotion',
      name: 'mnmllmotion',
      username: 'mnmllpulse_motion_bot',
      status: process.env.TG_BOT_TOKEN_MOTION ? 'ONLINE' : 'SIMULATED',
      description: 'Motion design and animation engine companion.',
      capabilities: ['Keyframe Sync', 'Render Notifications', 'Motion Curves'],
      metrics: { messagesProcessed: 45, webAppSessions: 12, commandsTriggered: 18, lastActive: new Date().toISOString() },
      commands: [
        { command: 'render', description: 'Check motion render status' }
      ]
    },
    'mnmlldirector': {
      id: 'mnmlldirector',
      name: 'mnmlldirector',
      username: 'mnmllpulse_director_bot',
      status: process.env.TG_BOT_TOKEN_DIRECTOR ? 'ONLINE' : 'SIMULATED',
      description: 'Orchestrates complex creative tasks and project pipelines.',
      capabilities: ['Project Management', 'Scene Planning', 'Creative Direction'],
      metrics: { messagesProcessed: 27, webAppSessions: 5, commandsTriggered: 10, lastActive: new Date().toISOString() },
      commands: [{ command: 'plan', description: 'Start a new project plan' }]
    },
    'mnmlltext': {
      id: 'mnmlltext',
      name: 'mnmlltext',
      username: 'mnmlltext_bot',
      status: process.env.TG_BOT_TOKEN_TEXT ? 'ONLINE' : 'SIMULATED',
      description: 'Linguistic engine for refined dark minimalist prose.',
      capabilities: ['Copywriting', 'Neural Translation', 'Tone Tuning'],
      metrics: { messagesProcessed: 156, webAppSessions: 33, commandsTriggered: 45, lastActive: new Date().toISOString() },
      commands: [{ command: 'refine', description: 'Polish provided text' }]
    },
    'mnmllprompt': {
      id: 'mnmllprompt',
      name: 'mnmllprompt',
      username: 'mnmllpromter_bot',
      status: process.env.TG_BOT_TOKEN_PROMPT ? 'ONLINE' : 'SIMULATED',
      description: 'Engineer of prompts for high-fidelity AI outputs.',
      capabilities: ['Prompt Optimization', 'Negative Prompting', 'Chain-of-Thought Design'],
      metrics: { messagesProcessed: 312, webAppSessions: 56, commandsTriggered: 92, lastActive: new Date().toISOString() },
      commands: [{ command: 'optimize', description: 'Enhance your AI prompt' }]
    },
    'mnmllpfilosofi': {
      id: 'mnmllpfilosofi',
      name: 'mnmllpfilosofi',
      username: 'mnmllpfilisofi_bot',
      status: process.env.TG_BOT_TOKEN_FILOSOFI ? 'ONLINE' : 'SIMULATED',
      description: 'The philosophical core of the minimalist aesthetic.',
      capabilities: ['Deep Insight', 'Aesthetic Theory', 'Existential Logic'],
      metrics: { messagesProcessed: 42, webAppSessions: 10, commandsTriggered: 15, lastActive: new Date().toISOString() },
      commands: [{ command: 'ponder', description: 'Request philosophical insight' }]
    },
    'mnmllvision': {
      id: 'mnmllvision',
      name: 'mnmllvision',
      username: 'MNMLL_VISUAL_BOT',
      status: process.env.TG_BOT_TOKEN_VISION ? 'ONLINE' : 'SIMULATED',
      description: 'Visual analysis and computer vision hub.',
      capabilities: ['Image Analysis', 'OCR', 'Object Detection'],
      metrics: { messagesProcessed: 78, webAppSessions: 20, commandsTriggered: 25, lastActive: new Date().toISOString() },
      commands: [{ command: 'analyze', description: 'Analyze an image' }]
    },
    'mnmllsound': {
      id: 'mnmllsound',
      name: 'mnmllsound',
      username: 'MNMLL_SOUND_BOT',
      status: process.env.TG_BOT_TOKEN_SOUND ? 'ONLINE' : 'SIMULATED',
      description: 'Sonic synthesis and audio engineering link.',
      capabilities: ['Beat Generation', 'Mastering Simulation', 'Foley Synthesis'],
      metrics: { messagesProcessed: 54, webAppSessions: 15, commandsTriggered: 22, lastActive: new Date().toISOString() },
      commands: [{ command: 'sync', description: 'Sync sound parameters' }]
    },
    'mnmllvisionari': {
      id: 'mnmllvisionari',
      name: 'mnmllvisionari',
      username: 'MNMLL_VISIONARY_BOT',
      status: process.env.TG_BOT_TOKEN_VISIONARI ? 'ONLINE' : 'SIMULATED',
      description: 'Future-casting and conceptual art companion.',
      capabilities: ['Concept Mapping', 'Trend Forecasting', 'Mood Boarding'],
      metrics: { messagesProcessed: 39, webAppSessions: 9, commandsTriggered: 14, lastActive: new Date().toISOString() },
      commands: [{ command: 'vision', description: 'Generate a vision concept' }]
    },
    'mnmllsentry': {
      id: 'mnmllsentry',
      name: 'mnmllsentry',
      username: 'MNMLL_SENTRY_BOT',
      status: process.env.TG_BOT_TOKEN_SENTRY ? 'ONLINE' : 'SIMULATED',
      description: 'Security sentinel and firewall monitor.',
      capabilities: ['Intrusion Alerts', 'Vulnerability Scans', 'Access Logs'],
      metrics: { messagesProcessed: 1240, webAppSessions: 0, commandsTriggered: 0, lastActive: new Date().toISOString() },
      commands: [{ command: 'report', description: 'Fetch latest security report' }]
    },
    'mnmllarhitect': {
      id: 'mnmllarhitect',
      name: 'mnmllarhitect',
      username: 'MNMLI_ARCHITECT_BOT',
      status: process.env.TG_BOT_TOKEN_ARHITECT ? 'ONLINE' : 'SIMULATED',
      description: 'System architect and structural layout engine.',
      capabilities: ['Layout Design', 'DB Schema Mapping', 'Infra Planning'],
      metrics: { messagesProcessed: 33, webAppSessions: 8, commandsTriggered: 12, lastActive: new Date().toISOString() },
      commands: [
        { command: 'schema', description: 'Review neural database structure' }
      ]
    }
  };

  private messageLogs: Array<{
    id: string;
    botId: string;
    direction: 'incoming' | 'outgoing';
    text: string;
    timestamp: string;
    user: string;
  }> = [];

  constructor() {
    // Seed message logs with a few initial diagnostic events
    const initialBots = Object.keys(this.bots);
    initialBots.forEach((botId) => {
      this.messageLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        botId,
        direction: 'incoming',
        text: '/start',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: '@andrik494'
      });
      this.messageLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        botId,
        direction: 'outgoing',
        text: `Welcome to ${this.bots[botId].name}! Telegram Web App environment initialized. Use /webapp or click below to launch.`,
        timestamp: new Date(Date.now() - 3590000).toISOString(),
        user: '@andrik494'
      });
    });
  }

  public getBots(): TelegramBotInfo[] {
    return Object.values(this.bots);
  }

  public getBot(id: string): TelegramBotInfo | undefined {
    return this.bots[id];
  }

  public getMessageLogs(botId?: string) {
    if (botId) {
      return this.messageLogs.filter((log) => log.botId === botId);
    }
    return this.messageLogs;
  }

  public handleIncomingMessage(botId: string, text: string, user: string = '@andrik494'): { responseText: string } {
    const bot = this.bots[botId];
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    // Increment metric
    bot.metrics.messagesProcessed += 1;
    bot.metrics.lastActive = new Date().toISOString();

    const cleanText = text.trim();
    let responseText = '';

    // Simulate Command Parsing
    if (cleanText.startsWith('/')) {
      bot.metrics.commandsTriggered += 1;
      const cmd = cleanText.split(' ')[0].substring(1);

      switch (cmd) {
        case 'start':
          responseText = `Greetings, Agent. Connection to ${bot.name} verified. Launching Web App on your node. Feel free to access modules.`;
          break;
        case 'status':
          responseText = `[OS TELEMETRY] Status: OPERATIONAL | Active Nodes: 12 | Health Index: 99.8% | Signal Level: Exquisite.`;
          break;
        case 'diagnose':
          responseText = `[DIAGNOSTICS] Swarm cluster self-repair complete. Rebuild logic core loads, resolved 0 fatal pointers.`;
          break;
        case 'webapp':
          responseText = `Open Web App: https://ais-dev-rnw2hlscv3yjweadzehqkw-304368025329.europe-west2.run.app/?tgWebAppStartParam=${botId}`;
          break;
        case 'key':
          responseText = `[CAMELOT WHEEL] Recommended key shift: +1 semitone to match 8A (A minor). Standard harmony maintained.`;
          break;
        case 'playing':
          responseText = `[SEQUENCER] Step 1-4 active. BPM: 124. Synthesis type: Deep Cyber-Pulse.`;
          break;
        case 'bpm':
          responseText = `[TAP BPM] Latency average 12ms. Synced seamlessly across audio threads.`;
          break;
        case 'generate':
          responseText = `[AVATAR GENERATOR] Creating vector art. Avatar request submitted. Check the studio panel shortly.`;
          break;
        case 'contrast':
          responseText = `[ACCESSIBILITY] WCAG 2.1 Compliant. Score: AA (4.5:1 ratio on background slate).`;
          break;
        case 'palette':
          responseText = `[PALETTES] Loaded presets: Dark Mnmll Slate (#050505, #0D0D0D, #E0E0E0, #6366F1).`;
          break;
        case 'lint':
          responseText = `[LINTER] "tsc --noEmit" run successfully. 0 syntax compilation errors, 0 missing exports.`;
          break;
        case 'agents':
          responseText = `[AGENT TELEMETRY] Online Swarm: Coder, Critic, Architect, Auditor, Researcher, Planner.`;
          break;
        case 'logs':
          responseText = `[LOGS] server.ts running on port 3000... Vite dev server initialized... Database connection mock secure.`;
          break;
        case 'balance':
          responseText = `[COMPUTE LEDGER] Balance: 1,420 logic credits. Est. uptime remaining: 142 hours of Heavy GPU render.`;
          break;
        case 'invoice':
          responseText = `[INVOICE] Invoice #INV-8839 generated. Price: 10 TON (~$50). Secure checkout link sent.`;
          break;
        case 'rates':
          responseText = `[COMPUTE RATES] Light compute: 0.1 credits/min | Heavy GPU Render (Flux/Video): 2.5 credits/min.`;
          break;
        default:
          responseText = `Command /${cmd} received. Executing automated intelligence route for ${bot.name}...`;
      }
    } else {
      // Natural dialogue mock response
      responseText = `Acknowledge receiving transmission: "${cleanText}". Swarm cluster is routing this to Overlord Azrail memory context.`;
    }

    // Save Logs
    this.messageLogs.push({
      id: Math.random().toString(36).substr(2, 9),
      botId,
      direction: 'incoming',
      text,
      timestamp: new Date().toISOString(),
      user
    });

    this.messageLogs.push({
      id: Math.random().toString(36).substr(2, 9),
      botId,
      direction: 'outgoing',
      text: responseText,
      timestamp: new Date().toISOString(),
      user: 'system'
    });

    // Trim logs size to avoid memory overflow
    if (this.messageLogs.length > 200) {
      this.messageLogs.shift();
    }

    return { responseText };
  }

  public handleLaunchWebApp(botId: string): { initData: string; themeParams: any } {
    const bot = this.bots[botId];
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    bot.metrics.webAppSessions += 1;
    bot.metrics.lastActive = new Date().toISOString();

    const timestamp = Math.floor(Date.now() / 1000);
    const mockHash = 'd7f87a38b29c118e3845bfae1781289cf8b901a88b56f2bfa89aee19379201f3';

    // Telegram Web App standard initialization query string
    const initData = `query_id=AAH_p_cBAAAAAP-n9wG3_k2f&user=%7B%22id%22%3A304368025%2C%22first_name%22%3A%22Andrik%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22andrik494%22%2C%22language_code%22%3A%22en%22%7D&auth_date=${timestamp}&hash=${mockHash}&start_param=${botId}`;

    return {
      initData,
      themeParams: {
        bg_color: '#050505',
        text_color: '#e0e0e0',
        hint_color: '#6e6e6e',
        link_color: '#6366f1',
        button_color: '#6366f1',
        button_text_color: '#ffffff',
        secondary_bg_color: '#0d0d0d'
      }
    };
  }
}

export const telegramBotsManager = new TelegramBotsManager();

// Express controller handler routes
export const telegramRoutes = {
  getBots: (req: Request, res: Response) => {
    res.json({ success: true, bots: telegramBotsManager.getBots() });
  },

  getBotById: (req: Request, res: Response) => {
    const bot = telegramBotsManager.getBot(req.params.botId);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }
    res.json({ success: true, bot });
  },

  getLogs: (req: Request, res: Response) => {
    const { botId } = req.query;
    res.json({
      success: true,
      logs: telegramBotsManager.getMessageLogs(botId ? String(botId) : undefined)
    });
  },

  postMessage: (req: Request, res: Response) => {
    const { botId } = req.params;
    const { text, user } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }
    try {
      const result = telegramBotsManager.handleIncomingMessage(botId, text, user);
      res.json({ success: true, response: result.responseText, logs: telegramBotsManager.getMessageLogs(botId) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  postLaunchWebApp: (req: Request, res: Response) => {
    const { botId } = req.params;
    try {
      const result = telegramBotsManager.handleLaunchWebApp(botId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
