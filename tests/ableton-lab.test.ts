import {describe,it,expect} from 'vitest';
import {parseAbletonXML,ALS_XML_LIMIT} from '../src/lib/ableton-lab';

const fixture=`<?xml version="1.0" encoding="UTF-8"?>
<Ableton Creator="Ableton Live 12.1" MajorVersion="5" MinorVersion="12.1_12049">
 <LiveSet>
  <TimeSignature><Numerator Value="4"/><Denominator Value="4"/></TimeSignature>
  <Scenes><Scene Id="1"/><Scene Id="2"/></Scenes>
  <MasterTrack Id="0"><DeviceChain><Mixer><Tempo><Manual Value="128"/></Tempo></Mixer><Devices><LimiterDevice Id="1"><Name Value="Limiter"/></LimiterDevice></Devices></DeviceChain></MasterTrack>
  <Tracks>
   <AudioTrack Id="10"><Name><EffectiveName Value="Kick"/></Name><TrackGroupId Value="30"/><DeviceChain><Mixer><Volume><Manual Value="1.3"/></Volume><Pan><Manual Value="0"/></Pan></Mixer><AudioOutputRouting><UpperDisplayString Value="Bass"/></AudioOutputRouting><MainSequencer><ClipTimeable><ArrangerAutomation><Events><AudioClip Id="1"><SampleRef><FileRef><Name Value="kick.wav"/><RelativePath Value="Samples/kick.wav"/><IsMissing Value="true"/></FileRef></SampleRef></AudioClip></Events></ArrangerAutomation></ClipTimeable></MainSequencer><Devices><Compressor2 Id="2"><Name Value="Compressor"/><SideChain><On Value="true"/><AudioFrom Value="Bass"/></SideChain></Compressor2><Compressor2 Id="3"><Name Value="Compressor"/></Compressor2><MaxForLiveDevice Id="4"><Name Value="Spectral Max"/></MaxForLiveDevice></Devices><AutomationEnvelopes><AutomationEnvelope Id="1"/></AutomationEnvelopes></DeviceChain></AudioTrack>
   <MidiTrack Id="20"><Name><EffectiveName Value="Bass"/></Name><Freeze Value="true"/><DeviceChain><Mixer><Volume><Manual Value="0.8"/></Volume></Mixer><AudioOutputRouting><UpperDisplayString Value="Kick"/></AudioOutputRouting><MainSequencer><ClipTimeable><ArrangerAutomation><Events><MidiClip Id="2"/></Events></ArrangerAutomation></ClipTimeable></MainSequencer><Devices><PluginDevice Id="5"><Name Value="Serum"/><IsPluginUnavailable Value="true"/></PluginDevice><AutoFilter Id="6"><Name Value="Auto Filter"/><On><Manual Value="false"/></On></AutoFilter></Devices></DeviceChain></MidiTrack>
   <GroupTrack Id="30"><Name><EffectiveName Value="DRUMS"/></Name><DeviceChain><Devices><GlueCompressor Id="7"><Name Value="Glue"/></GlueCompressor></Devices></DeviceChain></GroupTrack>
  </Tracks>
 </LiveSet>
</Ableton>`;

