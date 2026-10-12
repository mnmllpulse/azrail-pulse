import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const packages=[];
for(const [path,meta] of Object.entries(lock.packages??{})){
  if(path==='')continue;
  if(!path.startsWith('node_modules/'))continue;
  const name=path.slice('node_modules/'.length);
  const version=String(meta.version??'').trim();
  if(!version)continue;
  packages.push({
    SPDXID:`SPDXRef-Package-${createHash('sha256').update(`${name}@${version}`).digest('hex').slice(0,24)}`,
    name,
    versionInfo:version,
    downloadLocation:meta.resolved && /^https:/.test(meta.resolved)?meta.resolved:'NOASSERTION',
    filesAnalyzed:false,
    licenseConcluded:'NOASSERTION',
    licenseDeclared:'NOASSERTION',
    externalRefs:[{referenceCategory:'PACKAGE-MANAGER',referenceType:'purl',referenceLocator:`pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`}]
  });
}
packages.sort((a,b)=>a.name.localeCompare(b.name)||a.versionInfo.localeCompare(b.versionInfo));
const packageDigest=createHash('sha256').update(JSON.stringify(packages)).digest('hex');
const name=`${pkg.name}-${pkg.version}-sbom`;
const documentNamespace=`https://azrail.local/sbom/${pkg.version}/${packageDigest}`;
const path='verification/sbom.spdx.json';
let created=new Date().toISOString();
if(existsSync(path)){
  try{
    const previous=JSON.parse(readFileSync(path,'utf8'));
    if(previous.name===name && previous.documentNamespace===documentNamespace && /^\d{4}-\d{2}-\d{2}T/.test(String(previous.creationInfo?.created??''))){
      created=previous.creationInfo.created;
    }
  }catch{}
}
const doc={
  spdxVersion:'SPDX-2.3',
  dataLicense:'CC0-1.0',
  SPDXID:'SPDXRef-DOCUMENT',
  name,
  documentNamespace,
  creationInfo:{created,creators:['Tool: AZRAIL build-sbom.mjs']},
  packages:[{SPDXID:'SPDXRef-Root',name:pkg.name,versionInfo:pkg.version,downloadLocation:'NOASSERTION',filesAnalyzed:false,licenseConcluded:'NOASSERTION',licenseDeclared:'NOASSERTION'},...packages],
  relationships:packages.map(p=>({spdxElementId:'SPDXRef-Root',relationshipType:'DEPENDS_ON',relatedSpdxElement:p.SPDXID}))
};
const next=JSON.stringify(doc,null,2)+'\n';
if(!existsSync(path) || readFileSync(path,'utf8')!==next) writeFileSync(path,next);
console.log(`SBOM generated deterministically: ${packages.length} locked npm packages for ${pkg.version}; created=${created}.`);
