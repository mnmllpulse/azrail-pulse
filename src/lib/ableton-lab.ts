import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { gunzipSync } from 'node:zlib';
import { classifyTrackRole, colorGroupFor, summarizeRoles } from './als-music-parser';

const MiB=1024*1024;
export const ALS_COMPRESSED_LIMIT=12*MiB;
export const ALS_XML_LIMIT=24*MiB;
const NODE_SCAN_LIMIT=240_000;

type Rec=Record<string,unknown>;
export class AbletonAnalysisError extends Error { constructor(public status:number,public code:string,message:string){super(message)} }

export type AbletonDevice={type:string;name:string;active:boolean|null;plugin:boolean;cpuHeavy:boolean};
export type AbletonRouting={kind:string;target:string};
export type AbletonClip={name:string;startBeats:number;lengthBeats:number};
export type AbletonLocator={name:string;timeBeats:number};
export type AbletonTrack={
 id:number|null;name:string;type:'audio'|'midi'|'group'|'return'|'master';groupId:number|null;
 role:string;colorGroup:string;clips:AbletonClip[];
 clipCount:number;deviceCount:number;pluginCount:number;automationEnvelopeCount:number;
 frozen:boolean;volume:number|null;pan:number|null;devices:AbletonDevice[];routing:AbletonRouting[];
};
export type AbletonSample={name:string;path:string|null;missing:boolean;references:number};
export type AbletonIssue={kind:string;severity:'warning'|'info';track?:string;device?:string;detail:string;heuristic?:boolean};
export type AbletonSidechain={track:string;device:string;source:string|null;enabled:boolean|null};
export type AbletonReport={
 format:'Ableton Live Set';abletonVersion:string|null;bpm:number|null;timeSignature:string|null;keyRoot:string|null;keyScale:string|null;locators:AbletonLocator[];sceneCount:number;
 groups:number;trackCount:number;roleSummary:Record<string,number>;tracks:AbletonTrack[];samples:AbletonSample[];masterChain:AbletonDevice[];
 checks:{missingPlugins:AbletonIssue[];missingSamples:AbletonIssue[];duplicatedProcessing:AbletonIssue[];routingLoops:AbletonIssue[];sidechainTopology:AbletonSidechain[];gainStagingWarnings:AbletonIssue[];cpuHeavyDevices:AbletonIssue[];frozenTracks:AbletonIssue[];inactiveDevices:AbletonIssue[]};
 summary:{clips:number;devices:number;plugins:number;automationEnvelopes:number;samples:number;issues:number};
 warnings:string[];analysisBoundary:string[];
};