describe('Professional Ableton Lab parser',()=>{
 it('extracts project structure, devices, samples, routing and master chain',()=>{const r=parseAbletonXML(fixture);expect(r.abletonVersion).toContain('Ableton Live 12.1');expect(r.bpm).toBe(128);expect(r.timeSignature).toBe('4/4');expect(r.sceneCount).toBe(2);expect(r.trackCount).toBe(3);expect(r.groups).toBe(1);expect(r.summary.clips).toBe(2);expect(r.summary.devices).toBeGreaterThanOrEqual(7);expect(r.summary.plugins).toBeGreaterThanOrEqual(1);expect(r.summary.automationEnvelopes).toBe(1);expect(r.samples[0]).toMatchObject({name:'kick.wav',missing:true});expect(r.masterChain[0]?.name).toBe('Limiter');});
 it('reports explicit missing assets and bounded heuristics without pretending to inspect the local machine',()=>{const r=parseAbletonXML(fixture);expect(r.checks.missingPlugins.some(x=>x.device==='Serum')).toBe(true);expect(r.checks.missingSamples).toHaveLength(1);expect(r.checks.duplicatedProcessing.some(x=>x.track==='Kick')).toBe(true);expect(r.checks.routingLoops).toHaveLength(1);expect(r.checks.sidechainTopology.some(x=>x.track==='Kick')).toBe(true);expect(r.checks.gainStagingWarnings.some(x=>x.track==='Kick')).toBe(true);expect(r.checks.cpuHeavyDevices.some(x=>x.device==='Spectral Max')).toBe(true);expect(r.checks.frozenTracks.some(x=>x.track==='Bass')).toBe(true);expect(r.checks.inactiveDevices.some(x=>x.device==='Auto Filter')).toBe(true);expect(r.analysisBoundary.join(' ')).toContain('local filesystem/plugin installation is not probed');});
 it('rejects entity expansion and non-Ableton XML',()=>{expect(()=>parseAbletonXML('<!DOCTYPE x [<!ENTITY x "boom">]><Ableton><LiveSet/></Ableton>')).toThrow();expect(()=>parseAbletonXML('<root/>')).toThrow();});
 it('enforces a decompressed XML size budget',()=>{const huge='<Ableton><LiveSet>'+(' '.repeat(ALS_XML_LIMIT+1))+'</LiveSet></Ableton>';expect(()=>parseAbletonXML(huge)).toThrow();});
 it('reads nested time signature, packed Live signature, key, locators and music roles',()=>{
  const nested=`<?xml version="1.0" encoding="UTF-8"?><Ableton Creator="Ableton Live 12"><LiveSet><ScaleInformation><RootNote Value="9"/><Name Value="Minor"/></ScaleInformation><TimeSignature><TimeSignatures><RemoteableTimeSignature><Numerator Value="3"/><Denominator Value="4"/></RemoteableTimeSignature></TimeSignatures></TimeSignature><Locators><Locator Id="1"><Name Value="Drop"/><Time Value="64"/></Locator><Locator Id="0"><Name Value="Intro"/><Time Value="0"/></Locator></Locators><Tracks><MidiTrack Id="1"><Name><EffectiveName Value="Pluck"/></Name><ColorIndex Value="5"/><DeviceChain><MainSequencer><ClipTimeable><ArrangerAutomation><Events><MidiClip Id="2" Time="4"><CurrentStart Value="4"/><CurrentEnd Value="12"/><Name Value="Theme"/></MidiClip></Events></ArrangerAutomation></ClipTimeable></MainSequencer></DeviceChain></MidiTrack><AudioTrack Id="2"><Name><EffectiveName Value="Kick"/></Name></AudioTrack></Tracks></LiveSet></Ableton>`;
  const packed=`<?xml version="1.0" encoding="UTF-8"?><Ableton><LiveSet><MasterTrack><DeviceChain><MainSequencer><Tempo><Manual Value="126"/></Tempo></MainSequencer></DeviceChain></MasterTrack><KeyScale><RootNote Value="0"/><Scale Value="7"/></KeyScale><TimeSignature><TimeSignatures><AutomationEvent Value="201326592"/></TimeSignatures></TimeSignature><Tracks></Tracks></LiveSet></Ableton>`;
  const threeFour=(3<<16)|2;
  const encoded=`<?xml version="1.0" encoding="UTF-8"?><Ableton><LiveSet><TimeSignature><TimeSignatures><AutomationEvent Value="${threeFour}"/></TimeSignatures></TimeSignature><Tracks></Tracks></LiveSet></Ableton>`;
  const r=parseAbletonXML(nested);
  expect(r.timeSignature).toBe('3/4');expect(r.keyRoot).toBe('A');expect(r.keyScale).toBe('Minor');
  expect(r.locators).toEqual([{name:'Intro',timeBeats:0},{name:'Drop',timeBeats:64}]);
  expect(r.tracks.find(t=>t.name==='Pluck')).toMatchObject({role:'melodic/pluck',colorGroup:'yellow'});
  expect(r.tracks.find(t=>t.name==='Kick')?.role).toBe('rhythm/kick');
  expect(r.tracks.find(t=>t.name==='Pluck')?.clips[0]).toMatchObject({name:'Theme',startBeats:4,lengthBeats:8});
  expect(r.roleSummary.melodic).toBe(1);expect(r.roleSummary.rhythm).toBe(1);
  const packedReport=parseAbletonXML(packed);
  expect(packedReport.timeSignature).toBe('4/4');
  expect(packedReport.bpm).toBe(126);
  expect(packedReport.keyRoot).toBe('C');
  expect(packedReport.keyScale).toBe('Whole Tone');
  expect(parseAbletonXML(encoded).timeSignature).toBe('3/4');
 });
});
