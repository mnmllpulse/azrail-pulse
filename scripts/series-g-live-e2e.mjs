import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const base=String(process.env.AZRAIL_URL??'').replace(/\/$/,'');
const token=String(process.env.AZRAIL_TOKEN??'').trim();
const cookieHeader=String(process.env.AZRAIL_SESSION_COOKIE??'').trim();
const block=reason=>{console.error(`SERIES G LIVE PROOF BLOCKED: ${reason}`);process.exit(2);};
if(!base||(!token&&!cookieHeader))block('AZRAIL_URL and AZRAIL_TOKEN or AZRAIL_SESSION_COOKIE are required.');
let origin;try{origin=new URL(base);}catch{block('AZRAIL_URL must be an absolute http(s) URL.');}
if(!/^https?:$/.test(origin.protocol))block('AZRAIL_URL must use http(s).');
const chromium=['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(existsSync);
if(!chromium)block('A Chromium/Chrome binary is required for real browser proof.');

const profile=mkdtempSync(join(tmpdir(),'azrail-e2e-'));
const child=spawn(chromium,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',d=>{stderr+=String(d).slice(-4000);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const file=join(profile,'DevToolsActivePort');for(let i=0;i<100;i++){if(existsSync(file)){const [p]=readFileSync(file,'utf8').split(/\r?\n/);if(p)return Number(p);}await sleep(50);}throw Error(`Chromium DevTools port was not created. ${stderr.slice(-500)}`);}
async function json(url,options){const r=await fetch(url,options);if(!r.ok)throw Error(`${r.status} ${await r.text()}`);return r.json();}
let ws;let seq=0;const waiters=new Map();const events=[];
function send(method,params={}){const id=++seq;ws.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.delete(id);reject(Error(`CDP timeout: ${method}`));},15000);waiters.set(id,{resolve,reject,timer});});}
function onMessage(event){const msg=JSON.parse(String(event.data));if(msg.id){const w=waiters.get(msg.id);if(!w)return;clearTimeout(w.timer);waiters.delete(msg.id);msg.error?w.reject(Error(`${msg.error.message}`)):w.resolve(msg.result);return;}events.push(msg);}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'Runtime evaluation failed');return r.result?.value;}
function parseCookies(header){return header.split(';').map(x=>x.trim()).filter(Boolean).map(pair=>{const i=pair.indexOf('=');return i>0?{name:pair.slice(0,i),value:pair.slice(i+1)}:null;}).filter(Boolean);}
async function waitLoad(){for(let i=0;i<160;i++){if(events.some(e=>e.method==='Page.loadEventFired'))return;await sleep(50);}throw Error('Page load timeout');}
async function run(){
 const p=await port();const target=await json(`http://127.0.0.1:${p}/json/new?about:blank`,{method:'PUT'});ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=()=>reject(Error('CDP WebSocket failed'));});ws.onmessage=onMessage;
 await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable'),send('Log.enable'),send('Accessibility.enable')]);
 if(token)await send('Network.setExtraHTTPHeaders',{headers:{Authorization:`Bearer ${token}`}});
 if(cookieHeader){for(const c of parseCookies(cookieHeader))await send('Network.setCookie',{...c,url:base,secure:origin.protocol==='https:'});}
 events.length=0;await send('Page.navigate',{url:base});await waitLoad();await sleep(700);
 const auth=await evaluate(`fetch('/api/me',{credentials:'same-origin'}).then(async r=>({ok:r.ok,status:r.status,body:await r.text()}))`);
 if(!auth?.ok)throw Error(`Authenticated /api/me failed: ${auth?.status}`);
 const readiness=await evaluate(`fetch('/api/studio/system/readiness',{credentials:'same-origin'}).then(async r=>({ok:r.ok,status:r.status,json:r.ok?await r.json():await r.text()}))`);
 if(!readiness?.ok)throw Error(`Series G readiness failed: ${readiness?.status}`);
 const shell=await evaluate(`(()=>({title:document.title,body:document.body.innerText.slice(0,2000),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,buttons:[...document.querySelectorAll('button')].length,main:!!document.querySelector('main')}))()`);
 if(!shell?.main||shell.buttons<1)throw Error('Application shell did not render interactive UI.');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Control',code:'ControlLeft',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'k',code:'KeyK',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'k',code:'KeyK',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Control',code:'ControlLeft'});await sleep(150);
 const palette=await evaluate(`!!document.querySelector('dialog.command-palette[open]')`);if(!palette)throw Error('Ctrl/Cmd+K Command Palette did not open in the real browser.');
 const sizes=[];for(const [width,height] of [[390,844],[768,1024],[1440,900]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});await sleep(120);sizes.push(await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth})`));}
 if(sizes.some(x=>Number(x.overflow)>2))throw Error(`Responsive overflow detected: ${JSON.stringify(sizes)}`);
 const ax=await send('Accessibility.getFullAXTree');if(!Array.isArray(ax?.nodes)||ax.nodes.length<5)throw Error('Accessibility tree is unexpectedly empty.');
 const badNetwork=events.filter(e=>e.method==='Network.loadingFailed').map(e=>e.params?.errorText).filter(Boolean);
 const runtimeErrors=events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Log.entryAdded'&&['error','assert'].includes(e.params?.entry?.level)));
 const result={schema_version:1,status:'PASSED',target:origin.origin,checks:{authenticated_api:true,system_readiness:true,interactive_shell:true,command_palette:true,responsive:sizes,accessibility_nodes:ax.nodes.length,network_failures:badNetwork.length,runtime_errors:runtimeErrors.length},series_g:readiness.json};
 if(runtimeErrors.length)throw Error(`Browser runtime errors detected: ${runtimeErrors.length}`);
 console.log(JSON.stringify(result,null,2));
}
try{await run();}catch(error){console.error(`SERIES G LIVE E2E FAILED: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}finally{try{ws?.close();}catch{}child.kill('SIGTERM');await sleep(100);rmSync(profile,{recursive:true,force:true});}
