export type MusicSection='intro'|'groove'|'build'|'breakdown'|'pre-drop'|'drop'|'bridge'|'outro'|'custom';
export type MusicMode='major'|'minor';
export type AudioMetrics={
 bpm:number|null;tempoConfidence?:number|null;integratedLufs?:number|null;shortTermLufs?:number|null;truePeakDb?:number|null;
 loudnessRange?:number|null;crestFactor?:number|null;spectralCentroid?:number|null;stereoWidth?:number|null;correlation?:number|null;
 onsetDensity?:number|null;bassEnergy?:number|null;keyRoot:string|null;mode:MusicMode|null;keyConfidence?:number|null;
 pitchClassProfile?:number[];
};
export type TrackSection={id:string;label:string;kind:MusicSection;startSeconds:number;endSeconds:number;bars?:number;metrics?:Partial<AudioMetrics>;confidence?:number;method?:string};
export type TonalWindow={startSeconds:number;endSeconds:number;metrics:AudioMetrics;energy:number|null;camelot:string|null};
export type MusicAnalysis={trackId:string;fileName:string;durationSeconds?:number;metrics:AudioMetrics;camelot:string|null;sections:TrackSection[];windows?:TonalWindow[];source:'measured-audio'|'imported-metadata'};
export type ChordTendency={label:string;root:string;mode:MusicMode;score:number};

