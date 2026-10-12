import { useEffect, useState } from 'react';
import { DOMAINS } from '../../../shared/platform';
export default function DeployStudioPanel({ isLight }: { isLight: boolean }) {
  const [status, setStatus] = useState<{configured: boolean; version: string} | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let active = true; fetch('/api/deploy/status').then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error); if (active) setStatus(data); }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, []);
  const deploy = async () => {
    if (!window.confirm('Запустить сборку подключённой production-ветки в Cloudflare?')) return;
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'deploy' }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); setMessage(data.message); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Не удалось запустить сборку.'); }
    finally { setBusy(false); }
  };
  return <section className={`p-6 border rounded-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-950/60 border-white/10 text-zinc-200'}`}><p className="text-xs text-violet-400 mb-3">CLOUDFLARE WORKERS</p><h2 className="text-2xl mb-4">Один проект. Три домена.</h2><p className="text-sm text-zinc-500 leading-7">Основной способ обновления — коммит в подключённую ветку GitHub. Cloudflare проверяет сборку, применяет миграции D1 и публикует Worker. Статус и ошибки доступны в панели Cloudflare.</p><ul className="my-6 space-y-3">{Object.entries(DOMAINS).map(([host, profile]) => <li key={host}><a href={`https://${host}`} className="text-violet-400" target="_blank" rel="noopener noreferrer">{host}</a><span className="ml-4 text-sm text-zinc-500">{profile.label}</span></li>)}</ul><p className="text-xs text-zinc-500">Версия приложения: {status?.version || 'проверяется'}. Наличие домена в списке не подтверждает настройку DNS.</p><button disabled={busy || !status?.configured} onClick={deploy} className="mt-6 rounded-xl px-5 py-3 bg-violet-500 text-white disabled:opacity-40">{busy ? 'Отправляем запрос…' : 'Запустить сборку'}</button>{status && !status.configured && <p className="text-xs text-zinc-500 mt-3">Для кнопки требуется Deploy Hook. Автодеплой из GitHub работает независимо от этой кнопки.</p>}{message && <p role="status" className="mt-4 text-sm text-violet-300">{message}</p>}</section>;
}
