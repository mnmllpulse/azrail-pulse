import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const cookie='__Host-pulse-session='+'a'.repeat(64);
function payload(path,auth,release){
  if(path==='/')return [200,'text/html','<!doctype html><html><title>AZRAIL</title></html>'];
  if(path==='/agents/orchestrator/default')return [404,'application/json',JSON.stringify({error:'disabled'})];
  if(path==='/api/me'&&!auth)return [401,'application/json',JSON.stringify({error:'unauthorized'})];
  if(path==='/api/me')return [200,'application/json',JSON.stringify({account:{id:'acct',role:'admin'}})];
  if(path==='/health')return [200,'application/json',JSON.stringify({system:'AZRAIL OS',version:release,status:'healthy',services:[{name:'d1',status:'ok'},{name:'kv',status:'ok'},{name:'r2',status:'ok'}],bindings:{ai:'bound'},agents:10})];
  if(path==='/api/agents')return [200,'application/json',JSON.stringify({agents:Array.from({length:10},(_,i)=>({id:`a${i}`})),capabilities:[]})];
  if(path==='/api/routing-settings')return [200,'application/json',JSON.stringify({policy:{allowThirdParty:false},gatewayConfigured:true,workersPlan:'free'})];
  if(path==='/api/studio/capabilities')return [200,'application/json',JSON.stringify({local:{}})];
  if(path==='/api/studio/pulse')return [200,'application/json',JSON.stringify({sections:[]})];
  if(path==='/api/studio/ledger')return [200,'application/json',JSON.stringify({calls:[],summary:{}})];
  if(path==='/api/connectors')return [200,'application/json',JSON.stringify({catalog:[],connections:[],vaultConfigured:false})];
  return [404,'application/json','{}'];
}
function runChild(env){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/smoke.mjs'],{env,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d); child.stderr.on('data',d=>stderr+=d);
    child.on('error',reject); child.on('close',(code)=>resolve({status:code,stdout,stderr}));
  });
}
async function runCase(release,expectSuccess){
  const server=http.createServer((req,res)=>{const auth=req.headers.cookie===cookie||Boolean(req.headers.authorization);const [code,type,body]=payload(new URL(req.url,'http://x').pathname,auth,release);res.statusCode=code;res.setHeader('content-type',type);res.end(body);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port; const temp=mkdtempSync(join(tmpdir(),'azrail-smoke-')); const receipt=join(temp,'receipt.json');
  let result;
  try {
    result=await runChild({...process.env,AZRAIL_URL:`http://127.0.0.1:${port}`,AZRAIL_SESSION_COOKIE:cookie,AZRAIL_EXPECTED_RELEASE:pkg.version,AZRAIL_SMOKE_RECEIPT:receipt});
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
  const report=JSON.parse(readFileSync(receipt,'utf8')); rmSync(temp,{recursive:true,force:true});
  const ok=result.status===0&&report.status==='VERIFIED';
  if(ok!==expectSuccess)throw new Error(`Smoke simulation expectation failed: release=${release} exit=${result.status} status=${report.status}\n${result.stdout}\n${result.stderr}`);
  return {release,exit:result.status,status:report.status,failed:report.checks.filter(x=>x.status==='FAILED').map(x=>x.name)};
}
const good=await runCase(pkg.version,true);
const bad=await runCase('0.0.0-wrong',false);
if(!bad.failed.includes('health'))throw new Error('Negative simulation did not fail exact-release health check.');
console.log('STAGING SMOKE SIMULATION PASS');
console.log(JSON.stringify({positive:good,negative:bad},null,2));
