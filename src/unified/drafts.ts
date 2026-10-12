import { parseInput } from '../lib/validation';
import { studioDraftSchema } from '../shared/schemas';
import type {Env} from '../types';
import {AccessError} from '../lib/accounts';
import {readJsonRecord} from './request-json';
const fields:Record<string,Record<string,number>>={image:{'studio-text':4000},music:{'studio-text':4000,'music-genre':40,'music-mood':40,bpm:32,'music-key':8,'music-scale':20,bars:32,'music-time-signature':8,'music-pattern':32,'music-arrangement':40,'music-synth':32},video:{'studio-text':2000,'video-title':120,'video-profile':32,'video-aspect':8,'video-resolution':8,'video-duration':8,'video-fps':8,'video-scenes':8,'video-transition':16,'video-motion':16,'video-export':20,'video-continuity-character':300,'video-continuity-clothing':300,'video-continuity-lighting':300,'video-continuity-location':300,'video-continuity-camera':300,'video-continuity-props':300,'video-continuity-palette':300,'video-voice-gain':8,'video-music-gain':8,'video-sfx-gain':8,'video-captions':8,'video-grade-brightness':8,'video-grade-contrast':8,'video-grade-saturation':8,'video-grade-hue':8}};
export async function draftRoute(request:Request,env:Env,account:string):Promise<Response> {
 const id=new URL(request.url).pathname.split('/').at(-1)!;
 if(!Object.hasOwn(fields,id))return Response.json({error:'Студия не поддерживает текстовые черновики.'},{status:404});
 if(request.method==='GET') {
  const row=await env.AZRAIL_D1.prepare('SELECT revision,values_json,updated_at FROM studio_drafts WHERE account_id=? AND studio_id=?').bind(account,id).first<{revision:number;values_json:string;updated_at:number}>();
  return Response.json({revision:row?.revision??0,values:row?JSON.parse(row.values_json):{},updatedAt:row?.updated_at??null});
 }
 if(request.method!=='PUT')return Response.json({error:'Метод недоступен'},{status:405});
 const body=parseInput(studioDraftSchema,await readJsonRecord(request,20000));
 for(const [key,value]of Object.entries(body.values))if(!Object.hasOwn(fields[id],key)||typeof value!=='string'||value.length>fields[id][key])throw new AccessError('Недопустимое поле черновика.',400);
 const json=JSON.stringify(body.values),now=Date.now();
 const row=body.baseRevision===0
 ?await env.AZRAIL_D1.prepare('INSERT INTO studio_drafts VALUES(?,?,1,?,?) ON CONFLICT DO NOTHING RETURNING revision').bind(account,id,json,now).first()
 :await env.AZRAIL_D1.prepare('UPDATE studio_drafts SET values_json=?,updated_at=?,revision=revision+1 WHERE account_id=? AND studio_id=? AND revision=? RETURNING revision').bind(json,now,account,id,body.baseRevision).first();
 if(!row)return Response.json({error:'Черновик изменён в другой вкладке. Загрузите сохранённую версию перед следующей записью.'},{status:409});
 return Response.json(row);
}
