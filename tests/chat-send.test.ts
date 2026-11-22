import {describe,expect,it} from 'vitest';
import {APIError} from '../ui/api-error';
import {chatFailureOf,chatReplyOf,chatRequestBody} from '../ui/chat-send';

const base={message:'привет',projectId:'p',conversationId:'c',voice:'v',attachments:[]};

describe('chat send',()=>{
 it('omits default effort and empty model',()=>{
  const body=JSON.parse(chatRequestBody({...base,effort:'medium'}));
  expect(body).toEqual({...base});
 });
 it('includes model and non-default effort',()=>{
  const body=JSON.parse(chatRequestBody({...base,preferredModel:'m',effort:'high'}));
  expect(body.preferredModel).toBe('m');expect(body.effort).toBe('high');
 });
 it('reads summary, then error, then fallback',()=>{
  expect(chatReplyOf({result:{summary:'ок'}})).toEqual({reply:'ок',status:'completed'});
  expect(chatReplyOf({result:{error:'e'}}).reply).toBe('e');
  expect(chatReplyOf({error:'x'}).reply).toBe('x');
  expect(chatReplyOf({}).reply).toBe('Пустой ответ.');
 });
 it('marks failed results',()=>{
  expect(chatReplyOf({result:{summary:'s',status:'failed'}}).status).toBe('failed');
  expect(chatReplyOf({success:false,result:{summary:'s'}}).status).toBe('failed');
 });
 it('detects daily limits',()=>{
  expect(chatFailureOf(new APIError('Лимит исчерпан',429,'chat_daily_limit'))).toEqual({daily:true,text:'Лимит исчерпан'});
  expect(chatFailureOf(new APIError('x',429,'provider_daily_limit')).daily).toBe(true);
  expect(chatFailureOf(new APIError('дневной лимит',500)).daily).toBe(true);
  expect(chatFailureOf(new APIError('boom',500))).toEqual({daily:false,text:'boom'});
  expect(chatFailureOf('str')).toEqual({daily:false,text:'Не удалось получить ответ.'});
 });
});
