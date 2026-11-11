import { zipStore } from '../src/lib/zip-store';
import { blankSite, proposeSite, siteFiles, type SiteFile, type SiteStyle } from './web-site';

/** Короткий паспорт страницы, который переживает запись плана. По нему следующая фраза правит тот же сайт. */
export type ChatSiteDraft = {
  name: string;
  business: string;
  style: SiteStyle;
  chat: boolean;
  wide: boolean;
  pulse: boolean;
  violet: boolean;
  rich: boolean;
  simple: boolean;
};

const PAGE_EDIT = /шире|уже|сузь|добав|анимац|эффект|импульс|пульс|фиолет|кнопк|цвет|фон|шрифт|исправ|поменя|обнов|чат|д[её]шев|скучн|бедно|сложн|упрост/iu;
const DRAFT = /^azrail-site\t([^\t]{0,80})\t(dark|clean|premium|other)\t([01])\t([01])\t([01])\t([01])\t([01])\t([01])\t([\s\S]{0,80})$/;

export function draftFromPhrase(text: string): ChatSiteDraft {
  const source = text.replace(/\s+/g, ' ').trim();
  const named = source.match(/(?:сайт|лендинг|визитка|визитку)\s+([A-ZА-ЯЁ0-9][\wА-Яа-яЁё .-]{0,40})/u);
  const raw = /калькулятор/iu.test(source)
    ? 'Калькулятор'
    : named?.[1]?.replace(/\s+(?:в|с|и|на)(?![\p{L}])[\s\S]*$/u, '').trim() ?? '';
  const dark = /чёрн|черн|тёмн|темн|dark|noir|фиолет/iu.test(source);
  const clean = /светл|чист/iu.test(source);
  return {
    name: raw.slice(0, 80) || 'Сайт',
    business: source.slice(0, 80),
    style: dark ? 'dark' : clean ? 'clean' : 'premium',
    chat: /чат/iu.test(source),
    wide: /шире/iu.test(source),
    pulse: /импульс|пульс/iu.test(source),
    violet: /фиолет/iu.test(source) || dark,
    rich: /д[её]шев|скучн|бедно/iu.test(source),
    simple: /слишком сложн|упрост/iu.test(source),
  };
}

/** Возвращает изменённый паспорт. Незнакомая правка не считается выполненной. */
export function applySiteNote(draft: ChatSiteDraft, note: string): ChatSiteDraft | null {
  const source = note.trim();
  if (!source || !PAGE_EDIT.test(source)) return null;
  const next: ChatSiteDraft = { ...draft };
  if (/шире/iu.test(source)) next.wide = true;
  if (/сузь|чат\s+уже|сделай\s+уже/iu.test(source)) next.wide = false;
  if (/импульс|пульс/iu.test(source)) next.pulse = true;
  if (/убери\s+(?:импульс|пульс|эффект)/iu.test(source)) next.pulse = false;
  if (/чат/iu.test(source)) next.chat = true;
  if (/фиолет|чёрн|черн|тёмн|темн/iu.test(source)) {
    next.style = 'dark';
    next.violet = true;
  }
  if (/д[её]шев|скучн|бедно/iu.test(source)) {
    next.style = 'dark';
    next.violet = true;
    next.pulse = true;
    next.rich = true;
    if (next.chat) next.wide = true;
  }
  if (/слишком сложн|упрост/iu.test(source)) next.simple = true;
  const same = next.wide === draft.wide && next.pulse === draft.pulse && next.chat === draft.chat && next.style === draft.style && next.violet === draft.violet && next.rich === draft.rich && next.simple === draft.simple;
  return same ? null : next;
}

export function draftLine(draft: ChatSiteDraft): string {
  return ['azrail-site', draft.name.slice(0, 80), draft.style, bit(draft.chat), bit(draft.wide), bit(draft.pulse), bit(draft.violet), bit(draft.rich), bit(draft.simple), draft.business.slice(0, 80)].join('\t');
}

