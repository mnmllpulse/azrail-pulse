import type {Env} from '../types';
import {AccessError} from '../lib/accounts';
const enc=new TextEncoder(),dec=new TextDecoder();
const encode=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function key(env:Env) {
 let bytes:Uint8Array;try{bytes=decode(env.INTEGRATION_KEY??'');}catch{throw new AccessError('Хранилище подключений не настроено.',503);}
 if(bytes.length!==32)throw new AccessError('Нужен серверный INTEGRATION_KEY: 32 случайных байта в base64.',503);
 return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export async function seal(env:Env,binding:string,value:unknown) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(binding)},await key(env),enc.encode(JSON.stringify(value)));
 return 'v1.'+encode(iv)+'.'+encode(new Uint8Array(cipher));
}
export async function unseal<T>(env:Env,binding:string,value:string):Promise<T> {
 const [v,iv,cipher]=value.split('.');if(v!=='v1'||!iv||!cipher)throw new AccessError('Не удалось прочитать подключение.',503);
 try{return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:enc.encode(binding)},await key(env),decode(cipher)))) as T;}
 catch{throw new AccessError('Не удалось прочитать подключение. Проверьте ключ хранилища.',503);}
}
export function canonical(value:unknown):string {
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
}
