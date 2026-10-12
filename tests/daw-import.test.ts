import {describe,expect,it} from 'vitest';
import {strToU8,zipSync} from 'fflate';
import {parseDAWImport,pluginCompatibilityReport} from '../src/lib/daw-import';

const projectXml=`<?xml version="1.0" encoding="UTF-8"?>
<Project version="1.0"><Application name="Test DAW" version="1.2"/><Transport><Tempo value="125"/><TimeSignature numerator="4" denominator="4"/></Transport><Structure><Track id="t1" name="Synth" contentType="notes"><Channel id="c1" name="Synth Channel"><Devices><Vst3Plugin id="p1" name="Example Synth"/></Devices></Channel><Clips><Clip id="clip1"><Notes><Note id="n1"/></Notes><Points><RealPoint value="0.5"/></Points></Clip></Clips></Track></Structure></Project>`;
const metadataXml=`<?xml version="1.0" encoding="UTF-8"?><MetaData><Title>Project Alpha</Title></MetaData>`;

describe('DAW Project Import Gateway',()=>{
 it('parses a bounded DAWproject ZIP without executing plugin state',()=>{const bytes=zipSync({'project.xml':strToU8(projectXml),'metadata.xml':strToU8(metadataXml),'audio/kick.wav':new Uint8Array([1,2,3])});const report=parseDAWImport(bytes,'alpha.dawproject');expect(report.format).toBe('dawproject');expect(report.application.name).toBe('Test DAW');expect(report.title).toBe('Project Alpha');expect(report.bpm).toBe(125);expect(report.timeSignature).toBe('4/4');expect(report.trackCount).toBe(1);expect(report.summary.notes).toBe(1);expect(report.summary.plugins).toBe(1);expect(report.summary.audioFiles).toBe(1);expect(report.analysisBoundary.join(' ')).toContain('without executing');});
 it('does not invent local plugin availability',()=>{const bytes=zipSync({'project.xml':strToU8(projectXml),'metadata.xml':strToU8(metadataXml)}),report=parseDAWImport(bytes,'alpha.dawproject'),compat=pluginCompatibilityReport(report);expect(compat.items[0].status).toBe('local-status-unknown');expect(compat.items[0].actions).toEqual(['keep-placeholder','use-audio-bounce','replace-device']);});
 it('accepts explicit trusted installed inventory without claiming it probed the host',()=>{const bytes=zipSync({'project.xml':strToU8(projectXml),'metadata.xml':strToU8(metadataXml)}),report=parseDAWImport(bytes,'alpha.dawproject'),compat=pluginCompatibilityReport(report,['Example Synth']);expect(compat.items[0].status).toBe('declared-installed');expect(compat.items[0].reason).toContain('explicitly supplied');});
 it('rejects unsafe ZIP paths',()=>{const bytes=zipSync({'project.xml':strToU8(projectXml),'../evil.wav':new Uint8Array([1])});expect(()=>parseDAWImport(bytes,'unsafe.dawproject')).toThrow(/небезопасный путь/);});
});
