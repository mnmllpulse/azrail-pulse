import {describe,expect,it} from 'vitest';
import {blockedReply,localCommandOf} from '../ui/chat-local-commands';

describe('chat local commands',()=>{
 it.each([
  ['скачай архив','save-zip'],['Скачай этот архив!','save-zip'],['скачайте текущий архив.','save-zip'],
  ['скачай файл','save-file'],['скачай этот файл?','save-file'],
  ['верни файл','restore-file'],['Верни файл.','restore-file'],
  ['запусти тесты','run-tests'],['прогони тесты!','run-tests'],['выполни тесты','run-tests'],
  ['запусти npm','blocked-commands'],['запусти сборку','blocked-commands'],['выполни команду','blocked-commands'],['запусти dev','blocked-commands'],
  ['выложи','blocked-deploy'],['задеплой','blocked-deploy'],['сделай push','blocked-deploy'],['отправь в github','blocked-deploy'],
 ])('%s → %s',(text,kind)=>expect(localCommandOf(text)).toBe(kind));

 it.each(['привет','запусти тесты для модуля оплаты','скачай архив с сайта','выложи сайт на хостинг','нарисуй кота',''])('%s → обычный чат',text=>expect(localCommandOf(text)).toBeNull());

 it('has replies for both blocked commands',()=>{
  expect(blockedReply['blocked-commands']).toContain('пробным лимитом');
  expect(blockedReply['blocked-deploy']).toContain('Выкладка из чата закрыта');
 });
});
