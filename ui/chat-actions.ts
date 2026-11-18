import { icon } from './icons';

export type MessageActionHandlers = {
  onCopy?: (text: string) => void;
  onSpeak?: (text: string) => void;
  onEdit?: (text: string) => void;
  onSave?: (text: string, role: 'user' | 'assistant') => void | Promise<void>;
  onBranch?: (turnIndex: number) => void;
  assistantLabel?: string;
};

function iconButton(doc: Document, label: string, title: string, svg: string): HTMLButtonElement {
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'message-action';
  btn.title = title;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = svg;
  return btn;
}

const ICONS = { copy: icon('copy'), check: icon('check'), speak: icon('speak'), edit: icon('edit'), branch: icon('branch'), save: icon('save') };

type SpokenVoice = 'shade' | 'lumen' | 'aria';
const LOCAL_VOICE: Record<SpokenVoice, { pitch: number; rate: number; match: RegExp }> = {
  shade: { pitch: 0.7, rate: 0.84, match: /pavel|dmitry|dmitri|male|муж/i },
  lumen: { pitch: 1.14, rate: 1.08, match: /pavel|dmitry|dmitri/i },
  aria: { pitch: 1.32, rate: 0.94, match: /irina|elena|zira|female|жен|aria/i },
};

function selectedVoice(): SpokenVoice {
  try {
    const saved = sessionStorage.getItem('pulse.voice');
    if (saved === 'lumen' || saved === 'shade' || saved === 'aria') return saved;
  } catch { /* default shade */ }
  return 'shade';
}

function chooseSystemVoice(voice: SpokenVoice, list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const russian = list.filter((item) => item.lang.toLowerCase().startsWith('ru'));
  const pool = russian.length ? russian : list;
  const wanted = pool.find((item) => LOCAL_VOICE[voice].match.test(`${item.name} ${item.voiceURI}`));
  if (wanted) return wanted;
  if (voice === 'aria') return pool.at(-1) ?? null;
  if (voice === 'lumen') return pool[Math.min(1, Math.max(pool.length - 1, 0))] ?? null;
  return pool[0] ?? null;
}

function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve([]);
  const current = speechSynthesis.getVoices();
  if (current.length) return Promise.resolve(current);
  return new Promise((resolve) => {
    const finish = () => resolve(speechSynthesis.getVoices());
    const timer = window.setTimeout(finish, 350);
    speechSynthesis.addEventListener('voiceschanged', () => {
      window.clearTimeout(timer);
      finish();
    }, { once: true });
  });
}

let speaking: SpeechSynthesisUtterance | null = null;
let stopLive: (() => void) | null = null;
let speakTurn = 0;
const heard = new Map<string, AudioBuffer>();
let audioCtx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

function remember(text: string, buffer: AudioBuffer) {
  heard.set(text, buffer);
  if (heard.size > 12) {
    const oldest = heard.keys().next().value;
    if (oldest) heard.delete(oldest);
  }
}

function playBuffer(buffer: AudioBuffer, turn: number) {
  const ctx = audioContext();
  if (!ctx || turn !== speakTurn) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  stopLive = () => {
    try { source.stop(); } catch { /* already ended */ }
  };
  source.onended = () => {
    if (stopLive) stopLive = null;
  };
  source.start(0);
}

async function speakFromWorker(text: string, voice: SpokenVoice, turn: number): Promise<boolean> {
  const cacheKey = `${voice}\n${text}`;
  const cached = heard.get(cacheKey);
  if (cached) {
    playBuffer(cached, turn);
    return true;
  }
  const headers = new Headers({ 'Content-Type': 'application/json' });
  try {
    const token = sessionStorage.getItem('pulse.token');
    if (token) headers.set('Authorization', 'Bearer ' + token);
  } catch { /* private mode keeps the cookie session */ }
  const response = await fetch('/api/tts', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify({ text, voice }),
  });
  if (!response.ok || turn !== speakTurn) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  remember(cacheKey, buffer);
  playBuffer(buffer, turn);
  return true;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(text: string, title = 'AZRAIL'): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
  } catch {
    /* user cancelled or unsupported */
  }
  return copyText(text);
}

