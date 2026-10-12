import {AccessError} from '../lib/accounts';
import {readBoundedBody} from '../lib/request-body';
/** Syntax/shape failures are definitive preflight errors, not service outages. */
export async function readJsonRecord(request:Request,limit:number):Promise<Record<string,unknown>> {
 const bytes=await readBoundedBody(request,limit);let value:unknown;
 try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AccessError('Некорректный JSON запроса.',400);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new AccessError('Ожидался JSON-объект.',400);
 return value as Record<string,unknown>;
}