/** Чем текущая страница отличается от предыдущей. Пусто, если паспорта нет. */
export function siteDelta(before: string | undefined, after: string | undefined): string {
  const old = draftFromLine(before);
  const next = draftFromLine(after);
  if (!old || !next) return '';
  const bits: string[] = [];
  if (old.name !== next.name) bits.push(`имя «${next.name}»`);
  if (old.style !== next.style) bits.push(`стиль ${next.style}`);
  if (old.chat !== next.chat) bits.push(next.chat ? 'чат добавлен' : 'чат убран');
  if (old.wide !== next.wide) bits.push(next.wide ? 'чат стал шире' : 'чат стал уже');
  if (old.pulse !== next.pulse) bits.push(next.pulse ? 'появился импульс' : 'импульс убран');
  if (old.violet !== next.violet) bits.push(next.violet ? 'фиолетовый акцент' : 'акцент снят');
  if (old.rich !== next.rich) bits.push(next.rich ? 'вид плотнее' : 'вид проще');
  if (old.simple !== next.simple) bits.push(next.simple ? 'одна страница' : 'разделы вернулись');
  return bits.length ? `Дальше: ${bits.join(', ')}.` : 'Дальше эти переключатели не менялись.';
}

export function draftFromLine(line: string | undefined): ChatSiteDraft | null {
  const match = DRAFT.exec((line ?? '').slice(0, 200));
  if (!match) return null;
  const style = match[2] as SiteStyle;
  return {
    name: match[1] || 'Сайт',
    style,
    chat: match[3] === '1',
    wide: match[4] === '1',
    pulse: match[5] === '1',
    violet: match[6] === '1',
    rich: match[7] === '1',
    simple: match[8] === '1',
    business: match[9] || '',
  };
}

/** Настоящий ZIP собранных файлов. Секретов внутри нет: это только страница из чата. */
export function siteZip(files: SiteFile[]): Uint8Array {
  return zipStore(files.map((file) => ({ path: file.path, data: new TextEncoder().encode(file.text) })));
}

