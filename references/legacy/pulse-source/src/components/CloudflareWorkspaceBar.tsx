import { useState } from 'react';
import { DOMAINS } from '../../shared/platform';
import { useSession } from '../contexts/SessionContext';
export function CloudflareWorkspaceBar() {
  const session = useSession(); const [error, setError] = useState('');
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><nav className="pulse-site-links" aria-label="Домены проекта">{Object.entries(DOMAINS).map(([host, info]) => <a key={host} href={`https://${host}`} aria-current={host === location.hostname ? 'page' : undefined}>{info.label}</a>)}<button onClick={async () => { try { await session.signOut(); } catch { setError('Не удалось завершить сессию. Повторите.'); } }}>Выйти</button></nav>{error && <span role="alert" className="text-xs text-red-300">{error}</span>}</div>;
}