function rec(v:unknown):v is Rec{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function list<T=unknown>(v:unknown):T[]{return Array.isArray(v)?v as T[]:v===undefined||v===null?[]:[v as T];}
function scalar(v:unknown):unknown{
 if(rec(v)){
  if('@_Value'in v)return v['@_Value'];
  if('Value'in v)return scalar(v.Value);
  if('Manual'in v)return scalar(v.Manual);
 }
 return v;
}
function text(v:unknown):string|null{const s=scalar(v);if(typeof s==='string'&&s.trim())return s.trim();if(typeof s==='number'||typeof s==='boolean')return String(s);return null;}
function num(v:unknown):number|null{const s=scalar(v);const n=typeof s==='number'?s:Number(s);return Number.isFinite(n)?n:null;}
function bool(v:unknown):boolean|null{const s=scalar(v);if(s===true||s===1||s==='1'||s==='true')return true;if(s===false||s===0||s==='0'||s==='false')return false;return null;}
function firstText(root:unknown,keys:string[]):string|null{
 if(!rec(root))return null;
 for(const key of keys){const v=root[key],out=text(v);if(out)return out;}
 return null;
}
function firstNumber(root:unknown,keys:string[]):number|null{
 if(!rec(root))return null;
 for(const key of keys){const out=num(root[key]);if(out!==null)return out;}
 return null;
}
function nameOf(root:unknown,fallback:string):string{
 if(!rec(root))return fallback;
 const direct=firstText(root,['UserName','EffectiveName','Name','PresetName','PlugName','PluginName','DisplayName']);
 if(direct)return direct;
 const n=rec(root.Name)?firstText(root.Name,['EffectiveName','UserName','Name','@_Value']):null;
 return n??fallback;
}
function walk(root:unknown,visit:(key:string,value:unknown,parent:Rec)=>void){
 const stack:unknown[]=[root];let scanned=0;
 while(stack.length){const item=stack.pop();if(!rec(item))continue;if(++scanned>NODE_SCAN_LIMIT)throw new AbletonAnalysisError(413,'als_too_complex','ALS содержит слишком много XML-узлов для безопасного анализа.');
  for(const [key,value] of Object.entries(item)){visit(key,value,item);if(Array.isArray(value)){for(let i=value.length-1;i>=0;i--)if(rec(value[i]))stack.push(value[i]);}else if(rec(value))stack.push(value);}
 }
}
function countKeys(root:unknown,names:Set<string>){let n=0;walk(root,(key,value)=>{if(names.has(key))n+=list(value).length;});return n;}
function explicitUnavailable(root:unknown):boolean{
 let found=false;walk(root,(key,value)=>{if(found)return;if(/missing|unavailable|offline|notfound/i.test(key)&&bool(value)===true)found=true;});return found;
}
function explicitInactive(root:unknown):boolean|null{
 if(!rec(root))return null;
 for(const key of ['On','DeviceOn','Active','IsActive']){const v=bool(root[key]);if(v!==null)return !v;}
 return null;
}
function collectDeviceContainers(root:unknown):Array<{type:string,node:Rec}>{
 const out:Array<{type:string,node:Rec}>=[];const seen=new Set<Rec>();
 walk(root,(key,value)=>{if(key!=='Devices'||!rec(value))return;for(const [type,rows]of Object.entries(value)){for(const node of list(rows)){if(!rec(node)||seen.has(node))continue;seen.add(node);out.push({type,node});}}});
 return out;
}
const CPU_HEAVY=/max(?:for)?live|m4l|convolution|hybrid\s*reverb|spectral|granulator|wavetable|roar|meld|sampler|operator|ozone|soothe|oversampl/i;
function deviceFrom(type:string,node:Rec):AbletonDevice{
 const name=nameOf(node,type.replace(/Device$/,''));const inactive=explicitInactive(node);const plugin=/plugin|vst|audio.?unit|au/i.test(type)||countKeys(node,new Set(['VstPluginInfo','Vst3PluginInfo','AuPluginInfo','PluginDesc']))>0;
 return {type,name,active:inactive===null?null:!inactive,plugin,cpuHeavy:CPU_HEAVY.test(`${type} ${name}`)};
}
function collectRouting(root:unknown):AbletonRouting[]{
 const out:AbletonRouting[]=[];walk(root,(key,value)=>{if(!/Routing$/i.test(key)||!rec(value))return;const target=firstText(value,['Target','UpperDisplayString','LowerDisplayString','DisplayString','Name','@_Value']);if(target)out.push({kind:key,target});});
 return out.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.target===v.target)===i).slice(0,40);
}
function collectSidechains(trackName:string,devices:Array<{type:string,node:Rec}>):AbletonSidechain[]{
 const out:AbletonSidechain[]=[];
 for(const {type,node}of devices){let has=false,enabled:boolean|null=null,source:string|null=null;walk(node,(key,value)=>{if(!/side.?chain/i.test(key))return;has=true;if(enabled===null){const b=bool(value);if(b!==null)enabled=b;}if(!source&&rec(value)){source=firstText(value,['Target','UpperDisplayString','LowerDisplayString','Name','@_Value']);if(!source)walk(value,(nested,nestedValue)=>{if(!source&&/AudioFrom|MidiFrom|Input|Source|Routing/i.test(nested))source=text(nestedValue);});}});if(has)out.push({track:trackName,device:nameOf(node,type),source,enabled});}
 return out;
}
function nestedNumber(root:unknown,keys:string[]):number|null{
 let out:number|null=null;walk(root,(key,value)=>{if(out!==null||!keys.includes(key))return;const n=num(value);if(n!==null)out=n;});return out;
}
function collectClips(track:Rec):AbletonClip[]{
 const clips:AbletonClip[]=[];walk(track,(key,value)=>{if(key!=='AudioClip'&&key!=='MidiClip')return;for(const raw of list(value)){if(!rec(raw))continue;const start=firstNumber(raw,['CurrentStart'])??num(raw['@_Time'])??0;const end=firstNumber(raw,['CurrentEnd']);const attrLength=num(raw['@_Length']);const length=end!==null?Math.max(0,end-start):attrLength??0;clips.push({name:nameOf(raw,'Clip'),startBeats:start,lengthBeats:length});}});return clips.slice(0,400);
}
function mixerValue(track:Rec,key:string):number|null{return firstNumber(rec(track.DeviceChain)&&rec(track.DeviceChain.Mixer)?track.DeviceChain.Mixer:null,[key])??firstNumber(track,[key]);}
function frozen(track:Rec):boolean{let found=false;walk(track,(key,value)=>{if(found)return;if(/Frozen|Freeze/i.test(key)){const b=bool(value);if(b===true||(/FreezeSequencer/i.test(key)&&rec(value)))found=true;}});return found;}
function extractTracks(live:Rec):{tracks:AbletonTrack[];sidechains:AbletonSidechain[]}{
 const tracks:AbletonTrack[]=[];const sidechains:AbletonSidechain[]=[];const groups:[string,AbletonTrack['type']][]=[['AudioTrack','audio'],['MidiTrack','midi'],['GroupTrack','group'],['ReturnTrack','return']];
 const root=rec(live.Tracks)?live.Tracks:{};
 for(const [key,type]of groups){for(const raw of list(root[key])){if(!rec(raw))continue;const devicesRaw=collectDeviceContainers(raw),devices=devicesRaw.map(({type:t,node})=>deviceFrom(t,node)),name=nameOf(raw,`${type} track`);sidechains.push(...collectSidechains(name,devicesRaw));const colorIndex=firstNumber(raw,['ColorIndex'])??0;tracks.push({id:num(raw['@_Id']),name,type,groupId:firstNumber(raw,['TrackGroupId','GroupId']),role:classifyTrackRole(name,type),colorGroup:colorGroupFor(Math.trunc(colorIndex)),clips:collectClips(raw),clipCount:countKeys(raw,new Set(['AudioClip','MidiClip'])),deviceCount:devices.length,pluginCount:devices.filter(d=>d.plugin).length,automationEnvelopeCount:countKeys(raw,new Set(['AutomationEnvelope'])),frozen:frozen(raw),volume:mixerValue(raw,'Volume'),pan:mixerValue(raw,'Pan'),devices,routing:collectRouting(raw)});}}
 return {tracks,sidechains};
}
function extractSamples(live:Rec):AbletonSample[]{
 const byKey=new Map<string,AbletonSample>();walk(live,(key,value)=>{if(key!=='FileRef')return;for(const raw of list(value)){if(!rec(raw))continue;const path=firstText(raw,['RelativePath','Path','AbsolutePath','Name']);const name=firstText(raw,['Name'])??path?.split(/[\\/]/).pop()??'Sample';if(!path&&!name)continue;const k=(path??name).toLowerCase();const current=byKey.get(k);if(current){current.references++;current.missing ||= explicitUnavailable(raw);}else byKey.set(k,{name,path,missing:explicitUnavailable(raw),references:1});}});return [...byKey.values()].slice(0,4000);
}
const LIVE_44_AUTOMATION=201326592;
function decodePackedTimeSignature(value:number):string|null{
 if(!Number.isFinite(value))return null;
 const raw=Math.trunc(value);
 if(raw===LIVE_44_AUTOMATION)return '4/4';
 const numerator=(raw>>16)&0xff,denomPow=raw&0xff;
 if(numerator<1||numerator>32||denomPow>5)return null;
 const denominator=2**denomPow;
 return [1,2,4,8,16,32].includes(denominator)?`${numerator}/${denominator}`:null;
}
function timeSignature(live:Rec):string|null{
 let explicit:string|null=null,packed:string|null=null;
 walk(live,(key,value)=>{
  if(!/TimeSignature$/i.test(key)||!rec(value))return;
  const n=nestedNumber(value,['Numerator','TimeSignatureNumerator']),d=nestedNumber(value,['Denominator','TimeSignatureDenominator']);
  if(!explicit&&n&&d&&n>=1&&n<=32&&[1,2,4,8,16,32].includes(d))explicit=`${n}/${d}`;
  if(packed)return;
  walk(value,(innerKey,inner)=>{
   if(packed||innerKey!=='AutomationEvent')return;
   for(const event of list(inner)){const encoded=rec(event)?num(event['@_Value']??event.Value??event):num(event);const decoded=encoded===null?null:decodePackedTimeSignature(encoded);if(decoded){packed=decoded;return;}}
  });
 });
 return explicit??packed;
}
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALE_BY_INDEX:Record<number,string>={0:'Major',1:'Minor',2:'Dorian',3:'Mixolydian',4:'Lydian',5:'Phrygian',6:'Locrian',7:'Whole Tone'};
function projectKey(live:Rec):{keyRoot:string|null;keyScale:string|null}{
 let keyRoot:string|null=null,keyScale:string|null=null;
 walk(live,(key,value)=>{if(key!=='ScaleInformation'&&key!=='KeyScale')return;for(const node of list(value)){if(!rec(node))continue;const rootIdx=nestedNumber(node,['RootNote','Root']);if(keyRoot===null&&rootIdx!==null&&rootIdx>=0&&rootIdx<=11)keyRoot=NOTE_NAMES[rootIdx];const named=firstText(node,['Name']);const scaleIdx=nestedNumber(node,['Scale']);if(keyScale===null){if(named&&/major|minor|dorian|mixolydian|lydian|phrygian|locrian/i.test(named))keyScale=named;else if(scaleIdx!==null&&SCALE_BY_INDEX[scaleIdx])keyScale=SCALE_BY_INDEX[scaleIdx];}}});
 return {keyRoot,keyScale};
}
function manualTempo(node:unknown):number|null{
 if(!rec(node))return null;
 const manual=rec(node.Manual)?num(node.Manual):num(node);
 return manual!==null&&manual>=20&&manual<=999?manual:null;
}
function tempo(live:Rec):number|null{
 const master=rec(live.MasterTrack)?live.MasterTrack:rec(live.MainTrack)?live.MainTrack:null;
 const chain=master&&rec(master.DeviceChain)?master.DeviceChain:null;
 const mixer=chain&&rec(chain.Mixer)?manualTempo(chain.Mixer.Tempo):null;if(mixer)return mixer;
 const sequencer=chain&&rec(chain.MainSequencer)?manualTempo(chain.MainSequencer.Tempo):null;if(sequencer)return sequencer;
 let out:number|null=null;walk(live,(key,value)=>{if(out!==null||key!=='Tempo')return;const n=manualTempo(value);if(n)out=n;});return out;
}
function arrangementLocators(live:Rec):AbletonLocator[]{
 const out:AbletonLocator[]=[];const seen=new Set<Rec>();
 walk(live,(key,value)=>{if(key!=='Locator')return;for(const raw of list(value)){if(!rec(raw)||seen.has(raw))continue;seen.add(raw);const name=firstText(raw,['Name'])??'Locator';const time=firstNumber(raw,['Time'])??0;out.push({name,timeBeats:time});}});
 return out.sort((a,b)=>a.timeBeats-b.timeBeats).slice(0,200);
}
function version(parsed:Rec):string|null{
 const ableton=rec(parsed.Ableton)?parsed.Ableton:null;if(!ableton)return null;return firstText(ableton,['@_Creator','@_MinorVersion','@_MajorVersion','Creator','MinorVersion']);
}
function masterDevices(live:Rec):AbletonDevice[]{const master=rec(live.MasterTrack)?live.MasterTrack:rec(live.MainTrack)?live.MainTrack:null;return master?collectDeviceContainers(master).map(({type,node})=>deviceFrom(type,node)):[];}
function routeCycles(tracks:AbletonTrack[]):AbletonIssue[]{
 const names=new Map(tracks.map(t=>[t.name.trim().toLowerCase(),t.name]));const edges=new Map<string,string>();
 for(const track of tracks){const route=track.routing.find(r=>/OutputRouting/i.test(r.kind));if(!route)continue;const lower=route.target.toLowerCase();const dest=[...names.keys()].find(name=>lower===name||lower.includes(`/${name}`)||lower.includes(` ${name}`)||lower.endsWith(name));if(dest)edges.set(track.name.toLowerCase(),dest);}
 const issues:AbletonIssue[]=[];const emitted=new Set<string>();
 for(const start of edges.keys()){const path:string[]=[];const pos=new Map<string,number>();let cur:string|undefined=start;while(cur&&edges.has(cur)){if(pos.has(cur)){const cycle=path.slice(pos.get(cur)).concat(cur);const sig=[...new Set(cycle)].sort().join('|');if(!emitted.has(sig)){emitted.add(sig);issues.push({kind:'routing_loop',severity:'warning',detail:`Routing cycle: ${cycle.map(n=>names.get(n)??n).join(' → ')}`});}break;}pos.set(cur,path.length);path.push(cur);cur=edges.get(cur);}}
 return issues;
}
function checks(tracks:AbletonTrack[],samples:AbletonSample[],sidechains:AbletonSidechain[]){
 const missingPlugins:AbletonIssue[]=[],missingSamples:AbletonIssue[]=[],duplicatedProcessing:AbletonIssue[]=[],gainStagingWarnings:AbletonIssue[]=[],cpuHeavyDevices:AbletonIssue[]=[],frozenTracks:AbletonIssue[]=[],inactiveDevices:AbletonIssue[]=[];
 for(const sample of samples)if(sample.missing)missingSamples.push({kind:'missing_sample',severity:'warning',detail:`ALS explicitly marks sample unavailable: ${sample.path??sample.name}`});
 for(const track of tracks){if(track.frozen)frozenTracks.push({kind:'frozen_track',severity:'info',track:track.name,detail:'Track contains freeze/frozen state metadata.'});const counts=new Map<string,number>();for(const device of track.devices){const key=device.name.trim().toLowerCase();counts.set(key,(counts.get(key)??0)+1);if(device.cpuHeavy)cpuHeavyDevices.push({kind:'cpu_heavy_device',severity:'info',track:track.name,device:device.name,detail:'Device matches a CPU-intensive heuristic; verify actual load in Ableton.',heuristic:true});if(device.active===false)inactiveDevices.push({kind:'inactive_device',severity:'info',track:track.name,device:device.name,detail:'Device is stored as inactive/off.'});}
  for(const [device,count]of counts)if(count>1)duplicatedProcessing.push({kind:'duplicated_processing',severity:'info',track:track.name,device,detail:`Same device name appears ${count} times on this track; verify whether duplication is intentional.`,heuristic:true});
  if(track.volume!==null&&(track.volume>1.2||track.volume<0))gainStagingWarnings.push({kind:'gain_staging',severity:'info',track:track.name,detail:`Stored mixer volume ${track.volume} is outside the conservative heuristic range; verify gain staging in Live.`,heuristic:true});
 }
 // Explicit plugin-missing flags are checked separately from generic device inactive state.
 // Most ALS files cannot prove whether a third-party plugin is installed on this computer.
 for(const track of tracks){for(const device of track.devices){if(device.plugin&&/missing|unavailable/i.test(device.name))missingPlugins.push({kind:'missing_plugin',severity:'warning',track:track.name,device:device.name,detail:'Plugin name contains an unavailable/missing marker in the ALS metadata.'});}}
 return {missingPlugins,missingSamples,duplicatedProcessing,routingLoops:routeCycles(tracks),sidechainTopology:sidechains,gainStagingWarnings,cpuHeavyDevices,frozenTracks,inactiveDevices};
}

