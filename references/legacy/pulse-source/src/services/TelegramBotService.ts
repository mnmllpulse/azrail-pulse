export interface TelegramBot {
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

export interface TelegramBotLog {
  id: string;
  botId: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
  user: string;
}

export class TelegramBotService {
  /**
   * Fetch all registered specialized bots
   */
  async getBots(): Promise<TelegramBot[]> {
    try {
      const response = await fetch('/api/telegram-bots');
      const data = await response.json();
      if (data.success) {
        return data.bots;
      }
      throw new Error(data.error || 'Failed to fetch bots');
    } catch (error) {
      console.error('Error fetching bots:', error);
      // Fallback in case of server restart delays
      return []; // Do not turn connection failures into simulated online bots.
    }
  }

  /**
   * Fetch message history logs for a specific bot or all bots
   */
  async getLogs(botId?: string): Promise<TelegramBotLog[]> {
    try {
      const url = botId ? `/api/telegram-bots/logs?botId=${botId}` : '/api/telegram-bots/logs';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        return data.logs;
      }
      throw new Error(data.error || 'Failed to fetch logs');
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  /**
   * Send a simulated incoming message/command to a bot
   */
  async sendMessage(botId: string, text: string, user: string = '@andrik494'): Promise<{ response: string; logs: TelegramBotLog[] }> {
    const response = await fetch(`/api/telegram-bots/${botId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, user }),
    });
    const data = await response.json();
    if (data.success) {
      return {
        response: data.response,
        logs: data.logs
      };
    }
    throw new Error(data.error || 'Failed to send message');
  }

  /**
   * Request Telegram Web App (TWA) initialization data for launching sandbox
   */
  async launchWebApp(botId: string): Promise<{ initData: string; themeParams: any }> {
    const response = await fetch(`/api/telegram-bots/${botId}/launch`, {
      method: 'POST',
    });
    const data = await response.json();
    if (data.success) {
      return {
        initData: data.initData,
        themeParams: data.themeParams
      };
    }
    throw new Error(data.error || 'Failed to launch webapp');
  }

  /**
   * Simple client fallback array in case server connection takes a second to establish
   */
  getFallbackBots(): TelegramBot[] {
    return [
      {
        id: 'bot-video',
        name: 'Video Master',
        username: 'mnmllpulse_motion_bot',
        status: 'ONLINE',
        description: 'Generates cinematic video sequences from text prompts.',
        capabilities: ['Video Synthesis', 'Motion Control'],
        metrics: { messagesProcessed: 100, webAppSessions: 10, commandsTriggered: 20, lastActive: new Date().toISOString() },
        commands: [{ command: 'start', description: 'Start video generation' }]
      },
      {
        id: 'bot-image',
        name: 'Image Artisan',
        username: 'mnmllpulse_image_bot',
        status: 'ONLINE',
        description: 'Creates high-quality images and vector art.',
        capabilities: ['Image Generation', 'Style Transfer'],
        metrics: { messagesProcessed: 150, webAppSessions: 15, commandsTriggered: 30, lastActive: new Date().toISOString() },
        commands: [{ command: 'start', description: 'Start image generation' }]
      },
      {
        id: 'bot-text',
        name: 'Text Architect',
        username: 'mnmlltext_bot',
        status: 'OFFLINE',
        description: 'Drafts long-form content, articles, and code.',
        capabilities: ['Natural Language', 'Summarization'],
        metrics: { messagesProcessed: 200, webAppSessions: 20, commandsTriggered: 40, lastActive: new Date().toISOString() },
        commands: [{ command: 'start', description: 'Start text drafting' }]
      },
      {
        id: 'bot-music',
        name: 'Sound Weaver',
        username: 'MNMLL_SOUND_BOT',
        status: 'ONLINE',
        description: 'Composes ambient music and audio soundscapes.',
        capabilities: ['Audio Synthesis', 'BPM Alignment'],
        metrics: { messagesProcessed: 50, webAppSessions: 5, commandsTriggered: 10, lastActive: new Date().toISOString() },
        commands: [{ command: 'start', description: 'Start composition' }]
      },
      {
        id: 'bot-prompt',
        name: 'Prompt Sage',
        username: 'mnmllpromter_bot',
        status: 'ONLINE',
        description: 'Optimizes and creates detailed AI prompts.',
        capabilities: ['Prompt Engineering', 'Context Expansion'],
        metrics: { messagesProcessed: 300, webAppSessions: 30, commandsTriggered: 60, lastActive: new Date().toISOString() },
        commands: [{ command: 'start', description: 'Start prompt creation' }]
      }
    ];
  }
}

export const telegramService = new TelegramBotService();
