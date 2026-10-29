import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {mountVoiceInput} from '../ui/components/voice-input';

describe('voice input mic button',()=>{
 let windowRef:Window;
 beforeEach(()=>{
  windowRef=new Window({url:'https://azrail-pulse.mnmllpulse.workers.dev/'});
  // happy-dom Window is the realm for createElement / Media APIs under test.
  vi.stubGlobal('window',windowRef as unknown as Window&typeof globalThis);
  vi.stubGlobal('document',windowRef.document);
  vi.stubGlobal('HTMLElement',windowRef.HTMLElement);
  vi.stubGlobal('HTMLButtonElement',windowRef.HTMLButtonElement);
  vi.stubGlobal('HTMLTextAreaElement',windowRef.HTMLTextAreaElement);
  vi.stubGlobal('MediaRecorder',undefined);
 });
 afterEach(()=>{vi.unstubAllGlobals();windowRef.close();});

 it('keeps the microphone SVG and reports a clear error when MediaRecorder is missing',async()=>{
  const button=windowRef.document.createElement('button');
  button.id='voice';
  button.innerHTML='<svg data-mic="1"></svg>';
  const prompt=windowRef.document.createElement('textarea');
  const form=windowRef.document.createElement('form');form.id='composer';form.append(button,prompt);windowRef.document.body.append(form);
  const failure=vi.fn();
  const voice=mountVoiceInput({
   button:button as unknown as HTMLButtonElement,
   prompt:prompt as unknown as HTMLTextAreaElement,
   api:vi.fn(),
   canUse:()=>true,
   notice:vi.fn(),
   failure,
  });
  expect(button.querySelector('[data-mic]')).toBeTruthy();
  button.click();
  await Promise.resolve();
  expect(failure).toHaveBeenCalled();
  expect(String(failure.mock.calls[0]?.[0]?.message||failure.mock.calls[0]?.[0])).toMatch(/микрофон|запись|браузер/i);
  expect(button.querySelector('[data-mic]')).toBeTruthy();
  voice.destroy();
 });
});
