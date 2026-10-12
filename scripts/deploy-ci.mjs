import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

if(process.env.AZRAIL_ALLOW_CLOUD_MUTATION!=='I_UNDERSTAND')throw Error('Cloud deployment is locked. Set AZRAIL_ALLOW_CLOUD_MUTATION=I_UNDERSTAND only after explicit review and approval.');
const target=process.env.AZRAIL_TARGET_ENV;
if(!['staging','production'].includes(target??''))throw Error('AZRAIL_TARGET_ENV must be staging or production');

const model=JSON.parse(readFileSync('config/environments.json','utf8'));
const envModel=model.environments?.[target];
if(!envModel?.config_file)throw Error(`Missing canonical environment configuration for ${target}`);
const baseConfig=JSON.parse(readFileSync(envModel.config_file,'utf8'));
const oidcIssuer=(process.env.OIDC_ISSUER||baseConfig.vars?.OIDC_ISSUER||'').trim();
const oidcClientId=(process.env.OIDC_CLIENT_ID||baseConfig.vars?.OIDC_CLIENT_ID||'').trim();
if(!oidcIssuer||!oidcClientId)throw Error(`OIDC_ISSUER and OIDC_CLIENT_ID must be configured for ${target} before deployment`);
try{const issuer=new URL(oidcIssuer);if(issuer.protocol!=='https:'||issuer.username||issuer.password||issuer.search||issuer.hash)throw Error();}catch{throw Error('OIDC_ISSUER must be an HTTPS issuer URL without credentials, query or fragment');}
if(baseConfig.vars?.AUTH_MODE==='oidc'&&!process.env.OIDC_CLIENT_SECRET?.trim())throw Error('OIDC_CLIENT_SECRET is required for an OIDC deployment; refusing to deploy a Worker that cannot complete authentication');
if(!process.env.CLOUDFLARE_ACCOUNT_ID||!process.env.CLOUDFLARE_API_TOKEN)throw Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required');

const daily=process.env.DAILY_PROVIDER_CALLS;if(daily!==undefined&&(!daily.trim()||!Number.isSafeInteger(Number(daily))||Number(daily)<0))throw Error('DAILY_PROVIDER_CALLS must be a non-negative integer');
for(const key of ['MCP_SERVERS','MCP_OAUTH_SECRETS'])if(process.env[key]){try{JSON.parse(process.env[key]);}catch{throw Error(`${key} must contain valid JSON`);}}

// Canonical staging may safely carry its public OIDC issuer/client identifiers in source.
// Production deliberately does not; verified operator inputs must provide them.
process.env.OIDC_ISSUER=oidcIssuer;
process.env.OIDC_CLIENT_ID=oidcClientId;

const cfg='wrangler.generated.json';
const run=(args,input)=>{const r=spawnSync(process.execPath,args,{stdio:input?['pipe','inherit','inherit']:'inherit',input,encoding:'utf8'});if(r.status!==0)throw Error(`Command failed: ${args[0]}`);};

// Finish all local build/config validation before the first Cloudflare mutation.
run(['scripts/generate-configs.mjs','--check']);
run(['scripts/check-version-truth.mjs']);
run(['scripts/build-unified.mjs']);

// Resource provisioning/migration/deploy happen only after the explicit mutation interlock above.
run(['scripts/provision.mjs','--apply']);
const config=JSON.parse(readFileSync(cfg,'utf8'));
if(config.name!==envModel.name)throw Error(`Generated Worker target mismatch: ${config.name} != ${envModel.name}`);
if(config.vars?.AUTH_MODE!=='oidc'||config.vars?.OIDC_ISSUER!==oidcIssuer||config.vars?.OIDC_CLIENT_ID!==oidcClientId)throw Error('Generated OIDC configuration does not match the reviewed deployment inputs');
run(['scripts/migrate.mjs','--remote','--apply','--config',cfg]);

const wrangler='node_modules/wrangler/bin/wrangler.js';
// Secret values go through stdin, never command arguments or logs.
const secrets=Object.fromEntries(['OIDC_CLIENT_SECRET','INTEGRATION_KEY','MCP_OAUTH_SECRETS'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
run([wrangler,'secret','bulk','--config',cfg],JSON.stringify(secrets));
run([wrangler,'deploy','--config',cfg]);
