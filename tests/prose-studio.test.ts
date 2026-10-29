import {describe,expect,it} from 'vitest';
import {composeProse,proseHandoff,proseLongLines,readProseHandoff,shapeProseRequest} from '../ui/prose-studio';
import {parseProseRequest,proseVariantsFromModel,PROSE_MODEL} from '../src/lib/prose-studio';
import {isNeuronPaidModel} from '../src/lib/neuron-paid';
import {missionFailureLine,visibleMissionText} from '../src/lib/mission-copy';

const lyric='[Intro]\n(Низкий бас)\nЗвук стирает гравитацию.\n\n[Drop]\nЭкстази в темноте!\nЛови этот свет.';

describe('Prose Studio',()=>{
 it('keeps a finished text and builds three directions without adding darkness',()=>{
  expect(()=>composeProse('   ','keep')).toThrow(/Напиши/);
  expect(()=>composeProse('я'.repeat(8001),'keep')).toThrow(/8000/);
  const shaped=shapeProseRequest('очень ночь над городом','stricter');
  expect(shaped).toBe('ночь над городом');
  const kept=composeProse(lyric,'keep','darker');
  expect(kept).toHaveLength(1);
  expect(kept[0]?.text).toContain('[Intro]');
  expect(kept[0]?.text).toContain('(Низкий бас)');
  expect(kept[0]?.text).toContain('Экстази в темноте!');
  const directions=composeProse(lyric,'directions','plain');
  expect(directions.map(item=>item.title)).toEqual(['Мягче','Мрачнее','Короче на дропе']);
  expect(directions[0]?.text).not.toContain('!');
  expect(directions[1]?.text).not.toMatch(/мрачн|тёмн|темнот[аы]/i);
  expect(directions[2]?.sections.find(section=>section.name==='Drop')?.line).not.toContain('Лови');
  const phrase=composeProse('Ночной город, один огонь в окне.','directions','plain');
  expect(phrase[0]?.text).toContain('[Текст]');
  expect(phrase[0]?.text).not.toContain('[Шапка]');
  const short=composeProse('Ночной город, один огонь в окне.','short','plain');
  expect(short.map(item=>item.title)).toEqual(['Короче','Прямее','Название']);
  const handoff=proseHandoff(kept[0]!);
  expect(handoff.version).toBe(1);
  expect(handoff.title).toBe('Как есть');
  expect(handoff.sections.map(section=>section.name)).toEqual(['Intro','Drop']);
  expect(readProseHandoff(null)).toBeNull();
  expect(readProseHandoff('{')).toBeNull();
  expect(readProseHandoff(JSON.stringify(handoff))?.text).toContain('[Drop]');
  expect(proseLongLines('Это очень длинная строка с множеством гласных для проверки ритма чтения вслух').length).toBe(1);
 });
 it('accepts a long prose request and explains a file edit that never started',()=>{
  expect(parseProseRequest({prompt:'ночь',mode:'keep',tone:'plain'}).mode).toBe('keep');
  expect(parseProseRequest({prompt:'я'.repeat(1800),mode:'directions'}).prompt.length).toBe(1800);
  expect(()=>parseProseRequest({prompt:'',mode:'short'})).toThrow(/1–8000/);
  expect(()=>parseProseRequest({prompt:'ночь',mode:'track'})).toThrow(/режим/);
  expect(isNeuronPaidModel(PROSE_MODEL)).toBe(false);
  const variants=proseVariantsFromModel('```json\n'+JSON.stringify({variants:[{title:'А',text:'раз'},{title:'Б',text:'два',sections:[{name:'Дроп',line:'огонь'}]},{title:'В',text:'три'}]})+'\n```');
  expect(variants).toHaveLength(3);
  expect(variants[1]?.sections[0]?.line).toBe('огонь');
  expect(missionFailureLine('Результат шага неопределён; повтор остановлен: search обязателен.')).toContain('не был указан фрагмент');
  expect(visibleMissionText('Миссия прервалась из-за внутренней ошибки.','search обязателен.')).toContain('Файл не изменён');
 });
});
