/** Bounded MCP Streamable HTTP client; pinned interoperable 2025 protocol family.
 * No stdio, server sampling, roots, automatic retries, redirects or remote code.
 */
import {boundedStructure,validateArguments} from './connector-schema';
export interface MCPTool {name:string;description?:string;inputSchema:Record<string,unknown>;outputSchema?:Record<string,unknown>;annotations?:Record<string,unknown>;}
type Message={jsonrpc?:string;id?:string|number;method?:string;result?:any;error?:unknown};
const MAX_BYTES=512*1024;
async function readReply(response:Response,id:string):Promise<any> {
 if(!response.body)throw Error('MCP response has no body');
 const reader=response.body.getReader(),decoder=new TextDecoder();let total=0,buffer='';
 const sse=(response.headers.get('Content-Type')??'').includes('text/event-stream');
 const parse=(text:string)=>{const m=JSON.parse(text) as Message;if(m.jsonrpc!=='2.0')throw Error('Invalid MCP reply');if(m.id!==id)return undefined;if(m.error)throw Error('MCP rejected the request');if(!('result'in m))throw Error('Missing MCP result');return m.result;};
 try {
  while(true){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.length;if(total>MAX_BYTES)throw Error('MCP response exceeds 512 KiB');buffer+=decoder.decode(chunk.value,{stream:true});
   if(sse){buffer=buffer.replace(/\r\n/g,'\n');let end:number;while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');if(data){const value=parse(data);if(value!==undefined)return value;}}}
  }
  buffer+=decoder.decode();if(!sse){const value=parse(buffer);if(value!==undefined)return value;}
  throw Error('MCP response interrupted before result');
 }finally{await reader.cancel().catch(()=>{});}
}
export class MCPClient {
 private session='';private version='2025-11-25';
 constructor(private endpoint:string,private token:string,private signal?:AbortSignal){}
 private headers(){return {'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':this.version,...(this.token?{Authorization:`Bearer ${this.token}`}:{}) ,...(this.session?{'MCP-Session-Id':this.session}:{})};}
 private async post(method:string,params:unknown={},notification=false):Promise<any>{
  const id=crypto.randomUUID();const response=await fetch(this.endpoint,{method:'POST',headers:this.headers(),body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params}),redirect:'error',signal:this.signal?AbortSignal.any([this.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  if(!response.ok){await response.body?.cancel();throw Error(`MCP HTTP ${response.status}`);}
  if(method==='initialize'){const session=response.headers.get('Mcp-Session-Id');if(session){if(!/^[\x21-\x7e]{1,512}$/.test(session))throw Error('Invalid MCP session');this.session=session;}}
  if(notification){await response.body?.cancel();return;}
  return readReply(response,id);
 }
 async initialize(){const r=await this.post('initialize',{protocolVersion:this.version,capabilities:{},clientInfo:{name:'azrail-pulse',version:'1.5.0-rc.63'}});if(!['2025-11-25','2025-06-18'].includes(r?.protocolVersion)||!r?.capabilities?.tools)throw Error('Unsupported MCP protocol or missing tools capability');this.version=r.protocolVersion;await this.post('notifications/initialized',{},true);}
 async listTools():Promise<MCPTool[]> {const result:MCPTool[]=[];let cursor:string|undefined;const seen=new Set<string>();
  for(let page=0;page<5;page++){const r=await this.post('tools/list',cursor?{cursor}:{});if(!Array.isArray(r.tools))throw Error('Invalid tool catalog');for(const tool of r.tools){if(typeof tool?.name!=='string'||!/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)||seen.has(tool.name)||tool.inputSchema?.type!=='object'||Array.isArray(tool.inputSchema)||JSON.stringify(tool).length>20000)throw Error('Unsupported tool schema');if(tool.outputSchema!==undefined&&(!tool.outputSchema||Array.isArray(tool.outputSchema)||tool.outputSchema.type!=='object'))throw Error('Unsupported tool output schema');seen.add(tool.name);result.push({name:tool.name,description:typeof tool.description==='string'?tool.description.slice(0,2000):'',inputSchema:tool.inputSchema,...(tool.outputSchema?{outputSchema:tool.outputSchema}:{})});}if(result.length>200)throw Error('Catalog exceeds 200 tools');if(JSON.stringify(result).length>480000)throw Error('Catalog exceeds storage budget');if(!r.nextCursor)return result;if(typeof r.nextCursor!=='string'||r.nextCursor===cursor||r.nextCursor.length>2000)throw Error('Invalid MCP cursor');cursor=r.nextCursor;}
  throw Error('Catalog exceeds five pages');
 }
 async call(name:string,args:Record<string,unknown>,outputSchema?:Record<string,unknown>){
  const result=await this.post('tools/call',{name,arguments:args});boundedStructure(result);
  if(!result||Array.isArray(result)||typeof result!=='object'||!Array.isArray(result.content)||result.isError!==undefined&&typeof result.isError!=='boolean'||result.structuredContent!==undefined&&(!result.structuredContent||Array.isArray(result.structuredContent)||typeof result.structuredContent!=='object'))throw Error('Invalid MCP tool result');
  for(const block of result.content){
   const valid=block&&typeof block==='object'&&(
    block.type==='text'&&typeof block.text==='string'||
    ['image','audio'].includes(block.type)&&typeof block.data==='string'&&typeof block.mimeType==='string'||
    block.type==='resource_link'&&typeof block.uri==='string'&&typeof block.name==='string'||
    block.type==='resource'&&block.resource&&typeof block.resource.uri==='string'&&(typeof block.resource.text==='string'||typeof block.resource.blob==='string'));
   if(!valid)throw Error('Invalid MCP content block');
  }
  if(outputSchema&&!result.isError){if(!result.structuredContent)throw Error('Missing MCP structured output');validateArguments(outputSchema,result.structuredContent);}
  return result;
 }
 async close(){if(!this.session)return;try{const r=await fetch(this.endpoint,{method:'DELETE',headers:this.headers(),redirect:'error',signal:this.signal?AbortSignal.any([this.signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000)});await r.body?.cancel();}catch{/* Cleanup cannot replay a remote operation. */}}
}
