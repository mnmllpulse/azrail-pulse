import { openHeld } from './zip-site';

const STORAGE_KEY='pulse.home-code';
const STARTER=`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Экран</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#09090f;color:#f4f2f8;font:16px/1.5 system-ui}
  main{text-align:center;padding:32px}
  h1{margin:0 0 8px;font-weight:500;letter-spacing:-.04em}
  p{margin:0;color:#afa5ba}
</style>
</head>
<body>
<main>
  <h1>Живой экран</h1>
  <p>Это HTML. Правь код и переключайся на «Экран».</p>
</main>
</body>
</html>
`;

function looksLikeHtml(source:string){
 return /<!doctype|<html|<body|<div|<section|<style|<h1|<p[\s>]|<main/i.test(source);
}

function previewParts(source:string){
 const code=source.trim()||STARTER;
 const html=looksLikeHtml(code)?code:`<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>body{margin:0;background:#09090f;color:#f4f2f8;font:14px/1.6 ui-monospace,monospace}pre{margin:0;padding:20px;white-space:pre-wrap}</style></head><body><pre>${code.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]!))}</pre></body></html>`;
 const css:string[]=[];
 const body=html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,(_,block:string)=>{css.push(block);return '';});
 return {html:body,css:css.join('\n')};
}

export function mountHomeCanvas(){
 const code=document.querySelector<HTMLTextAreaElement>('#home-code');
 const screen=document.querySelector<HTMLIFrameElement>('#home-screen');
 const kind=document.querySelector<HTMLElement>('#home-canvas-kind');
 const codeTab=document.querySelector<HTMLButtonElement>('#home-mode-code');
 const screenTab=document.querySelector<HTMLButtonElement>('#home-mode-screen');
 const fileLabel=document.querySelector<HTMLElement>('#home-files-label');
 const filePick=document.querySelector<HTMLSelectElement>('#home-files');
 if(!code||!screen||!kind||!codeTab||!screenTab)return;
 let saved='';
 try{saved=localStorage.getItem(STORAGE_KEY)??'';}catch{saved='';}
 code.value=saved.trim()?saved:STARTER;
 const paint=()=>{
  kind.textContent=looksLikeHtml(code.value)?'HTML':'Текст';
  if(screen.hidden)return;
  const parts=previewParts(code.value);
  const sheet=`data:text/css;charset=utf-8,${encodeURIComponent(parts.css)}`;
  const linked=parts.html.includes('</head>')?parts.html.replace('</head>',`<link rel="stylesheet" href="${sheet}"></head>`):`<link rel="stylesheet" href="${sheet}">${parts.html}`;
  screen.removeAttribute('src');
  screen.srcdoc=linked;
 };
 const show=(mode:'code'|'screen')=>{
  const preview=mode==='screen';
  code.hidden=preview;
  screen.hidden=!preview;
  codeTab.setAttribute('aria-selected',String(!preview));
  screenTab.setAttribute('aria-selected',String(preview));
  codeTab.classList.toggle('active',!preview);
  screenTab.classList.toggle('active',preview);
  paint();
 };
 code.addEventListener('input',()=>{
  try{localStorage.setItem(STORAGE_KEY,code.value);}catch{/* private mode */}
  paint();
 });
 codeTab.addEventListener('click',()=>show('code'));
 screenTab.addEventListener('click',()=>show('screen'));
 document.addEventListener('azrail:preview-open',()=>paint());
 document.addEventListener('azrail:site-preview',(event)=>{
  const html=(event as CustomEvent<string>).detail;
  if(typeof html!=='string'||!html.trim())return;
  code.value=html;
  try{localStorage.setItem(STORAGE_KEY,code.value);}catch{/* private mode */}
  show('screen');
 });
 document.addEventListener('azrail:zip-catalog',(event)=>{
  const paths=(event as CustomEvent<string[]>).detail;
  if(!fileLabel||!filePick||!Array.isArray(paths)||!paths.length)return;
  filePick.replaceChildren();
  for(const path of paths){
   const option=document.createElement('option');
   option.value=path;
   option.textContent=path;
   filePick.append(option);
  }
  fileLabel.hidden=false;
 });
 document.addEventListener('azrail:zip-open',(event)=>{
  const path=(event as CustomEvent<string>).detail;
  if(typeof path!=='string'||!path)return;
  if(filePick){
   if(![...filePick.options].some(option=>option.value===path)){
    const option=document.createElement('option');
    option.value=path;
    option.textContent=path;
    filePick.append(option);
   }
   filePick.value=path;
   if(fileLabel)fileLabel.hidden=false;
  }
  void openHeld(path).then(body=>{
   if(body==null)return;
   code.value=body;
   try{localStorage.setItem(STORAGE_KEY,code.value);}catch{/* private mode */}
   show(/\.html?$/i.test(path)?'screen':'code');
  });
 });
 filePick?.addEventListener('change',()=>{
  const path=filePick.value;
  void openHeld(path).then(body=>{
   if(!body)return;
   code.value=body;
   try{localStorage.setItem(STORAGE_KEY,code.value);}catch{/* private mode */}
   show(/\.html?$/i.test(path)?'screen':'code');
  });
 });
 show('code');
}