const CAMELOT_MINOR:Record<string,string>={'G#':'1A','D#':'2A','A#':'3A','F':'4A','C':'5A','G':'6A','D':'7A','A':'8A','E':'9A','B':'10A','F#':'11A','C#':'12A'};
const CAMELOT_MAJOR:Record<string,string>={'B':'1B','F#':'2B','C#':'3B','G#':'4B','D#':'5B','A#':'6B','F':'7B','C':'8B','G':'9B','D':'10B','A':'11B','E':'12B'};
const PITCHES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
export function camelotFor(root:string,mode:MusicMode){return (mode==='minor'?CAMELOT_MINOR:CAMELOT_MAJOR)[root]??null;}
export function camelotNeighbors(code:string):string[]{
 const match=/^(\d{1,2})([AB])$/.exec(code);if(!match)return[];const n=Number(match[1]),side=match[2];if(n<1||n>12)return[];const prev=n===1?12:n-1,next=n===12?1:n+1,other=side==='A'?'B':'A';return [code,`${prev}${side}`,`${next}${side}`,`${n}${other}`];
}
export function buildEnergyScore(metrics:Partial<AudioMetrics>):number|null{
 const values:number[]=[];
 if(Number.isFinite(metrics.integratedLufs))values.push(Math.max(0,Math.min(1,((metrics.integratedLufs??-24)+24)/18)));
 if(Number.isFinite(metrics.onsetDensity))values.push(Math.max(0,Math.min(1,(metrics.onsetDensity??0)/8)));
 if(Number.isFinite(metrics.bassEnergy))values.push(Math.max(0,Math.min(1,metrics.bassEnergy??0)));
 if(Number.isFinite(metrics.spectralCentroid))values.push(Math.max(0,Math.min(1,(metrics.spectralCentroid??0)/6000)));
 if(Number.isFinite(metrics.crestFactor))values.push(1-Math.max(0,Math.min(1,(metrics.crestFactor??12)/24))*.35);
 return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*100):null;
}
export function referenceProfile(analyses:MusicAnalysis[]){
 const bpm=analyses.map(a=>a.metrics.bpm).filter((v):v is number=>Number.isFinite(v)),camelot=analyses.map(a=>a.camelot).filter((v):v is string=>!!v),lufs=analyses.map(a=>a.metrics.integratedLufs).filter((v):v is number=>Number.isFinite(v));
 const sectionBars=analyses.flatMap(a=>a.sections.map(s=>s.bars).filter((v):v is number=>Number.isFinite(v)));
 const counts=new Map<string,number>();for(const key of camelot)counts.set(key,(counts.get(key)??0)+1);
 const commonCamelot=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([key])=>key);
 return {tracks:analyses.length,bpmRange:bpm.length?[Math.min(...bpm),Math.max(...bpm)] as [number,number]:null,bpmMedian:bpm.length?[...bpm].sort((a,b)=>a-b)[Math.floor(bpm.length/2)]:null,camelot:[...new Set(camelot)],commonCamelot,lufsRange:lufs.length?[Math.min(...lufs),Math.max(...lufs)] as [number,number]:null,typicalSectionBars:sectionBars.length?Math.round(sectionBars.reduce((a,b)=>a+b,0)/sectionBars.length):null};
}
export function productionBrief(analysis:MusicAnalysis){
 const energy=buildEnergyScore(analysis.metrics),tempo=Number.isFinite(analysis.metrics.bpm)?`${analysis.metrics.bpm} BPM`:'Measure BPM from audio',key=analysis.metrics.keyRoot&&analysis.metrics.mode?`${analysis.metrics.keyRoot} ${analysis.metrics.mode}${analysis.camelot?` / Camelot ${analysis.camelot}`:''}`:'Measure key from audio';
 return {tempo,key,structure:analysis.sections.map(s=>`${s.label}: ${s.bars??'?'} bars`).join('; ')||'Define arrangement from original composition goals',energy:energy===null?'Measure from audio before setting target':`${energy}/100 measured profile`,mixTarget:Number.isFinite(analysis.metrics.integratedLufs)?`Reference loudness ${analysis.metrics.integratedLufs} LUFS; do not copy source content`:'Set after measured render',doNotCopy:['melodies','vocals','signature samples','exact arrangement']};
}
export function chordTendencies(profile:number[]|undefined,limit=6):ChordTendency[]{
 if(!profile||profile.length!==12||!profile.some(Number.isFinite))return[];const values=profile.map(v=>Number.isFinite(v)&&v>0?v:0),sum=values.reduce((a,b)=>a+b,0);if(sum<=0)return[];const normalized=values.map(v=>v/sum),out:ChordTendency[]=[];
 for(let root=0;root<12;root++)for(const mode of ['major','minor'] as const){const third=(root+(mode==='major'?4:3))%12,fifth=(root+7)%12,triad=normalized[root]*.46+normalized[third]*.30+normalized[fifth]*.24,nonTriad=normalized.reduce((acc,v,i)=>i===root||i===third||i===fifth?acc:acc+v,0),score=Math.max(0,Math.min(1,triad*(1-nonTriad*.25)*3));out.push({label:`${PITCHES[root]} ${mode}`,root:PITCHES[root],mode,score:Math.round(score*1000)/1000});}
 return out.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(12,limit)));
}
export function manualSlices(durationSeconds:number,bpm:number|null,barsPerSlice=16):TrackSection[]{
 if(!Number.isFinite(durationSeconds)||durationSeconds<=0)return[];const sliceSeconds=Number.isFinite(bpm)&&bpm!>0?Math.max(1,barsPerSlice*4*60/bpm!):Math.max(10,Math.min(30,durationSeconds/8));const out:TrackSection[]=[];let i=0;
 for(let start=0;start<durationSeconds-1e-6;start+=sliceSeconds){const end=Math.min(durationSeconds,start+sliceSeconds);out.push({id:`manual-${i+1}`,label:`Part ${i+1}`,kind:'custom',startSeconds:start,endSeconds:end,bars:Number.isFinite(bpm)&&bpm!>0?Math.max(1,Math.round((end-start)*bpm!/240)):undefined,confidence:1,method:'manual-bars'});i++;}
 return out;
}
export function autoStructure(windows:TonalWindow[],durationSeconds:number,bpm:number|null):TrackSection[]{
 if(!windows.length||!Number.isFinite(durationSeconds)||durationSeconds<=0)return[];const measured=windows.map(w=>w.energy).filter((v):v is number=>Number.isFinite(v));if(!measured.length)return manualSlices(durationSeconds,bpm,16).map((s,i,a)=>({...s,kind:i===0?'intro':i===a.length-1?'outro':'custom',label:i===0?'Intro':i===a.length-1?'Outro':s.label,method:'timed-fallback',confidence:.35}));
 const sorted=[...measured].sort((a,b)=>a-b),low=sorted[Math.floor((sorted.length-1)*.3)],high=sorted[Math.floor((sorted.length-1)*.72)];const raw=windows.map((w,i)=>{const prev=i?w.energy: null,next=i+1<windows.length?windows[i+1].energy:null;let kind:MusicSection='groove';if(i===0)kind='intro';else if(i===windows.length-1)kind='outro';else if(w.energy!==null&&w.energy>=high)kind='drop';else if(w.energy!==null&&w.energy<=low)kind='breakdown';else if(w.energy!==null&&prev!==null&&next!==null&&next-w.energy>=9&&w.energy-prev>=-3)kind='build';else if(w.energy!==null&&prev!==null&&w.energy-prev>=12)kind='pre-drop';else if(i>windows.length*.62)kind='bridge';const labels:Record<MusicSection,string>={intro:'Intro',groove:'Groove',build:'Build',breakdown:'Breakdown', 'pre-drop':'Pre-drop',drop:'Drop',bridge:'Bridge',outro:'Outro',custom:'Part'};return {id:`auto-${i+1}`,label:labels[kind],kind,startSeconds:w.startSeconds,endSeconds:w.endSeconds,bars:Number.isFinite(bpm)&&bpm!>0?Math.max(1,Math.round((w.endSeconds-w.startSeconds)*bpm!/240)):undefined,metrics:w.metrics,confidence:.58,method:'measured-window-energy-heuristic'} as TrackSection;});
 const merged:TrackSection[]=[];for(const part of raw){const last=merged[merged.length-1];if(last&&last.kind===part.kind&&Math.abs(last.endSeconds-part.startSeconds)<.05){last.endSeconds=part.endSeconds;last.bars=(last.bars??0)+(part.bars??0);last.confidence=Math.min(last.confidence??.58,part.confidence??.58);}else merged.push({...part,id:`segment-${merged.length+1}`});}return merged;
}
export function musicLearningCoach(previous:MusicAnalysis,next:MusicAnalysis){
 const deltas:{metric:string;before:number|null;after:number|null;delta:number|null;unit:string}[]=[];const push=(metric:string,a:number|null|undefined,b:number|null|undefined,unit:string)=>{deltas.push({metric,before:Number.isFinite(a)?a!:null,after:Number.isFinite(b)?b!:null,delta:Number.isFinite(a)&&Number.isFinite(b)?b!-a!:null,unit});};
 push('LUFS',previous.metrics.integratedLufs,next.metrics.integratedLufs,'LU');push('True peak',previous.metrics.truePeakDb,next.metrics.truePeakDb,'dB');push('Stereo width',previous.metrics.stereoWidth,next.metrics.stereoWidth,'%');push('Crest factor',previous.metrics.crestFactor,next.metrics.crestFactor,'dB');push('Spectral centroid',previous.metrics.spectralCentroid,next.metrics.spectralCentroid,'Hz');
 const recommendations:string[]=[];if(Number.isFinite(next.metrics.truePeakDb)&&next.metrics.truePeakDb!>-1)recommendations.push('Оставить больше true-peak headroom перед финальным master.');if(Number.isFinite(next.metrics.integratedLufs)&&next.metrics.integratedLufs!>-6)recommendations.push('Проверить динамику: loudness очень высокий для диагностического reference-профиля.');if(Number.isFinite(next.metrics.correlation)&&next.metrics.correlation!<0)recommendations.push('Проверить mono compatibility: корреляция уходит ниже нуля.');if(previous.sections.length&&next.sections.length&&next.sections.some(s=>s.kind==='breakdown'&&(s.bars??0)>32))recommendations.push('Проверить длину breakdown: сегмент превышает 32 bars.');if(!recommendations.length)recommendations.push('Существенных инженерных красных флагов по доступным измерениям не обнаружено; проверьте музыкальное решение на слух и в контексте arrangement.');
 return {from:previous.fileName,to:next.fileName,deltas,recommendations:recommendations.slice(0,3),note:'Coach использует только измеренные метрики и структурные эвристики; он не присваивает субъективную оценку художественного качества.'};
}
export type CompositionPlan={
 sourceTrack:string;tempo:number|null;key:string|null;camelot:string|null;chordProgression:string[];arrangement:Array<{section:string;bars:number|null;energy:number|null}>;
 parts:{bass:string[];arp:string[];lead:string[];pads:string[];drums:string[];fx:string[];transitions:string[];automation:string[]};originalityGuard:string[];method:string;
};
export function buildCompositionPlan(analysis:MusicAnalysis):CompositionPlan{
 const mode=analysis.metrics.mode??'minor',progression=mode==='minor'?['i','VI','III','VII']:['I','V','vi','IV'];
 const energy=buildEnergyScore(analysis.metrics),sections=analysis.sections.length?analysis.sections:[{id:'plan-1',label:'Intro',kind:'intro' as const,startSeconds:0,endSeconds:0,bars:16},{id:'plan-2',label:'Groove',kind:'groove' as const,startSeconds:0,endSeconds:0,bars:32},{id:'plan-3',label:'Breakdown',kind:'breakdown' as const,startSeconds:0,endSeconds:0,bars:16},{id:'plan-4',label:'Drop',kind:'drop' as const,startSeconds:0,endSeconds:0,bars:32},{id:'plan-5',label:'Outro',kind:'outro' as const,startSeconds:0,endSeconds:0,bars:16}];
 return {sourceTrack:analysis.fileName,tempo:analysis.metrics.bpm,key:analysis.metrics.keyRoot&&analysis.metrics.mode?`${analysis.metrics.keyRoot} ${analysis.metrics.mode}`:null,camelot:analysis.camelot,chordProgression:progression,arrangement:sections.map(section=>({section:section.label,bars:Number.isFinite(section.bars)?section.bars!:null,energy:section.metrics?buildEnergyScore(section.metrics):energy})),parts:{bass:['Root-focused original MIDI pattern','Vary octave/rhythm by section energy'],arp:['Use scale degrees from the new progression','Change register and gate across sections'],lead:['Create a new motif; do not reproduce reference melody'],pads:['Voice the plan progression with independent inversions'],drums:['Four-on-the-floor foundation where genre-appropriate','Vary percussion density with measured energy curve'],fx:['Independent risers/noise/impacts around structural transitions'],transitions:['Create transitions at section boundaries, not copied from source'],automation:['Filter/level movement follows section energy','Keep automation values original to the new project']},originalityGuard:['Do not copy melodies','Do not copy vocals','Do not reuse signature samples','Do not reproduce exact reference arrangement'],method:'feature-abstraction-to-original-composition-plan'};
}
export type RenderIterationTarget={bpm?:number|null;keyRoot?:string|null;mode?:MusicMode|null;targetLufs?:number|null};
export type RenderIterationReview={passed:boolean;checks:Array<{code:string;status:'pass'|'review';measured:string;target:string;action?:string}>;nextActions:string[];method:string};
export function reviewRenderIteration(analysis:MusicAnalysis,target:RenderIterationTarget={}):RenderIterationReview{
 const checks:RenderIterationReview['checks']=[],actions:string[]=[];const push=(code:string,ok:boolean,measured:string,targetText:string,action?:string)=>{checks.push({code,status:ok?'pass':'review',measured,target:targetText,...(!ok&&action?{action}:{})});if(!ok&&action)actions.push(action)};
 const bpm=analysis.metrics.bpm;if(Number.isFinite(target.bpm)&&Number.isFinite(bpm))push('tempo',Math.abs(bpm!-target.bpm!)<=1,`${bpm!.toFixed(1)} BPM`,`${target.bpm!.toFixed(1)} BPM`,'Re-check transient grid or rerender with the target tempo.');
 if(target.keyRoot&&target.mode&&analysis.metrics.keyRoot&&analysis.metrics.mode)push('key',analysis.metrics.keyRoot===target.keyRoot&&analysis.metrics.mode===target.mode,`${analysis.metrics.keyRoot} ${analysis.metrics.mode}`,`${target.keyRoot} ${target.mode}`,'Review tonal center before the next render; do not force a key label when confidence is low.');
 const peak=analysis.metrics.truePeakDb;if(Number.isFinite(peak))push('true_peak',peak!<=-1,`${peak!.toFixed(2)} dBTP`,'≤ -1.00 dBTP','Lower render/master gain before the next iteration.');
 const lufs=analysis.metrics.integratedLufs;if(Number.isFinite(target.targetLufs)&&Number.isFinite(lufs))push('loudness',Math.abs(lufs!-target.targetLufs!)<=1.5,`${lufs!.toFixed(1)} LUFS`,`${target.targetLufs!.toFixed(1)} LUFS ±1.5`,'Adjust gain/dynamics toward the explicit project target, not toward a reference by copying its master.');
 const corr=analysis.metrics.correlation;if(Number.isFinite(corr))push('mono_compatibility',corr!>=0,`${corr!.toFixed(2)} correlation`,'≥ 0','Reduce phase-opposed stereo processing and verify in mono.');
 const width=analysis.metrics.stereoWidth;if(Number.isFinite(width))push('stereo_width',width!<=100,`${width!.toFixed(1)}%`,'≤ 100% diagnostic range','Review extreme stereo width before the next render.');
 if(!checks.length)actions.push('Analyze a real rendered audio file before evaluating the iteration.');if(!actions.length)actions.push('No measured engineering blocker found; continue with listening review and the next creative iteration.');
 return {passed:checks.length>0&&checks.every(c=>c.status==='pass'),checks,nextActions:[...new Set(actions)].slice(0,6),method:'measured-render-review'};
}
export interface DAWImportAdapter {readonly id:string;supports(name:string):boolean;describe():{structured:boolean;formats:string[]};}
export interface StemSeparatorAdapter {readonly id:string;separate(input:ArrayBuffer,signal?:AbortSignal):Promise<Record<string,ArrayBuffer>>;}
