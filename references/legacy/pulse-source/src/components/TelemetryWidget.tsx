import { useCallback, useEffect, useState } from 'react';
import { Activity, LoaderCircle } from 'lucide-react';

interface Stat { model: string; count: number; errors: number; durationMs: number | null }
interface ModelState { model: string; status: 'active' | 'suspended' }
export default function TelemetryWidget() {
  const [stats,setStats]=useState<Stat[]>([]),[states,setStates]=useState<ModelState[]>([]);
  const [error,setError]=useState(''),[updated,setUpdated]=useState('');
  const [prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false);
  const [artifact,setArtifact]=useState<{result:string;url:string}|null>(null);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    try {
      const responses=await Promise.all([fetch('/api/telemetry',{signal}),fetch('/api/circuit-breaker',{signal})]);
      const [telemetry,models]=await Promise.all(responses.map(r=>r.json()));
      if(!responses[0].ok || !responses[1].ok)throw new Error(telemetry.error || models.error || 'Нет связи с сервером.');
      setStats(telemetry.stats);setStates(models.states);setUpdated(new Date().toLocaleTimeString());setError('');
    }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Не удалось обновить журнал.');}
  },[]);
  useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);const timer=setInterval(()=>void refresh(controller.signal),15000);return()=>{clearInterval(timer);controller.abort();};},[refresh]);
  const synthesize=async()=>{
    if(busy || !prompt.trim())return;setBusy(true);setError('');setArtifact(null);
    try {
      const response=await fetch('/api/metatron/swarm/synthesis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      const result=await response.json();if(!response.ok)throw new Error(result.error || 'Запрос не выполнен.');
      setArtifact(result.artifact);await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Ошибка запроса.');}finally{setBusy(false);}
  };
  const requests=stats.reduce((n,s)=>n+s.count,0),failures=stats.reduce((n,s)=>n+s.errors,0);
  return <section className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-zinc-200 space-y-5" aria-label="Журнал генераций">
    <header className="flex items-center gap-3"><Activity size={19} className="text-violet-400"/><div><h2 className="text-sm font-medium">Журнал генераций</h2><p className="text-xs text-zinc-500">Последние 24 часа · {updated ? `обновлено ${updated}` : 'загрузка'}</p></div></header>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="grid grid-cols-3 gap-3 text-sm"><div>Попытки<strong className="block text-xl">{requests}</strong></div><div>Ошибки<strong className="block text-xl">{failures}</strong></div><div>Приостановлено<strong className="block text-xl">{states.filter(s=>s.status==='suspended').length}</strong></div></div>
    <p className="text-xs text-zinc-500">Токены и стоимость провайдера пока не учитываются. Лимиты находятся в настройках маршрутизации.</p>
    <ul className="space-y-2">{stats.map(s=><li key={s.model} className="border-t border-white/5 pt-2 text-xs"><span className="break-all">{s.model}</span><span className="block text-zinc-500">{s.count} попыток · {s.errors} ошибок · {s.durationMs===null?'длительность неизвестна':`${Math.round(s.durationMs)} мс в среднем`}</span></li>)}</ul>
    {updated && !stats.length && <p className="text-sm text-zinc-500">За последние сутки генераций ещё не было.</p>}
    <div className="border-t border-white/10 pt-4"><label htmlFor="telemetry-synthesis" className="text-sm">Текстовый синтез</label><textarea id="telemetry-synthesis" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={16000} disabled={busy} placeholder="Какую задачу разобрать?" className="mt-2 w-full rounded-xl border border-white/10 bg-black p-3 text-sm"/><p className="text-xs text-zinc-500">Подготовит ответ и сохранит артефакт. Код и деплой не запускаются.</p><button onClick={synthesize} disabled={busy || !prompt.trim()} className="mt-3 rounded-lg bg-violet-500/20 px-4 py-2 text-violet-200 disabled:opacity-50">{busy?<LoaderCircle size={18} className="animate-spin"/>:'Подготовить результат'}</button></div>
    {artifact && <div className="space-y-3"><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black p-3 text-xs">{artifact.result}</pre><a className="text-sm text-violet-300 underline" href={artifact.url}>Скачать артефакт JSON</a></div>}
  </section>;
}
