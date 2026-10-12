import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const apply=process.argv.includes('--apply');
const mutationUnlocked=process.env.AZRAIL_ALLOW_CLOUD_MUTATION==='I_UNDERSTAND';
if(apply&&!mutationUnlocked)throw Error('Cloud resource creation is locked. Set AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND only after explicit review and approval.');
const target=process.env.AZRAIL_TARGET_ENV;
if(!['staging','production'].includes(target??''))throw Error('AZRAIL_TARGET_ENV must be staging or production. No environment is selected implicitly.');
const model=JSON.parse(await readFile('config/environments.json','utf8'));
const env=model.environments[target];
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const baseConfig=JSON.parse(await readFile(env.config_file,'utf8'));
const plan={target,worker:env.name,d1:env.d1.database_name,kv:env.kv.namespace_name,r2:env.r2.bucket_name,config:env.config_file,action:apply?'apply-resources-only':'plan-only'};
if(!apply){console.log(JSON.stringify(plan,null,2));process.exit(0);}
if(!account||!token)throw Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required');
async function api(path,method='GET',body){const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const json=await response.json();if(!response.ok||json.success===false)throw Error(`Cloudflare ${method} ${path}: ${response.status} ${json.errors?.map(e=>e.code).join(',')??''}`);return json.result;}
async function pages(path){let all=[];for(let page=1;page<=50;page++){const rows=await api(`${path}?page=${page}&per_page=100`);if(!Array.isArray(rows))throw Error('Unexpected API list');all.push(...rows);if(rows.length<100)return all;}throw Error('Resource list exceeds supported pagination; choose explicit IDs');}
const dbs=await pages('/d1/database'),namespaces=await pages('/storage/kv/namespaces');
const db=dbs.find(d=>d.name===env.d1.database_name)??await api('/d1/database','POST',{name:env.d1.database_name});
const kv=namespaces.find(k=>k.title===env.kv.namespace_name)??await api('/storage/kv/namespaces','POST',{title:env.kv.namespace_name});
try{await api(`/r2/buckets/${env.r2.bucket_name}`);}catch(e){if(!String(e).includes(': 404'))throw e;await api('/r2/buckets','POST',{name:env.r2.bucket_name});}
const config=structuredClone(baseConfig);
config.account_id=account;
config.d1_databases[0].database_id=db.uuid;
config.kv_namespaces[0].id=kv.id;
for(const key of ['OIDC_ISSUER','OIDC_CLIENT_ID','OPERATOR_ACCOUNT_IDS','AI_GATEWAY_ID','DAILY_PROVIDER_CALLS','MCP_SERVERS'])if(process.env[key])config.vars[key]=process.env[key];
await writeFile('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');
await mkdir('.work',{recursive:true});
console.log(`Resources ready for ${target}. Generated deployment candidate: wrangler.generated.json. Worker NOT deployed.`);
