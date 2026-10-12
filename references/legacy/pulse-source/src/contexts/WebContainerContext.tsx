import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
export interface WebContainerContextType {
  fs: Record<string, string>; setFs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  installedPackages: Record<string, string>; isDevServerRunning: boolean;
  startDevServer: (write: (text: string) => void) => void; stopDevServer: () => void;
  installPackage: (name: string, write: (text: string) => void) => Promise<void>;
  runCommand: (command: string, write: (text: string) => void) => Promise<void>;
  terminalLogs: string[]; clearTerminalLogs: () => void;
}
const Context = createContext<WebContainerContextType | undefined>(undefined);
const defaultFiles = {
  'package.json': JSON.stringify({ name: 'pulse-draft', private: true, dependencies: {} }, null, 2),
  'src/App.tsx': 'export default function App() { return <main>Твоя следующая идея</main>; }',
  'src/index.css': 'body { background: #0b0a10; color: #eee; }',
};
export function WebContainerProvider({ children }: { children: React.ReactNode }) {
  const [fs, setFs] = useState<Record<string, string>>(() => {
    try { const saved = JSON.parse(localStorage.getItem('pulse_webcontainer_fs') || 'null'); return saved && typeof saved === 'object' && !Array.isArray(saved) && Object.values(saved).every(v => typeof v === 'string') ? saved : defaultFiles; }
    catch { return defaultFiles; }
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  useEffect(() => { try { localStorage.setItem('pulse_webcontainer_fs', JSON.stringify(fs)); } catch { toast.error('В браузере недостаточно места. Экспортируйте проект.'); } }, [fs]);
  const addLog = useCallback((line: string) => setTerminalLogs(prev => [...prev.slice(-199), line]), []);
  const unavailable = (write: (text: string) => void) => {
    const message = 'Исполнитель Node.js не подключён. Доступны редактирование файлов, экспорт и изолированный HTML-предпросмотр. Команда не выполнялась.';
    write(`\r\n${message}\r\n`); addLog(message);
  };
  const runCommand = async (command: string, write: (text: string) => void) => {
    const [name, file] = command.trim().split(/\s+/); addLog(`> ${command}`);
    if (name === 'ls' || name === 'dir') write('\r\n' + Object.keys(fs).filter(p => !file || p.startsWith(file)).join('\r\n') + '\r\n');
    else if (name === 'cat') write(`\r\n${Object.hasOwn(fs, file) ? fs[file] : 'Файл не найден'}\r\n`);
    else if (name === 'clear') setTerminalLogs([]);
    else if (name === 'help') write('\r\nls, cat <путь>, clear. Это редактор черновиков, не системная оболочка.\r\n');
    else unavailable(write);
  };
  return <Context.Provider value={{ fs, setFs, installedPackages: {}, isDevServerRunning: false, startDevServer: unavailable, stopDevServer: () => {}, installPackage: async (_name, write) => unavailable(write), runCommand, terminalLogs, clearTerminalLogs: () => setTerminalLogs([]) }}>{children}</Context.Provider>;
}
export function useWebContainer() { const context = useContext(Context); if (!context) throw Error('WebContainerProvider missing'); return context; }
