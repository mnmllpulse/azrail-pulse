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
  const raw = named?.[1]?.replace(/\s+(?:в|с|и|на)(?![\p{L}])[\s\S]*$/u, '').trim() ?? '';
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
