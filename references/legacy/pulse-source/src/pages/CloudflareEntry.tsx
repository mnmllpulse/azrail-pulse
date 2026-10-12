import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, AudioLines, Layers3, FlaskConical, KeyRound, LoaderCircle } from 'lucide-react';
import { DOMAINS, domainProfile } from '../../shared/platform';
import { useSession } from '../contexts/SessionContext';
import '../styles/cloudflare-entry.css';

export default function CloudflareEntry() {
  const session = useSession(), navigate = useNavigate(), location = useLocation();
  const [key, setKey] = useState(''), [open, setOpen] = useState(location.pathname === '/auth'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [open]);
  const host = window.location.hostname, profile = domainProfile(host);
  const proposed = location.state?.next;
  const next = typeof proposed === 'string' && proposed.startsWith('/') && !proposed.startsWith('//') ? proposed : profile.home;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await session.signIn(key); setKey(''); navigate(next, { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось войти.'); }
    finally { setBusy(false); }
  };
  const title = profile.role === 'lab' ? <>Идеи, которым<br /><em>нужен эксперимент.</em></> : profile.role === 'knowledge' ? <>Понимать глубже.<br /><em>Создавать свободнее.</em></> : <>Твоя следующая идея.<br /><em>Уже ближе.</em></>;
  const description = profile.role === 'lab' ? 'Лаборатория моделей, кода и творческих гипотез. Пространство для поиска собственного решения.' : profile.role === 'knowledge' ? 'Архитектура, материалы и знания экосистемы. Всё, что помогает видеть за пределами одного проекта.' : 'Музыка, дизайн, код и интеллект в одном пространстве. Выбери направление и начни с простого запроса.';
  return <main className="pulse-entry">
    <header className="pulse-entry-header"><a className="pulse-wordmark" href="/" aria-label="MNMLL PULSE — главная"><span className="pulse-brand-dot" />MNMLL<span>PULSE</span></a><span className="pulse-entry-label">{profile.role === 'lab' ? 'LABS / EXPERIMENTS' : profile.role === 'knowledge' ? 'KNOWLEDGE / CULTURE' : 'CREATIVE OPERATING SYSTEM'}</span><a href={session.user ? profile.home : '#access'} onClick={e => { if (!session.user) { e.preventDefault(); setOpen(true); } }}>Войти <ArrowUpRight size={16} /></a></header>
    <section className="pulse-hero" aria-labelledby="pulse-title">
      <div className="pulse-orbit" aria-hidden="true"><div /><i /><span /></div>
      <div className="pulse-hero-copy"><p className="pulse-eyebrow">INTELLIGENCE THAT MOVES THE PLANET</p><h1 id="pulse-title">{title}</h1><p className="pulse-description">{description}</p><button className="pulse-primary-button" onClick={() => session.user ? navigate(profile.home) : setOpen(true)}>{profile.label} <ArrowRight size={18} /></button><span className="pulse-owner-note">Личное рабочее пространство · доступ владельца</span></div>
    </section>
    <nav className="pulse-worlds" aria-label="Пространства экосистемы">
      {Object.entries(DOMAINS).map(([domain, info], i) => { const Icon = [AudioLines, Layers3, FlaskConical][i]; return <a key={domain} href={domain === host ? info.home : `https://${domain}`} className={domain === host ? 'is-current' : ''}><div><Icon size={20} /><span>0{i + 1}</span></div><h2>{['Создание', 'Знания', 'Лаборатория'][i]}</h2><p>{['Студии музыки, изображений и кода', 'Архитектура, идеи и системная книга', 'Модели, исследования и эксперименты'][i]}</p><footer>{domain}<ArrowUpRight size={17} /></footer></a>; })}
    </nav>
    <footer className="pulse-entry-footer"><span>DARK MNMLL PULSE OS</span><span>Одна экосистема. Три пространства.</span><span>2026</span></footer>
    {open && <dialog ref={dialogRef} className="pulse-access-overlay" aria-labelledby="access-title" onCancel={e => { e.preventDefault(); if (!busy) setOpen(false); }} onClick={e => { if (e.target === e.currentTarget && !busy) setOpen(false); }}><section className="pulse-access"><button className="pulse-access-close" aria-label="Закрыть вход" disabled={busy} onClick={() => setOpen(false)}>×</button><KeyRound size={26} /><h2 id="access-title">Твоё пространство</h2><p>Введи ключ владельца, заданный при запуске системы.</p><form onSubmit={submit}><label htmlFor="owner-key">Ключ доступа</label><input id="owner-key" type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="current-password" autoFocus required maxLength={512} disabled={busy} /><button className="pulse-primary-button" disabled={busy || !key}>{busy ? <LoaderCircle size={19} className="animate-spin" /> : <>Продолжить <ArrowRight size={17} /></>}</button></form>{(error || session.error) && <p role="alert" className="pulse-access-error">{error || session.error}</p>}<p className="pulse-access-hint">На каждом домене вход выполняется отдельно.</p></section></dialog>}
  </main>;
}