export function parseAbletonXML(xml:string):AbletonReport{
 if(new TextEncoder().encode(xml).byteLength>ALS_XML_LIMIT)throw new AbletonAnalysisError(413,'als_too_large',`Распакованный ALS больше ${ALS_XML_LIMIT/MiB} МБ.`);
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new AbletonAnalysisError(400,'invalid_xml','Нужен корректный XML Ableton без DTD/ENTITY.');
 const parsed=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',processEntities:false,parseTagValue:false,parseAttributeValue:false,trimValues:false}).parse(xml) as unknown;
 if(!rec(parsed)||!rec(parsed.Ableton)||!rec(parsed.Ableton.LiveSet))throw new AbletonAnalysisError(400,'invalid_als','В файле отсутствует Ableton LiveSet.');
 const live=parsed.Ableton.LiveSet as Rec,{tracks,sidechains}=extractTracks(live),samples=extractSamples(live),masterChain=masterDevices(live),projectChecks=checks(tracks,samples,sidechains);
 // Scan plugin descriptors for explicit unavailable flags without inventing local installation state.
 walk(live,(key,value)=>{if(!/Plugin(?:Device|Desc|Info)|Vst\d?PluginInfo|AuPluginInfo/i.test(key))return;for(const raw of list(value)){if(!rec(raw)||!explicitUnavailable(raw))continue;const name=nameOf(raw,key);if(!projectChecks.missingPlugins.some(x=>x.device===name))projectChecks.missingPlugins.push({kind:'missing_plugin',severity:'warning',device:name,detail:'ALS explicitly marks this plugin descriptor unavailable.'});}});
 const sceneCount=countKeys(live,new Set(['Scene'])),bpm=tempo(live),sig=timeSignature(live),markers=arrangementLocators(live),groups=tracks.filter(t=>t.type==='group').length,musicalKey=projectKey(live),roleSummary=summarizeRoles(tracks.map(t=>t.role));
 const summary={clips:tracks.reduce((n,t)=>n+t.clipCount,0),devices:tracks.reduce((n,t)=>n+t.deviceCount,0)+masterChain.length,plugins:tracks.reduce((n,t)=>n+t.pluginCount,0)+masterChain.filter(d=>d.plugin).length,automationEnvelopes:tracks.reduce((n,t)=>n+t.automationEnvelopeCount,0),samples:samples.length,issues:0};
 summary.issues=projectChecks.missingPlugins.length+projectChecks.missingSamples.length+projectChecks.duplicatedProcessing.length+projectChecks.routingLoops.length+projectChecks.gainStagingWarnings.length+projectChecks.cpuHeavyDevices.length+projectChecks.inactiveDevices.length;
 const warnings:string[]=[];
 if(projectChecks.missingPlugins.length)warnings.push(`${projectChecks.missingPlugins.length} plugin warning(s) explicitly indicated by ALS metadata.`);
 if(projectChecks.missingSamples.length)warnings.push(`${projectChecks.missingSamples.length} sample reference(s) explicitly marked unavailable.`);
 if(projectChecks.routingLoops.length)warnings.push(`${projectChecks.routingLoops.length} routing cycle(s) detected from resolvable track-output names.`);
 if(bpm===null)warnings.push('BPM не найден в Tempo/Manual.');
 if(!tracks.length)warnings.push('Треки не найдены в поддерживаемых Audio/MIDI/Group/Return контейнерах.');
 const unclassified=tracks.filter(t=>t.role==='unknown/unclassified').length;if(unclassified)warnings.push(`${unclassified} track name(s) did not match a music role and stay unclassified.`);
 return {format:'Ableton Live Set',abletonVersion:version(parsed),bpm,timeSignature:sig,keyRoot:musicalKey.keyRoot,keyScale:musicalKey.keyScale,locators:markers,sceneCount,groups,roleSummary,trackCount:tracks.length,tracks,samples,masterChain,checks:projectChecks,summary,warnings,analysisBoundary:[
  'ALS structure is parsed without modifying the source file.',
  'Missing plugins/samples are only claimed when the ALS metadata explicitly indicates unavailability; local filesystem/plugin installation is not probed.',
  'Duplicated processing, CPU-heavy devices and gain staging are heuristics that require confirmation in Ableton Live.',
  'Routing-loop detection only follows output routes that can be resolved to track names stored in the set.',
  'Track roles come from the track name and type. They are a mix map, not a claim about the audio content.',
  'Locators are arrangement markers stored in beats. They describe the set structure, not a detected musical form.',
 ]};
}

export function parseALSBuffer(buffer:Uint8Array):AbletonReport{
 if(!buffer.length)throw new AbletonAnalysisError(400,'empty_als','ALS файл пуст.');
 if(buffer.byteLength>ALS_COMPRESSED_LIMIT)throw new AbletonAnalysisError(413,'als_too_large',`ALS должен быть не больше ${ALS_COMPRESSED_LIMIT/MiB} МБ.`);
 let raw:Uint8Array;
 try{raw=buffer[0]===0x1f&&buffer[1]===0x8b?gunzipSync(buffer,{maxOutputLength:ALS_XML_LIMIT}):buffer;}catch{throw new AbletonAnalysisError(400,'invalid_als','Повреждённый ALS или превышен безопасный размер распаковки.');}
 if(raw.byteLength>ALS_XML_LIMIT)throw new AbletonAnalysisError(413,'als_too_large',`Распакованный XML больше ${ALS_XML_LIMIT/MiB} МБ.`);
 return parseAbletonXML(new TextDecoder().decode(raw));
}
