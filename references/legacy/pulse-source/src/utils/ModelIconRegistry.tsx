import React from 'react';
import { Cpu, Star, Database, Bot, Zap, Image as ImageIcon, Mic, Volume2, Video, PenTool, Globe, Eye } from 'lucide-react';

function GoogleIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function OpenAIIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#10a37f' }} {...props}>
      <path d="M22.28 9.82a6 6 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 5 4.18a6 6 0 0 0-3.16 3.84 6.05 6.05 0 0 0 .55 6.94 6.07 6.07 0 0 0-.65 5.22 6 6 0 0 0 .52 4.91 6.05 6.05 0 0 0 6.51 2.9 6.07 6.07 0 0 0 10.27-2.17 6 6 0 0 0 3.16-3.84 6.05 6.05 0 0 0-.55-6.94 6.07 6.07 0 0 0 .65-5.22zm-3.66-2.58A4.32 4.32 0 0 1 20 10.9v.3l-3.32-1.92v-3.8a2.72 2.72 0 0 0-1.4-2.4 2.72 2.72 0 0 0-2.73 0l-3.3 1.93a4.34 4.34 0 0 1 5.92 1.48L18.62 7.24zM10.9 2.02a4.32 4.32 0 0 1 3.66 2.58l1.66 2.87-3.32 1.92L9.6 5.56a2.72 2.72 0 0 0-2.4 1.4 2.72 2.72 0 0 0 0 2.73l3.3 1.93A4.34 4.34 0 0 1 10.9 2.02zm-6.88 5.2a4.32 4.32 0 0 1 1.48-5.92l2.87-1.66-1.92 3.32-3.84 2.2a2.72 2.72 0 0 0-1.4 2.4 2.72 2.72 0 0 0 1.34 2.37l3.3-1.93A4.34 4.34 0 0 1 4.02 7.22zm-.5 10.18a4.32 4.32 0 0 1-2.2-4.14v-.3l3.32 1.92v3.8a2.72 2.72 0 0 0 1.4 2.4 2.72 2.72 0 0 0 2.73 0l3.3-1.93a4.34 4.34 0 0 1-5.92-1.48l-3.45-.75L3.52 17.4zM13.1 21.98a4.32 4.32 0 0 1-3.66-2.58l-1.66-2.87 3.32-1.92 3.3 3.83a2.72 2.72 0 0 0 2.4-1.4 2.72 2.72 0 0 0 0-2.73l-3.3-1.93A4.34 4.34 0 0 1 13.1 21.98zm6.88-5.2a4.32 4.32 0 0 1-1.48 5.92l-2.87 1.66 1.92-3.32 3.84-2.2a2.72 2.72 0 0 0 1.4-2.4 2.72 2.72 0 0 0-1.34-2.37l-3.3 1.93A4.34 4.34 0 0 1 19.98 16.78zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>
    </svg>
  );
}

function MetaIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0668E1' }} {...props}>
      <path d="M22.18 12.28c0-2.3-1.87-4.17-4.17-4.17-1.57 0-2.95.87-3.65 2.18l-1.2-1.98a6.38 6.38 0 0 1 4.85-2.4c3.5 0 6.37 2.86 6.37 6.37s-2.86 6.37-6.37 6.37a6.38 6.38 0 0 1-5.18-2.65l-2.8 4.67C8.54 22.38 6.42 23.5 4.18 23.5 1.88 23.5 0 21.63 0 19.33s1.87-4.17 4.17-4.17c1.57 0 2.95-.87 3.65-2.18l1.2 1.98a6.38 6.38 0 0 1-4.85 2.4c-3.5 0-6.37-2.86-6.37-6.37s2.86-6.37 6.37-6.37a6.38 6.38 0 0 1 5.18 2.65l2.8-4.67c1.48-1.7 3.6-2.83 5.84-2.83 2.3 0 4.18 1.88 4.18 4.18z"/>
    </svg>
  );
}

function MoonshotIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#8b5cf6' }} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function NVIDIAIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#76b900' }} {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H8v-4H6v4H4V8h2v4h2V8h3v8zm6 0h-2V8h2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2zm-2-2h2v-4h-2v4z"/>
    </svg>
  );
}

function MicrosoftIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00a4ef"/>
    </svg>
  );
}

function XIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ffffff' }} className="dark:text-white text-black" {...props}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

export const ModelIconRegistry = {
  getIcon: (provider: string, className = "w-4 h-4") => {
    switch (provider) {
      case 'Google': return <GoogleIcon className={className} />;
      case 'OpenAI': return <OpenAIIcon className={className} />;
      case 'Meta': return <MetaIcon className={className} />;
      case 'Anthropic': return <Star className={className} style={{ color: '#d97757', fill: 'currentColor' }} />;
      case 'Mistral AI': return <Zap className={className} style={{ color: '#f97316', fill: 'currentColor' }} />;
      case 'DeepSeek': return <Database className={className} style={{ color: '#3b82f6' }} />;
      case 'Moonshot AI': return <MoonshotIcon className={className} />;
      case 'Qwen': return <Bot className={className} style={{ color: '#6366f1' }} />;
      case 'Black Forest Labs': return <ImageIcon className={className} style={{ color: '#10b981' }} />;
      case 'Deepgram': return <Mic className={className} style={{ color: '#f43f5e' }} />;
      case 'xAI': return <XIcon className={className} />;
      case 'Cohere': return <Database className={className} style={{ color: '#39594d' }} />;
      case 'Zhipu AI': return <Bot className={className} style={{ color: '#3b82f6' }} />;
      case 'NVIDIA': return <NVIDIAIcon className={className} />;
      case 'Stability AI': return <ImageIcon className={className} style={{ color: '#8b5cf6' }} />;
      case 'Microsoft': return <MicrosoftIcon className={className} />;
      case 'ElevenLabs': return <Volume2 className={className} style={{ color: '#f59e0b' }} />;
      case 'RunwayML': return <Video className={className} style={{ color: '#ec4899' }} />;
      case 'Leonardo': return <ImageIcon className={className} style={{ color: '#6366f1' }} />;
      case 'Recraft': return <PenTool className={className} style={{ color: '#10b981' }} />;
      case 'MiniMax': return <Bot className={className} style={{ color: '#f97316' }} />;
      case 'ByteDance': return <Zap className={className} style={{ color: '#3b82f6' }} />;
      case 'Pruna AI': return <Cpu className={className} style={{ color: '#10b981' }} />;
      case 'Alibaba': return <Bot className={className} style={{ color: '#ff5a5f' }} />;
      case 'Zai': return <Bot className={className} style={{ color: '#3b82f6' }} />;
      case 'aisingapore': return <Globe className={className} style={{ color: '#3b82f6' }} />;
      case 'meta-llama': return <MetaIcon className={className} />;
      case 'lykon': return <ImageIcon className={className} style={{ color: '#8b5cf6' }} />;
      case 'Mistral': return <Zap className={className} style={{ color: '#f97316' }} />;
      case 'MyShell AI': return <Volume2 className={className} style={{ color: '#f59e0b' }} />;
      case 'Pipecat AI': return <Mic className={className} style={{ color: '#f43f5e' }} />;
      case 'Hugging Face': return <Bot className={className} style={{ color: '#ffcc00' }} />;
      case 'ai4bharat': return <Globe className={className} style={{ color: '#10b981' }} />;
      case 'BAAI': return <Database className={className} style={{ color: '#3b82f6' }} />;
      case 'llava-hf': return <Eye className={className} style={{ color: '#8b5cf6' }} />;
      default: return <Cpu className={className} />;
    }
  }
};
