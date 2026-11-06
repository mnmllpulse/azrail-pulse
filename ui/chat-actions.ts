export type MessageActionHandlers = {
  onCopy?: (text: string) => void;
  onShare?: (text: string) => void;
  onSpeak?: (text: string) => void;
  onMore?: (text: string, anchor: HTMLElement) => void;
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

const ICONS = {
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  speak: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v4h3l5 4V6L7 10H4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8.4 13.2 15.6 17.3M15.6 6.7 8.4 10.8" stroke="currentColor" stroke-width="1.6"/></svg>',
  more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/></svg>',
};

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

async function speakFromWorker(text: string, turn: number): Promise<boolean> {
  const cached = heard.get(text);
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
    body: JSON.stringify({ text }),
  });
  if (!response.ok || turn !== speakTurn) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  remember(text, buffer);
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

function speakLocal(text: string) {
  if (typeof speechSynthesis === 'undefined') return;
  const utter = new SpeechSynthesisUtterance(text.slice(0, 2000));
  utter.lang = /[а-яё]/i.test(text) ? 'ru-RU' : 'en-US';
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
  const turn = ++speakTurn;
  void speakFromWorker(slice, turn).then((played) => {
    if (turn !== speakTurn || played) return;
    speakLocal(slice);
  }).catch(() => {
    if (turn === speakTurn) speakLocal(slice);
  });
}

export function appendAssistantActions(
  item: HTMLElement,
  content: string,
  handlers: MessageActionHandlers = {},
): void {
  if (!content.trim()) return;
  const doc = item.ownerDocument;
  const bar = doc.createElement('div');
  bar.className = 'message-actions';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Действия с ответом');

  const copy = iconButton(doc, 'Копировать', 'Копировать ответ', ICONS.copy);
  copy.onclick = async () => {
    const ok = await copyText(content);
    handlers.onCopy?.(content);
    copy.classList.toggle('is-done', ok);
    window.setTimeout(() => copy.classList.remove('is-done'), 1200);
  };

  const speak = iconButton(doc, 'Озвучить', 'Озвучить ответ', ICONS.speak);
  speak.onclick = () => {
    speakText(content);
    handlers.onSpeak?.(content);
  };

  const share = iconButton(doc, 'Поделиться', 'Поделиться ответом', ICONS.share);
  share.onclick = async () => {
    await shareText(content);
    handlers.onShare?.(content);
  };

  const more = iconButton(doc, 'Ещё', 'Дополнительные действия', ICONS.more);
  more.onclick = () => handlers.onMore?.(content, more);

  bar.append(copy, speak, share, more);
  item.append(bar);
}