async function speakLocal(text: string, voice: SpokenVoice, turn: number) {
  if (typeof speechSynthesis === 'undefined' || turn !== speakTurn) return;
  const list = await voicesReady();
  if (turn !== speakTurn) return;
  const utter = new SpeechSynthesisUtterance(text);
  const profile = LOCAL_VOICE[voice];
  const picked = chooseSystemVoice(voice, list);
  if (picked) utter.voice = picked;
  utter.lang = picked?.lang || 'ru-RU';
  utter.pitch = profile.pitch;
  utter.rate = profile.rate;
  speaking = utter;
  utter.onend = () => { speaking = null; };
  utter.onerror = () => { speaking = null; };
  speechSynthesis.speak(utter);
}

export function speakText(text: string): void {
  if (stopLive || speaking) {
    stopLive?.();
    stopLive = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    speaking = null;
    speakTurn += 1;
    return;
  }
  const slice = text.trim().slice(0, 2000);
  if (!slice) return;
  const voice = selectedVoice();
  const turn = ++speakTurn;
  void speakFromWorker(slice, voice, turn).then((played) => {
    if (turn !== speakTurn || played) return;
    return speakLocal(slice, voice, turn);
  }).catch(() => {
    if (turn === speakTurn) return speakLocal(slice, voice, turn);
  });
}

function copyButton(doc: Document, content: string, title: string, handlers: MessageActionHandlers): HTMLButtonElement {
  const copy = iconButton(doc, 'Копировать', title, ICONS.copy);
  copy.onclick = async () => {
    const ok = await copyText(content);
    handlers.onCopy?.(content);
    if (!ok) return;
    copy.classList.add('is-done');
    copy.innerHTML = ICONS.check;
    window.setTimeout(() => {
      copy.classList.remove('is-done');
      copy.innerHTML = ICONS.copy;
    }, 1400);
  };
  return copy;
}

function saveButton(doc: Document, content: string, role: 'user' | 'assistant', handlers: MessageActionHandlers): HTMLButtonElement {
  const save = iconButton(doc, 'Сохранить', role === 'user' ? 'Сохранить запрос в память' : 'Сохранить ответ в память', ICONS.save);
  save.onclick = async () => {
    save.disabled = true;
    try {
      await handlers.onSave?.(content, role);
    } finally {
      save.disabled = false;
    }
  };
  return save;
}

function toolbar(doc: Document, label: string): HTMLDivElement {
  const bar = doc.createElement('div');
  bar.className = 'message-actions';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', label);
  return bar;
}

export function appendAssistantActions(
  item: HTMLElement,
  content: string,
  handlers: MessageActionHandlers = {},
  turnIndex = -1,
): void {
  if (!content.trim()) return;
  const doc = item.ownerDocument;
  const bar = toolbar(doc, 'Действия с ответом');
  const speak = iconButton(doc, 'Слушать', 'Озвучить ответ', ICONS.speak);
  speak.onclick = () => {
    speakText(content);
    handlers.onSpeak?.(content);
  };
  bar.append(copyButton(doc, content, 'Копировать ответ', handlers), speak);
  if (turnIndex >= 0) {
    const branch = iconButton(doc, 'Создать ветвь в новом чате', 'Создать ветвь в новом чате', ICONS.branch);
    branch.onclick = () => handlers.onBranch?.(turnIndex);
    bar.append(branch);
  }
  bar.append(saveButton(doc, content, 'assistant', handlers));
  item.append(bar);
}

export function appendUserActions(
  item: HTMLElement,
  content: string,
  handlers: MessageActionHandlers = {},
): void {
  if (!content.trim()) return;
  const doc = item.ownerDocument;
  const bar = toolbar(doc, 'Действия с запросом');
  const edit = iconButton(doc, 'Редактировать', 'Изменить запрос и отправить заново', ICONS.edit);
  edit.onclick = () => handlers.onEdit?.(content);
  bar.append(edit, copyButton(doc, content, 'Копировать запрос', handlers), saveButton(doc, content, 'user', handlers));
  item.append(bar);
}
