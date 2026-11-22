import {APIError} from './api-error';

export type ChatReply={success?:boolean;error?:string;result?:{summary?:string;error?:string;status?:string}};

export function chatRequestBody(input:{message:string;projectId:string;conversationId:string;voice:unknown;attachments:unknown;preferredModel?:string;effort:string}){
 const {message,projectId,conversationId,voice,attachments,preferredModel,effort}=input;
 return JSON.stringify({message,projectId,conversationId,voice,attachments,...(preferredModel?{preferredModel}:{}),...(effort!=='medium'?{effort}:{})});
}

export function chatReplyOf(r:ChatReply){
 const reply=String(r.result?.summary||r.result?.error||r.error||'Пустой ответ.');
 const status:'failed'|'completed'=r.result?.status==='failed'||r.success===false?'failed':'completed';
 return {reply,status};
}

export function chatFailureOf(e:unknown){
 const daily=e instanceof APIError&&(e.code==='chat_daily_limit'||e.code==='provider_daily_limit'||/лимит/i.test(e.message));
 const text=daily?(e instanceof Error&&e.message?e.message:'Лимит моделей на сегодня. Попробуйте позже.'):e instanceof Error?e.message:'Не удалось получить ответ.';
 return {daily,text};
}
