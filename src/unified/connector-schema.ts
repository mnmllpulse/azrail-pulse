import {Validator,type Schema} from '@cfworker/json-schema';
import {AccessError} from '../lib/accounts';
export function boundedStructure(value:unknown,depth=0) {
 if(depth>24)throw new AccessError('Слишком глубокая структура параметров.',400);
 if(value&&typeof value==='object')for(const v of Object.values(value))boundedStructure(v,depth+1);
}
export function validateArguments(schema:Record<string,unknown>,args:Record<string,unknown>) {
 boundedStructure(args);boundedStructure(schema);
 try{const result=new Validator(schema as Schema,'2020-12').validate(args);if(!result.valid)throw new AccessError('Параметры не соответствуют схеме инструмента. Проверьте обязательные поля и типы.',400);}
 catch(e){if(e instanceof AccessError)throw e;throw new AccessError('Схема инструмента не поддерживается. Вызов не отправлен.',400);}
}
