import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
interface User { id: string; role: 'owner' }
interface Session {
  user: User | null; loading: boolean; error: string;
  refresh: () => Promise<void>; signIn: (key: string) => Promise<void>; signOut: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
async function api(path: string, data?: unknown) {
  const response = await fetch(path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Сервис временно недоступен.');
  return result;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const refresh = async () => {
    setLoading(true); setError('');
    try { setUser((await api('/api/auth/session')).user); }
    catch (e) { setError(e instanceof Error ? e.message : 'Нет связи с сервером.'); setUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const signIn = async (key: string) => { const result = await api('/api/auth/login', { key }); setUser(result.user); setError(''); };
  const signOut = async () => { await api('/api/auth/logout', {}); setUser(null); };
  return <Context.Provider value={{ user, loading, error, refresh, signIn, signOut }}>{children}</Context.Provider>;
}
export function useSession() { const session = useContext(Context); if (!session) throw Error('SessionProvider missing'); return session; }
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession(), location = useLocation();
  if (session.loading) return <div className="pulse-loading" role="status">Проверяем вход…</div>;
  if (!session.user) return <Navigate to="/auth" replace state={{ next: location.pathname + location.search }} />;
  return children;
}