export function filesForDraft(draft: ChatSiteDraft): SiteFile[] {
  if (/калькулятор/iu.test(`${draft.name}\n${draft.business}`)) return calculatorFiles();
  const proposed = proposeSite({
    ...blankSite(),
    name: draft.name,
    business: draft.business || draft.name,
    style: draft.style,
    styleNote: draft.violet ? 'чёрный фон, фиолетовый акцент' : '',
    goal: 'image',
  });
  const themed = draft.style === 'dark' || draft.violet
    ? { ...proposed, template: 'dark' as const, palette: 'ink' as const, font: 'grotesk' as const }
    : proposed;
  const home = themed.pages.find((page) => page.file === 'index.html') ?? themed.pages[0];
  const flow = draft.simple && home ? { ...themed, pages: [{ ...home, file: 'index.html', on: true }] } : themed;
  const css = siteFiles(flow).find((file) => file.path === 'styles.css')?.text ?? '';
  return siteFiles(flow).map((file) => {
    if (file.path !== 'index.html') return file;
    const section = draft.chat ? chatSection(draft) : '';
    const rich = draft.rich ? file.text.replace('class="t-', 'class="az-rich t-') : file.text;
    const marked = draft.pulse ? rich.replace(/class="(az-rich )?t-/, 'class="az-pulse $1t-') : rich;
    const html = marked
      .replace('</head>', `<style>\n${css}\n${chatCss()}\n</style>\n</head>`)
      .replace('Собрано в Web Studio', 'Собрано в чате')
      .replace('</main>', `${section}\n</main>`);
    return { path: file.path, text: html };
  });
}

function calculatorFiles(): SiteFile[] {
  const css = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050508;color:#f4f1ea;font:16px/1.4 system-ui,sans-serif}.calc{width:min(360px,92vw);padding:20px;border:1px solid rgba(196,171,255,.35);border-radius:20px;background:rgba(255,255,255,.03)}h1{margin:0 0 12px;font-size:18px;font-weight:560}output{display:block;min-height:64px;margin-bottom:12px;padding:12px 14px;border-radius:12px;background:#0c0c12;text-align:right;font:32px/1.2 ui-monospace,monospace;overflow:auto}.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}button{min-height:52px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#14141c;color:inherit;font:18px/1 system-ui,sans-serif}button.op{color:#c4abff}button.go{background:#c4abff;color:#14081d}`;
  const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Калькулятор</title><style>${css}</style></head>
<body>
<main class="calc">
<h1>Калькулятор</h1>
<output id="screen">0</output>
<div class="keys">
<button type="button" data-key="C">C</button><button type="button" data-key="±">±</button><button type="button" data-key="%">%</button><button type="button" class="op" data-key="/">/</button>
<button type="button" data-key="7">7</button><button type="button" data-key="8">8</button><button type="button" data-key="9">9</button><button type="button" class="op" data-key="*">*</button>
<button type="button" data-key="4">4</button><button type="button" data-key="5">5</button><button type="button" data-key="6">6</button><button type="button" class="op" data-key="-">-</button>
<button type="button" data-key="1">1</button><button type="button" data-key="2">2</button><button type="button" data-key="3">3</button><button type="button" class="op" data-key="+">+</button>
<button type="button" data-key="0">0</button><button type="button" data-key=".">.</button><button type="button" class="go" data-key="=">=</button><button type="button" data-key="⌫">⌫</button>
</div>
</main>
<script>
const screen=document.getElementById('screen');
let current='0',stored=null,op=null,fresh=true;
function show(value){screen.textContent=String(value).slice(0,16);}
function apply(next){
 const a=Number(stored),b=Number(current);
 if(!Number.isFinite(a)||!Number.isFinite(b))return 'Ошибка';
 if(next==='/'&&b===0)return 'Ошибка';
 if(next==='+')return String(a+b);
 if(next==='-')return String(a-b);
 if(next==='*')return String(a*b);
 return String(a/b);
}
document.querySelector('.keys').onclick=(event)=>{
 const key=event.target instanceof HTMLElement?event.target.dataset.key:'';
 if(!key)return;
 if(key==='C'){current='0';stored=null;op=null;fresh=true;show(current);return;}
 if(key==='⌫'){current=current.length>1?current.slice(0,-1):'0';fresh=false;show(current);return;}
 if(key==='±'){current=current.startsWith('-')?current.slice(1):current==='0'?'0':'-'+current;show(current);return;}
 if(key==='%'){const n=Number(current);current=Number.isFinite(n)?String(n/100):'Ошибка';fresh=true;show(current);return;}
 if('+-*/'.includes(key)){
  if(stored!==null&&op&&!fresh)current=apply(op);
  stored=current;op=key;fresh=true;show(current);return;
 }
 if(key==='='){if(stored!==null&&op){current=apply(op);stored=null;op=null;fresh=true;show(current);}return;}
 if(key==='.'){if(fresh)current='0.';else if(!current.includes('.'))current+='.';fresh=false;show(current);return;}
 current=fresh||current==='0'?key:current+key;fresh=false;show(current);
};
</script>
</body>
</html>`;
  return [{ path: 'index.html', text: html }, { path: 'styles.css', text: css }];
}

function bit(value: boolean) {
  return value ? '1' : '0';
}

function chatSection(draft: ChatSiteDraft) {
  const wide = draft.wide ? ' wide' : '';
  const pulse = draft.pulse ? ' az-pulse' : '';
  return `<section class="block az-chat${wide}${pulse}" data-block="home:chat"><h2>Чат</h2><div class="az-thread"><p>Напишите задачу. Ответ появится здесь.</p></div><form class="az-compose" action="#"><input name="message" placeholder="Сообщение" aria-label="Сообщение"><button class="button" type="button">Отправить</button></form></section>`;
}

function chatCss() {
  return `.az-chat{max-width:640px}.az-chat.wide{max-width:960px}.az-thread{min-height:180px;margin-top:16px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--card)}.az-compose{display:flex;gap:8px;margin-top:12px}.az-compose input{flex:1;min-height:48px;padding:0 14px;border:1px solid var(--line);border-radius:12px;background:transparent;color:inherit;font:inherit}.az-pulse{animation:az-pulse 2.4s ease-out infinite}@keyframes az-pulse{0%{box-shadow:0 0 0 0 rgba(196,171,255,.55)}70%{box-shadow:0 0 0 18px rgba(196,171,255,0)}100%{box-shadow:0 0 0 0 rgba(196,171,255,0)}}body.az-rich .hero h1{font-size:clamp(64px,9vw,104px)}body.az-rich .card,body.az-rich .band{border-color:rgba(196,171,255,.45)}@media(prefers-reduced-motion:reduce){.az-pulse{animation:none}}`;
}
